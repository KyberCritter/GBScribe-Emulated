/**
 * Byte-level adapter for emulators that expose a serial shift register rather
 * than individual clock edges.
 *
 * The Game Boy (DMG/CGB) serial port shifts one byte by toggling SCK eight
 * times. A GB/GBC emulator can call `transferByte(SB)` once per internal clock
 * train and write the returned byte back to SB. The underlying device still
 * sees every clock edge, so the same Game Boy Printer model works for a GB
 * Camera, Pokemon, or any other DMG-era printer client:
 *
 *   import { GBPrinterDevice } from '../printer/gb-printer.js';
 *   import { ByteLinkAdapter } from './byte-link.js';
 *
 *   const printer = new GBPrinterDevice();
 *   const cable = new ByteLinkAdapter(printer);
 *   // inside the GB emulator's serial clock:
 *   SB = cable.transferByte(SB);
 *
 * MIT License. See LICENSE.md.
 */

export class ByteLinkAdapter {
  constructor(device) {
    this.device = device;
  }

  /** MSB-first, full duplex, eight clocks. */
  transferByte(byte) {
    let received = 0;
    for (let bit = 7; bit >= 0; bit--) {
      received = (received << 1) | (this.device.clock((byte >> bit) & 1) & 1);
    }
    return received & 0xff;
  }

  getSOUT() {
    return this.device.getSOUT();
  }
}

/**
 * Minimal byte-level GB link-port shim. Not tied to a specific emulator: call
 * `beginTransfer(value)` when SC goes high with internal clock, then read
 * `getSB()` after the eight clocks have elapsed.
 */
export class ByteLevelLinkPort {
  constructor(device) {
    this.cable = new ByteLinkAdapter(device);
    this.sb = 0xff;
    this.clocking = false;
  }

  writeSB(value) {
    this.sb = value & 0xff;
  }

  readSB() {
    return this.sb;
  }

  startTransfer() {
    this.clocking = true;
    this.sb = this.cable.transferByte(this.sb);
    this.clocking = false;
    return this.sb;
  }
}
