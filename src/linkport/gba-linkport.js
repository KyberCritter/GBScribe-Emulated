/**
 * Reusable general-purpose link-port support for GBA.js.
 *
 * Stock GBA.js stubs out RCNT GPIO mode and has no concept of a device on the
 * link port. This module installs that missing layer without forking the
 * vendored emulator files:
 *
 *   - RCNT bit 15 selects GPIO mode.
 *   - bits 0..3 are SC, SD, SI, SO; bits 4..7 are their directions.
 *   - a rising SC edge clocks one bit into the attached device (SO / MOSI) and
 *     exposes the device's next bit on SI (MISO).
 *
 * A device is any object with:
 *
 *   clock(mosiBit: 0|1): 0|1   // called on each SCK rising edge
 *   getSOUT(): 0|1             // current MISO level
 *
 * Optional lifecycle methods `reset()`, `attach()`, and `detach()` are called
 * if present. GBPrinterDevice already implements this interface; a GB Camera,
 * link cable, or custom serial peripheral can implement the same two methods.
 *
 * Load GBA.js first, then install this patch before constructing a
 * GameBoyAdvance:
 *
 *   installGbaLinkPort();
 *   const gba = new GameBoyAdvance();
 *   gba.sio.attachDevice(new GBPrinterDevice());
 *
 * MIT License. See LICENSE.md.
 */

let installed = null;

/**
 * @param {{ disableKeypadHandlers?: boolean }} [options]
 *   By default the original GBA.js keyboard listeners are disabled so the host
 *   page can provide remappable controls. Pass false to keep them.
 * @returns {{ installed: true, devices: unknown[] }}
 */
export function installGbaLinkPort(options = {}) {
  if (typeof window === 'undefined') {
    throw new Error('installGbaLinkPort requires a browser environment');
  }
  const SIO = window.GameBoyAdvanceSIO;
  const IO = window.GameBoyAdvanceIO;
  const Keypad = window.GameBoyAdvanceKeypad;
  if (!SIO || !IO) {
    throw new Error('Load GBA.js (util/core/.../sio/io/gba) before installing the link port');
  }
  if (installed) return installed;

  if (options.disableKeypadHandlers !== false && Keypad) {
    // The host owns keyboard/virtual input. This still allows the host to call
    // keypad.currentDown directly, which is what the demo does.
    Keypad.prototype.registerHandlers = function registerHandlers() {};
  }

  const originalClear = SIO.prototype.clear;
  SIO.prototype.clear = function clear() {
    originalClear.call(this);
    // Keep this.device across a core reset: physically, the cable is still
    // plugged in. Reset only the pin state.
    this.rcnt = 0x8000;
    this.gpioSC = 1;
  };

  SIO.prototype.attachDevice = function attachDevice(device) {
    if (this.device && this.device !== device && typeof this.device.detach === 'function') {
      this.device.detach(this);
    }
    this.device = device;
    if (device && typeof device.attach === 'function') device.attach(this);
    return device;
  };

  SIO.prototype.detachDevice = function detachDevice() {
    const device = this.device;
    this.device = null;
    if (device && typeof device.detach === 'function') device.detach(this);
    return device;
  };

  SIO.prototype.writeRCNT = function writeRCNT(value) {
    this.rcnt = value;
    if (this.mode !== this.SIO_GPIO) return;

    const sc = value & 1;
    const rising = !this.gpioSC && sc;
    this.gpioSC = sc;

    // SC (bit 0) must be an output (direction bit 4) for a clock edge.
    if (rising && this.device && (value & 0x10)) {
      this.device.clock((value >> 3) & 1);
    }
  };

  SIO.prototype.readRCNT = function readRCNT() {
    let value = this.rcnt;
    if (this.mode !== this.SIO_GPIO) return value;

    // SI is an input when direction bit 6 is clear. A disconnected link port
    // reads high through the pull-up, which is how GBScribe distinguishes a
    // missing printer (0xFF keepalive) from a live device.
    if (!(value & 0x40)) {
      const si = this.device ? this.device.getSOUT() & 1 : 1;
      value = (value & ~4) | (si << 2);
    }
    return value;
  };

  // RCNT reads must reflect input pins, not just the last written value.
  // GBA.js routes CPU halfword reads through loadU16 (load16 delegates to it),
  // so patch both entry points.
  const originalLoadU16 = IO.prototype.loadU16;
  IO.prototype.loadU16 = function loadU16(offset) {
    if (offset === this.RCNT) return this.sio.readRCNT();
    return originalLoadU16.apply(this, arguments);
  };

  const originalLoad16 = IO.prototype.load16;
  IO.prototype.load16 = function load16(offset) {
    if (offset === this.RCNT) return this.sio.readRCNT();
    return originalLoad16.apply(this, arguments);
  };

  installed = {
    installed: true,
    devices: [],
  };
  window.__gbsLinkPort = installed;
  return installed;
}

/**
 * Convenience helper for a GBA.js instance. The device interface is the same
 * one used by GBPrinterDevice.
 */
export function attachGbaDevice(gba, device) {
  if (!gba || !gba.sio || typeof gba.sio.attachDevice !== 'function') {
    throw new Error('installGbaLinkPort() must be called before attaching a device');
  }
  return gba.sio.attachDevice(device);
}
