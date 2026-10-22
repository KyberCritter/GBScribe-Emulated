/**
 * Page-side handle for the Game Boy Printer.
 *
 * Presents the same surface as GBPrinterDevice to the demo while the device
 * itself lives on the printer worker. Commands are delivered through a shared
 * control block, and the worker reports every serial event together with a
 * snapshot of the device state.
 *
 * MIT License. See LICENSE.md.
 */

const OP_POWER = 1;
const OP_COVER = 2;
const OP_ROLL = 3;
const OP_REMOVE_ROLL = 4;
const OP_FEED_START = 5;
const OP_FEED_STOP = 6;
const OP_FEED_ROWS = 7;

const FULL_ROLL_ROWS = 4000;

const clampRows = (value) => {
  const n = Number.isFinite(value) ? Math.floor(value) : FULL_ROLL_ROWS;
  return Math.min(32767, Math.max(1, n));
};

export class PrinterLink {
  constructor(options = {}) {
    this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {};
    this.printSpeed = options.printSpeed ?? 18;
    this.feedSpeed = options.feedSpeed ?? 12;
    this.rollRows = clampRows(options.rollRows);
    this.rollCapacity = this.rollRows;
    this.lowPaperRows = 80;
    this.powered = true;
    this.coverClosed = true;
    this.jobProgress = 0;
    this.jobRowsLeft = 0;
    this.printJob = null;

    this.commandBuffer = new SharedArrayBuffer(16);
    this.commands = new Int32Array(this.commandBuffer);
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    this.worker = new Worker(new URL('./printer-worker.js', import.meta.url), { type: 'module' });
    this.worker.onmessage = (message) => this.receive(message.data || {});
    this.worker.onerror = (error) => console.error('[GB Printer]', error);
    this.worker.postMessage({
      type: 'init',
      printSpeed: this.printSpeed,
      feedSpeed: this.feedSpeed,
      rollRows: this.rollRows,
      powered: this.powered,
      commandBuffer: this.commandBuffer,
    });
  }

  get paperPercent() {
    if (!this.rollCapacity) return 0;
    return Math.max(0, Math.min(100, (this.rollRows / this.rollCapacity) * 100));
  }

  attachChannel(buffer, offset) {
    this.worker.postMessage({ type: 'channel', buffer, offset });
  }

  send(opcode, argument = 0) {
    const sequence = (Atomics.load(this.commands, 0) + 1) | 0;
    Atomics.store(this.commands, 1, opcode);
    Atomics.store(this.commands, 2, argument | 0);
    Atomics.store(this.commands, 0, sequence);
  }

  receive(message) {
    if (message.state) this.applyState(message.state);
    if (message.type === 'ready') this.resolveReady();
    if (message.type === 'event') {
      try {
        this.onEvent(message.event);
      } catch (error) {
        console.error('GBPrinter event handler failed', error);
      }
    }
  }

  applyState(state) {
    this.powered = Boolean(state.powered);
    this.coverClosed = Boolean(state.coverClosed);
    this.rollRows = state.rollRows;
    this.rollCapacity = state.rollCapacity;
    this.lowPaperRows = state.lowPaperRows;
    this.jobProgress = state.jobProgress;
    this.jobRowsLeft = state.jobRowsLeft;
    this.printJob = state.printJob ? { active: true } : null;
  }

  setPower(on) {
    this.powered = Boolean(on);
    this.send(OP_POWER, this.powered ? 1 : 0);
  }

  setCover(open) {
    this.coverClosed = !open;
    this.send(OP_COVER, open ? 1 : 0);
  }

  replaceRoll(rows = FULL_ROLL_ROWS) {
    this.rollRows = clampRows(rows);
    this.rollCapacity = Math.max(this.rollRows, this.rollCapacity || 0);
    this.send(OP_ROLL, this.rollRows);
  }

  removeRoll() {
    this.rollRows = 0;
    this.send(OP_REMOVE_ROLL);
  }

  startFeed() {
    this.send(OP_FEED_START);
  }

  stopFeed() {
    this.send(OP_FEED_STOP);
  }

  feedRows(rows = 8) {
    this.send(OP_FEED_ROWS, Math.max(1, rows | 0));
  }

  update() {}

  destroy() {
    this.worker.terminate();
    this.worker = null;
  }
}
