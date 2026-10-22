/**
 * Game Boy Printer device emulation.
 *
 * This is a serial-level model of the DMG-era printer, not a mock of
 * GBScribe. It shifts bytes in on the rising clock edge, shifts replies out on
 * the falling edge (sampled by the GBA through SI), parses the 0x88 0x33
 * packet format, buffers 2bpp tile data, and physically advances paper while a
 * print job runs.
 *
 * Reference: Pan Docs, "Game Boy Printer" (gbdev.io/pandocs), and the
 * advanceprint_packet.h / advanceprint_job.c semantics used by GBScribe.
 *
 * MIT License. See LICENSE.md.
 */

export const CMD = Object.freeze({
  INIT: 0x01,
  PRINT: 0x02,
  DATA: 0x04,
  BREAK: 0x08,
  INQUIRY: 0x0f,
});

export const STATUS = Object.freeze({
  CHECKSUM_ERR: 1 << 0,
  PRINTING: 1 << 1,
  DATA_FULL: 1 << 2,
  UNPROCESSED: 1 << 3,
  PACKET_ERR: 1 << 4,
  PAPER_JAM: 1 << 5,
  OTHER_ERR: 1 << 6,
  LOW_BATTERY: 1 << 7,
});

export const KEEPALIVE = 0x81;

export const MAX_BUFFER_BYTES = 5760; // 18 tile rows, one GBScribe chunk
export const BYTES_PER_DOT_ROW = 40; // 160 pixels, 2 bits each
export const DOT_ROWS_PER_TILE_ROW = 8;
export const PAPER_FULL_ROLL_ROWS = 4000; // ~1 m of thermal paper

const clampInt = (value, min, max) => {
  const n = Number.isFinite(value) ? Math.floor(value) : min;
  return Math.min(max, Math.max(min, n));
};

/**
 * Decode one dot row from 2bpp tile data.
 *
 * A tile row is 320 bytes: 20 tiles x 16 bytes. Each tile stores 8 pixel rows
 * as [plane0, plane1] byte pairs. Shade 0 is white paper; 3 is the darkest
 * burn. `dotRow` is relative to the start of the buffer.
 */
export function decodeDotRow(buffer, dotRow, out = new Uint8Array(160)) {
  const tileRow = Math.floor(dotRow / DOT_ROWS_PER_TILE_ROW);
  const pixelRow = dotRow % DOT_ROWS_PER_TILE_ROW;
  for (let tile = 0; tile < 20; tile++) {
    const base = tileRow * 320 + tile * 16 + pixelRow * 2;
    const plane0 = buffer[base] | 0;
    const plane1 = buffer[base + 1] | 0;
    for (let x = 0; x < 8; x++) {
      const bit = 7 - x;
      out[tile * 8 + x] = ((plane0 >> bit) & 1) | (((plane1 >> bit) & 1) << 1);
    }
  }
  return out;
}

/**
 * Game Boy Printer RLE ("compression flag = 1").
 * A 0x00 byte introduces a two-byte run: count, value. A count of 0 means 256.
 */
export function decompressRle(bytes) {
  const out = [];
  for (let i = 0; i < bytes.length; i++) {
    const value = bytes[i];
    if (value !== 0x00) {
      out.push(value);
      continue;
    }
    if (i + 2 >= bytes.length) {
      // Truncated run: pass the remaining bytes through literally.
      out.push(...bytes.slice(i));
      break;
    }
    let count = bytes[++i];
    const runValue = bytes[++i];
    if (count === 0) count = 256;
    for (let n = 0; n < count; n++) out.push(runValue);
  }
  return Uint8Array.from(out);
}

export class GBPrinterDevice {
  /**
   * @param {object} [options]
   * @param {(event: {type: string, [key: string]: any}) => void} [options.onEvent]
   * @param {() => number} [options.now] clock, defaults to performance.now
   * @param {number} [options.rollRows] dot rows on the installed roll
   * @param {number} [options.printSpeed] ms per printed dot row
   * @param {number} [options.feedSpeed] ms per fed dot row
   */
  constructor(options = {}) {
    this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {};
    this.now = typeof options.now === 'function' ? options.now : () => performance.now();
    this.printSpeed = clampInt(options.printSpeed ?? 18, 1, 1000);
    this.feedSpeed = clampInt(options.feedSpeed ?? 12, 1, 1000);

    this.powered = true;
    this.coverClosed = true;
    this.rollCapacity = clampInt(options.rollRows ?? PAPER_FULL_ROLL_ROWS, 0, 32767);
    this.rollRows = this.rollCapacity;
    this.lowPaperRows = 80;
    this.lowPaperWarned = false;

    this.sout = 1;
    this.txByte = 0x00;
    this.txBit = 0;
    this.txQueue = [];
    this.rxByte = 0;
    this.rxBit = 0;

    this.packetState = 0;
    this.packetCommand = 0;
    this.packetCompression = 0;
    this.packetLength = 0;
    this.packetPayload = [];
    this.packetChecksum = 0;
    this.packetChecksumLo = 0;

    this.buffer = new Uint8Array(0);
    this.armed = false;
    this.errorBits = 0;
    this.printJob = null;
    this.printedRows = 0;
    this.feeding = false;
    this.feedRemaining = 0;
    this.nextFeedAt = 0;
    this.lastStatus = 0;
  }

  // ---------------------------------------------------------------------
  // Serial pins (called by the GBA SIO GPIO shim)
  // ---------------------------------------------------------------------

  /** MISO level seen by the GBA's SI pin. */
  getSOUT() {
    if (!this.powered) return 1; // idle-high link port, as if nothing is attached
    return this.sout & 1;
  }

  /**
   * One SCK rising edge. Returns the bit the printer drives on SOUT for this
   * clock; the SIO shim exposes it through RCNT bit 2.
   */
  clock(mosiBit) {
    if (!this.powered) {
      this.sout = 1;
      return 1;
    }

    this.update(this.now());

    const out = (this.txByte >> (7 - this.txBit)) & 1;
    this.sout = out;

    this.rxByte = ((this.rxByte << 1) | (mosiBit & 1)) & 0xff;
    this.rxBit++;
    this.txBit++;

    if (this.rxBit === 8) {
      const byte = this.rxByte;
      this.rxByte = 0;
      this.rxBit = 0;
      this.receiveByte(byte);
    }
    if (this.txBit === 8) {
      this.txBit = 0;
      this.txByte = this.txQueue.length ? this.txQueue.shift() : 0x00;
    }

    return out;
  }

  // ---------------------------------------------------------------------
  // Packet decoder
  // ---------------------------------------------------------------------

  receiveByte(byte) {
    switch (this.packetState) {
      case 0:
        if (byte === 0x88) this.packetState = 1;
        break;
      case 1:
        if (byte === 0x33) this.packetState = 2;
        else this.packetState = byte === 0x88 ? 1 : 0;
        break;
      case 2:
        this.packetCommand = byte;
        this.packetState = 3;
        break;
      case 3:
        this.packetCompression = byte;
        this.packetState = 4;
        break;
      case 4:
        this.packetLength = byte;
        this.packetState = 5;
        break;
      case 5:
        this.packetLength |= byte << 8;
        this.packetPayload = [];
        this.packetChecksum =
          (this.packetCommand +
            this.packetCompression +
            (this.packetLength & 0xff) +
            ((this.packetLength >> 8) & 0xff)) &
          0xffff;
        if (this.packetLength > 0x1000) {
          this.errorBits |= STATUS.PACKET_ERR;
          this.queueReply();
          this.resetPacket();
        } else {
          this.packetState = this.packetLength ? 6 : 7;
        }
        break;
      case 6:
        this.packetPayload.push(byte);
        this.packetChecksum = (this.packetChecksum + byte) & 0xffff;
        if (this.packetPayload.length >= this.packetLength) this.packetState = 7;
        break;
      case 7:
        this.packetChecksumLo = byte;
        this.packetState = 8;
        break;
      case 8: {
        const received = (this.packetChecksumLo | (byte << 8)) & 0xffff;
        if (received !== this.packetChecksum) {
          this.errorBits |= STATUS.CHECKSUM_ERR;
          this.emit({ type: 'protocol-error', error: 'checksum', expected: this.packetChecksum, received });
          this.queueReply();
        } else {
          this.finishPacket();
        }
        this.resetPacket();
        break;
      }
      default:
        this.resetPacket();
        break;
    }
  }

  resetPacket() {
    this.packetState = 0;
    this.packetCommand = 0;
    this.packetCompression = 0;
    this.packetLength = 0;
    this.packetPayload = [];
    this.packetChecksum = 0;
    this.packetChecksumLo = 0;
  }

  finishPacket() {
    const cmd = this.packetCommand;
    let payload = Uint8Array.from(this.packetPayload);
    if (this.packetCompression === 1) payload = decompressRle(payload);
    else if (this.packetCompression !== 0) {
      this.errorBits |= STATUS.PACKET_ERR;
      this.queueReply();
      return;
    }

    switch (cmd) {
      case CMD.INIT:
        this.buffer = new Uint8Array(0);
        this.armed = false;
        this.errorBits = 0;
        this.printJob = null;
        this.emit({ type: 'init' });
        break;

      case CMD.DATA:
        if (payload.length === 0) {
          this.armed = true;
        } else {
          const remaining = MAX_BUFFER_BYTES - this.buffer.length;
          if (payload.length > remaining) {
            this.errorBits |= STATUS.DATA_FULL;
            payload = payload.slice(0, Math.max(0, remaining));
          }
          const next = new Uint8Array(this.buffer.length + payload.length);
          next.set(this.buffer, 0);
          next.set(payload, this.buffer.length);
          this.buffer = next;
        }
        this.emit({ type: 'buffer', bytes: this.buffer.length, armed: this.armed });
        break;

      case CMD.PRINT:
        this.startPrint(payload);
        break;

      case CMD.BREAK:
        this.printJob = null;
        this.feeding = false;
        this.feedRemaining = 0;
        this.emit({ type: 'break' });
        break;

      case CMD.INQUIRY:
        break;

      default:
        this.emit({ type: 'unknown-command', command: cmd });
        break;
    }

    this.queueReply();
  }

  queueReply() {
    // The printer always answers with keepalive then status. These two bytes
    // occupy the two zero "reply slots" at the end of every GBScribe packet.
    this.txQueue.push(KEEPALIVE, this.status());
  }

  // ---------------------------------------------------------------------
  // Commands and physical state
  // ---------------------------------------------------------------------

  startPrint(payload) {
    if (payload.length < 4) {
      this.errorBits |= STATUS.PACKET_ERR;
      return;
    }
    const sheets = payload[0];
    const margins = payload[1];
    const palette = payload[2];
    const exposure = payload[3] & 0x7f;

    if (!this.armed || (this.buffer.length === 0 && sheets !== 0)) {
      // The real printer ignores PRINT without an armed empty DATA packet.
      this.emit({ type: 'ignored-print', reason: 'buffer-not-armed' });
      return;
    }
    if (!this.canPrint()) {
      this.errorBits |= STATUS.PAPER_JAM;
      this.emit({ type: 'error', error: 'paper', message: 'No paper. Open the cover and fit a new roll.' });
      return;
    }

    const before = (margins >> 4) * DOT_ROWS_PER_TILE_ROW;
    const after = (margins & 0x0f) * DOT_ROWS_PER_TILE_ROW;
    const rows = sheets === 0 ? 0 : Math.ceil(this.buffer.length / BYTES_PER_DOT_ROW);
    const copies = sheets === 0 ? 1 : Math.max(1, sheets);
    const perCopy = before + rows + after;

    const job = {
      data: this.buffer,
      rows,
      before,
      after,
      copies,
      perCopy,
      index: 0,
      total: perCopy * copies,
      nextAt: this.now(),
      sheets,
      palette,
      exposure,
    };
    this.printJob = job;
    this.buffer = new Uint8Array(0);
    this.armed = false;
    this.errorBits &= ~(STATUS.UNPROCESSED | STATUS.DATA_FULL);

    this.emit({
      type: 'print-start',
      rows,
      before,
      after,
      totalRows: job.total,
      copies,
      sheets,
      palette,
      exposure,
    });
  }

  update(now = this.now()) {
    if (!this.powered) return;

    if (this.printJob) {
      const job = this.printJob;
      let emitted = 0;
      while (job.index < job.total && now >= job.nextAt && emitted < 48) {
        let shades = null;
        let rowType = 'feed';
        const local = job.index % job.perCopy;
        if (local >= job.before && local < job.before + job.rows) {
          const row = local - job.before;
          shades = decodeDotRow(job.data, row);
          rowType = 'print';
        }
        if (!this.consumePaper(1)) {
          this.printJob = null;
          return;
        }
        this.emit({ type: 'row', kind: rowType, shades });
        job.index++;
        job.nextAt += this.printSpeed;
        emitted++;
      }
      if (job.index >= job.total) {
        this.printJob = null;
        this.emit({ type: 'print-done', rows: job.rows, totalRows: job.total });
      }
    }

    if (this.feeding && now >= this.nextFeedAt) {
      let fed = 0;
      while (this.feeding && now >= this.nextFeedAt && fed < 24) {
        if (!this.consumePaper(1)) {
          this.feeding = false;
          this.feedRemaining = 0;
          break;
        }
        this.emit({ type: 'row', kind: 'feed', shades: null });
        this.nextFeedAt += this.feedSpeed;
        fed++;
        if (this.feedRemaining > 0 && --this.feedRemaining === 0) this.feeding = false;
      }
    }
  }

  consumePaper(rows) {
    if (!this.paperAvailable()) {
      this.errorBits |= STATUS.PAPER_JAM;
      this.emit({ type: 'error', error: 'paper', message: 'Out of paper. Replace the roll.' });
      return false;
    }
    const take = Math.min(rows, this.rollRows);
    this.rollRows -= take;
    if (this.rollRows <= 0) {
      this.errorBits |= STATUS.PAPER_JAM;
      this.emit({ type: 'paper-out' });
    } else if (this.rollRows <= this.lowPaperRows && !this.lowPaperWarned) {
      this.lowPaperWarned = true;
      this.emit({ type: 'low-paper', remaining: this.rollRows });
    }
    return take === rows;
  }

  paperAvailable() {
    return this.coverClosed && this.rollRows > 0;
  }

  canPrint() {
    return this.powered && this.paperAvailable();
  }

  status() {
    this.update(this.now());
    let status = this.errorBits;
    if (this.printJob) status |= STATUS.PRINTING;
    if (this.armed && this.buffer.length) status |= STATUS.UNPROCESSED;
    if (this.buffer.length >= MAX_BUFFER_BYTES) status |= STATUS.DATA_FULL;
    if (!this.paperAvailable()) status |= STATUS.PAPER_JAM;
    this.lastStatus = status;
    return status & 0xff;
  }

  // ---------------------------------------------------------------------
  // User controls (printer body, not the serial protocol)
  // ---------------------------------------------------------------------

  setPower(on) {
    const next = Boolean(on);
    if (next === this.powered) return;
    this.powered = next;
    if (!next) {
      this.printJob = null;
      this.feeding = false;
      this.feedRemaining = 0;
      this.sout = 1;
    }
    this.emit({ type: 'power', on: this.powered });
  }

  setCover(open) {
    this.coverClosed = !open;
    if (!this.coverClosed) {
      this.printJob = null;
      this.feeding = false;
      this.feedRemaining = 0;
    }
    this.emit({ type: 'cover', open: !this.coverClosed });
  }

  replaceRoll(rows = PAPER_FULL_ROLL_ROWS) {
    this.rollRows = clampInt(rows, 1, 32767);
    this.rollCapacity = Math.max(this.rollRows, this.rollCapacity || 0);
    this.lowPaperWarned = false;
    this.errorBits &= ~STATUS.PAPER_JAM;
    this.coverClosed = true;
    this.emit({ type: 'roll', remaining: this.rollRows, capacity: this.rollCapacity });
  }

  /** Hold-to-feed. One row is emitted immediately so a click always advances. */
  startFeed() {
    if (!this.powered || !this.canPrint() || this.printJob) return;
    this.feeding = true;
    this.feedRemaining = 0;
    this.nextFeedAt = this.now();
    this.update(this.now());
    this.emit({ type: 'feed-start' });
  }

  stopFeed() {
    if (!this.feeding) return;
    this.feeding = false;
    this.feedRemaining = 0;
    this.emit({ type: 'feed-stop' });
  }

  feedRows(rows = DOT_ROWS_PER_TILE_ROW) {
    if (!this.powered || !this.canPrint() || this.printJob) return;
    this.feeding = true;
    this.feedRemaining = this.feedRemaining + Math.max(1, rows | 0);
    this.nextFeedAt = this.now();
    this.update(this.now());
  }

  removeRoll() {
    this.printJob = null;
    this.feeding = false;
    this.feedRemaining = 0;
    this.rollRows = 0;
    this.lowPaperWarned = false;
    this.errorBits |= STATUS.PAPER_JAM;
    this.emit({ type: 'roll', remaining: 0, capacity: this.rollCapacity });
  }

  get paperPercent() {
    if (!this.rollCapacity) return 0;
    return Math.max(0, Math.min(100, (this.rollRows / this.rollCapacity) * 100));
  }

  get jobProgress() {
    if (!this.printJob) return 0;
    return Math.min(1, this.printJob.index / this.printJob.total);
  }

  get jobRowsLeft() {
    if (!this.printJob) return 0;
    return Math.max(0, this.printJob.total - this.printJob.index);
  }

  emit(event) {
    try {
      this.onEvent(event);
    } catch (error) {
      // A UI listener must never take down the emulated serial device.
      if (typeof console !== 'undefined') console.error('GBPrinter event handler failed', error);
      this.lastHandlerError = error;
    }
  }
}
