import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CMD,
  GBPrinterDevice,
  KEEPALIVE,
  STATUS,
  decodeDotRow,
  decompressRle,
} from '../src/printer/gb-printer.js';
import { ByteLinkAdapter } from '../src/linkport/byte-link.js';

function makePacket(cmd, payload = new Uint8Array(), compression = 0) {
  const bytes = [0x88, 0x33, cmd, compression, payload.length & 0xff, payload.length >> 8, ...payload];
  let sum = 0;
  for (let i = 2; i < bytes.length; i++) sum = (sum + bytes[i]) & 0xffff;
  bytes.push(sum & 0xff, sum >> 8, 0, 0);
  return Uint8Array.from(bytes);
}

function transfer(device, bytes) {
  const out = [];
  for (const byte of bytes) {
    let received = 0;
    for (let bit = 7; bit >= 0; bit--) {
      received = (received << 1) | device.clock((byte >> bit) & 1);
    }
    out.push(received);
  }
  return out;
}

function makeDevice(overrides = {}) {
  let now = 0;
  const events = [];
  const device = new GBPrinterDevice({
    now: () => now,
    printSpeed: 10,
    feedSpeed: 5,
    onEvent: (event) => events.push(event),
    ...overrides,
  });
  return {
    device,
    events,
    advance(ms) {
      now += ms;
      device.update(now);
    },
  };
}

test('ByteLinkAdapter drives the same device through byte transfers', () => {
  const { device } = makeDevice();
  const cable = new ByteLinkAdapter(device);
  const replies = Array.from(makePacket(CMD.INQUIRY)).map((byte) => cable.transferByte(byte));
  assert.equal(replies.at(-2), KEEPALIVE);
  assert.equal(replies.at(-1), 0);
});

test('INQUIRY replies with keepalive 0x81 and status 0x00', () => {
  const { device } = makeDevice();
  const replies = transfer(device, makePacket(CMD.INQUIRY));
  assert.equal(replies.at(-2), KEEPALIVE);
  assert.equal(replies.at(-1), 0);
  assert.equal(device.status(), 0);
});

test('DATA, empty DATA, and PRINT produce a paper job with margins', () => {
  const { device, events, advance } = makeDevice();
  const pixels = new Uint8Array(320).fill(0xff); // one tile row, all shade 3

  transfer(device, makePacket(CMD.DATA, pixels));
  assert.equal(device.buffer.length, 320);
  transfer(device, makePacket(CMD.DATA));
  assert.equal(device.armed, true);
  transfer(device, makePacket(CMD.PRINT, Uint8Array.from([1, 0x13, 0xe4, 0x40])));

  assert.ok(device.status() & STATUS.PRINTING);
  advance(10_000);

  assert.equal(device.printJob, null);
  assert.equal(device.status(), 0);
  assert.equal(device.rollRows, 4000 - (8 + 8 + 24));

  const rows = events.filter((event) => event.type === 'row');
  assert.equal(rows.length, 8 + 8 + 24);
  assert.equal(rows.filter((row) => row.kind === 'print').length, 8);
  assert.deepEqual(Array.from(rows.find((row) => row.kind === 'print').shades), new Array(160).fill(3));
  assert.equal(events.filter((event) => event.type === 'print-start').length, 1);
  assert.equal(events.filter((event) => event.type === 'print-done').length, 1);
});

test('PRINT is ignored until an empty DATA packet arms the buffer', () => {
  const { device, events } = makeDevice();
  transfer(device, makePacket(CMD.DATA, new Uint8Array(320).fill(0xff)));
  transfer(device, makePacket(CMD.PRINT, Uint8Array.from([1, 0x00, 0xe4, 0x40])));
  assert.equal(device.printJob, null);
  assert.ok(events.some((event) => event.type === 'ignored-print'));
});

test('printing stops with a paper jam when the roll runs out', () => {
  const { device, events, advance } = makeDevice();
  device.rollRows = 5;
  transfer(device, makePacket(CMD.DATA, new Uint8Array(320).fill(0xff)));
  transfer(device, makePacket(CMD.DATA));
  transfer(device, makePacket(CMD.PRINT, Uint8Array.from([1, 0x00, 0xe4, 0x40])));
  advance(10_000);
  assert.equal(events.filter((event) => event.type === 'row').length, 5);
  assert.ok(events.some((event) => event.type === 'paper-out'));
  assert.ok(device.status() & STATUS.PAPER_JAM);
});

test('a checksum error is reported in the status response', () => {
  const { device } = makeDevice();
  const packet = makePacket(CMD.INQUIRY);
  packet[packet.length - 3] ^= 0xff; // corrupt checksum low byte
  const replies = transfer(device, packet);
  assert.equal(replies.at(-2), KEEPALIVE);
  assert.ok(replies.at(-1) & STATUS.CHECKSUM_ERR);
});

test('decodeDotRow reads both bitplanes for each tile', () => {
  const buffer = new Uint8Array(320);
  buffer[0] = 0b10101010; // plane 0, tile 0, row 0
  buffer[1] = 0b00000000; // plane 1
  buffer[16] = 0b11110000; // tile 1 plane 0
  buffer[17] = 0b00001111; // tile 1 plane 1
  const row = decodeDotRow(buffer, 0);
  assert.deepEqual(Array.from(row.slice(0, 8)), [1, 0, 1, 0, 1, 0, 1, 0]);
  assert.deepEqual(Array.from(row.slice(8, 16)), [1, 1, 1, 1, 2, 2, 2, 2]);
});

test('RLE packets expand repeated runs', () => {
  const decoded = decompressRle(Uint8Array.from([1, 2, 0, 3, 3, 0, 0, 9]));
  assert.equal(decoded.length, 2 + 3 + 256);
  assert.deepEqual(Array.from(decoded.slice(0, 5)), [1, 2, 3, 3, 3]);
  assert.equal(decoded.at(-1), 9);
});

test('multiple copies repeat the image', () => {
  const { device, events, advance } = makeDevice();
  transfer(device, makePacket(CMD.DATA, new Uint8Array(320).fill(0xff)));
  transfer(device, makePacket(CMD.DATA));
  transfer(device, makePacket(CMD.PRINT, Uint8Array.from([3, 0x00, 0xe4, 0x40])));
  advance(10_000);
  const printed = events.filter((event) => event.type === 'row' && event.kind === 'print');
  assert.equal(printed.length, 24);
  assert.equal(events.filter((event) => event.type === 'print-start').length, 1);
  assert.equal(device.printJob, null);
});
