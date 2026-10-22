/**
 * Game Boy Printer device host.
 *
 * Runs the serial-level printer model on a dedicated worker so that the
 * emulator core can clock it from its own thread without blocking the page.
 * Commands arrive through a shared control block; printer events and the
 * current device state are posted back to the page.
 *
 * MIT License. See LICENSE.md.
 */

import { GBPrinterDevice } from './gb-printer.js';

const OP_POWER = 1;
const OP_COVER = 2;
const OP_ROLL = 3;
const OP_REMOVE_ROLL = 4;
const OP_FEED_START = 5;
const OP_FEED_STOP = 6;
const OP_FEED_ROWS = 7;

let device = null;
let channel = null;
let commands = null;
let pumping = false;
let lastCommand = 0;
let lastClock = 0;

const idle = new Int32Array(new SharedArrayBuffer(4));

function snapshot() {
  return {
    powered: device.powered,
    coverClosed: device.coverClosed,
    rollRows: device.rollRows,
    rollCapacity: device.rollCapacity,
    lowPaperRows: device.lowPaperRows,
    paperPercent: device.paperPercent,
    jobProgress: device.jobProgress,
    jobRowsLeft: device.jobRowsLeft,
    printJob: Boolean(device.printJob),
    feeding: Boolean(device.feeding),
  };
}

function publish(event) {
  self.postMessage({ type: 'event', event, state: snapshot() });
}

function applyCommand(opcode, argument) {
  switch (opcode) {
    case OP_POWER:
      device.setPower(Boolean(argument));
      break;
    case OP_COVER:
      device.setCover(Boolean(argument));
      break;
    case OP_ROLL:
      device.replaceRoll(argument);
      break;
    case OP_REMOVE_ROLL:
      device.removeRoll();
      break;
    case OP_FEED_START:
      device.startFeed();
      break;
    case OP_FEED_STOP:
      device.stopFeed();
      break;
    case OP_FEED_ROWS:
      device.feedRows(argument);
      break;
    default:
      break;
  }
}

function wait(target, index, expected, timeout) {
  Atomics.wait(target, index, expected, timeout);
}

function pump() {
  for (;;) {
    const sequence = Atomics.load(commands, 0);
    if (sequence !== lastCommand) {
      lastCommand = sequence;
      applyCommand(Atomics.load(commands, 1), Atomics.load(commands, 2));
      Atomics.store(commands, 3, sequence);
    }

    if (channel) {
      const request = Atomics.load(channel, 0);
      if (request !== lastClock) {
        lastClock = request;
        const sout = device.clock(Atomics.load(channel, 1));
        Atomics.store(channel, 3, sout & 1);
        Atomics.store(channel, 2, request);
        Atomics.notify(channel, 2);
      }
    }

    const wasFeeding = device.feeding;
    device.update(performance.now());
    if (device.feeding !== wasFeeding) {
      self.postMessage({ type: 'state', state: snapshot() });
    }

    if (channel) {
      wait(channel, 0, Atomics.load(channel, 0), 4);
    } else {
      wait(idle, 0, 0, 4);
    }
  }
}

function start() {
  if (pumping || !device || !commands || !channel) return;
  pumping = true;
  self.postMessage({ type: 'ready', state: snapshot() });
  pump();
}

self.onmessage = (message) => {
  const data = message.data || {};
  if (data.type === 'init') {
    device = new GBPrinterDevice({
      onEvent: publish,
      printSpeed: data.printSpeed,
      feedSpeed: data.feedSpeed,
      rollRows: data.rollRows,
    });
    device.powered = data.powered !== false;
    commands = new Int32Array(data.commandBuffer);
    start();
    return;
  }
  if (data.type === 'channel') {
    channel = new Int32Array(data.buffer, data.offset, 4);
    start();
  }
};
