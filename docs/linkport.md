# Reusing the link-port layer

The Game Boy Printer support is split into these reusable pieces:

| Piece | File | What it does |
| --- | --- | --- |
| mGBA channel | [`../src/emulator/mgba-core.js`](../src/emulator/mgba-core.js) | `RCNT` clock edges, SI replies, and a shared-memory handshake with the printer worker. |
| Printer host | [`../src/printer/printer-link.js`](../src/printer/printer-link.js), [`../src/printer/printer-worker.js`](../src/printer/printer-worker.js) | Keeps the serial device off the page thread and mirrors its state for the UI. |
| GBA.js GPIO shim | [`../src/linkport/gba-linkport.js`](../src/linkport/gba-linkport.js) | Teaches stock GBA.js about `RCNT` GPIO mode, clock edges, SI input, and hot-pluggable devices. |
| Printer device | [`../src/printer/gb-printer.js`](../src/printer/gb-printer.js) | Serial-level Game Boy Printer: packets, checksums, status, 2bpp buffer, paper, motor timing. |
| Byte transport | [`../src/linkport/byte-link.js`](../src/linkport/byte-link.js) | Adapters for emulators that expose an 8-bit serial register instead of individual clock edges. |

All of these are plain JavaScript with no app-specific imports. They are MIT
licensed, so they can be copied into another emulator project independently of
the GBScribe UI.

## 0. mGBA browser core

The demo runs mGBA in a worker. `RCNT` writes in GPIO mode call into
`gbsGpioClock()`, which passes the SO bit to the printer worker through a
`SharedArrayBuffer` and waits for the SI reply:

```txt
GBScribe  ──RCNT write──▶  mGBA core (worker)
                              │  gbsGpioClock(mosi)
                              ▼
                     printer worker ──▶ GBPrinterDevice.clock()
                              │
                              └── SI bit ──▶ RCNT bit 2
```

The device survives resets and keeps running while the page is busy. Its
`row`, `print-done`, and status events cross back over `postMessage`; the page
handle mirrors state so the UI can read `rollRows`, `paperPercent`, and
`jobProgress` synchronously.

## 1. GBA.js

Load stock GBA.js first, then install the shim *before* constructing the
emulator:

```js
import { installGbaLinkPort } from './linkport/gba-linkport.js';
import { GBPrinterDevice } from './printer/gb-printer.js';

installGbaLinkPort();          // idempotent
const gba = new GameBoyAdvance();
const printer = new GBPrinterDevice();
gba.sio.attachDevice(printer);
```

`installGbaLinkPort()` does four things:

1. Overrides `GameBoyAdvanceSIO.clear` so a core reset does not unplug the
   cable. Pin state resets; the device object stays attached.
2. Adds `attachDevice(device)` / `detachDevice()`.
3. Overrides `writeRCNT` and `readRCNT` for GPIO mode.
4. Patches `GameBoyAdvanceIO.loadU16` (and `load16`) so reads of `RCNT`
   reflect the SI input pin instead of only the last written value.

By default it also disables GBA.js's hard-coded keyboard listeners so the host
page can implement remappable controls. Pass
`installGbaLinkPort({ disableKeypadHandlers: false })` to keep them.

### Pin model

`RCNT` bit 15 enters GPIO mode. Bits 0..3 are the pins, bits 4..7 are their
directions (1 = output):

| Bit | Pin | Direction bit | GBScribe wiring |
| --- | --- | --- | --- |
| 0 | SC | 4 | GBA clock → printer SCK |
| 1 | SD | 5 | unused |
| 2 | SI | 6 | printer SOUT → GBA SI |
| 3 | SO | 7 | GBA MOSI → printer SIN |

On each SC rising edge the shim calls `device.clock(mosiBit)`. The returned bit
is exposed on SI through `readRCNT()`. A disconnected port reads high through
the pull-up, so a client sending an INQUIRY sees `0xFF` rather than a
keepalive.

### Device interface

```ts
interface LinkDevice {
  clock(mosiBit: 0 | 1): 0 | 1;  // required: one SCK rising edge
  getSOUT(): 0 | 1;              // required: current MISO level
  attach?(sio): void;            // optional lifecycle
  detach?(sio): void;
  reset?(): void;
}
```

A device can be swapped while the emulator is running. The shim preserves the
device across `gba.setRom()` / core resets, matching a cable that stays plugged
in.

## 2. GB / GBC emulators

The printer speaks the DMG serial protocol. A GB/GBC emulator usually exposes
`SB` (shift register) and `SC` (control) rather than GPIO pin writes. Use
`ByteLinkAdapter` once per completed byte:

```js
import { GBPrinterDevice } from './printer/gb-printer.js';
import { ByteLinkAdapter } from './linkport/byte-link.js';

const printer = new GBPrinterDevice({ onEvent: handlePrinterEvent });
const cable = new ByteLinkAdapter(printer);

// inside the emulator's serial clock, when SC bit 7 is set and internal
// clocking finishes eight shifts:
SB = cable.transferByte(SB);
```

This is enough for a Game Boy Camera, Pokémon Yellow, or any other DMG-era
printer client. `ByteLinkAdapter` is MSB-first and full-duplex, matching the
hardware's 8192 Hz mode. The printer's `clock` and `getSOUT` methods are the
same ones used by the GBA GPIO shim, so there is one printer implementation.

If your emulator already provides a byte-level link hook (for example a
`transferByte` callback), call `cable.transferByte(byte)` directly. If it
exposes only pin writes, call `printer.clock(mosi)` and `printer.getSOUT()`
yourself.

`ByteLevelLinkPort` in the same file is a small `SB`-style convenience wrapper
for emulators that want a prebuilt shift register.

## 3. What the printer model covers

- 10-byte discovery packet and `0x81` keepalive
- INIT, DATA, PRINT, INQUIRY, BREAK
- 16-bit checksum and checksum/packet error status
- optional RLE compression
- 2bpp 160-dot tile rows, 18-row / 5,760-byte buffer
- feed-before / feed-after margins, multi-copy prints
- PRINTING, UNPROCESSED, DATA_FULL, PAPER_JAM, LOW_BATTERY status bits
- physical paper consumption, feed button, power, cover, roll replacement

Events are emitted through `onEvent`:

```js
const printer = new GBPrinterDevice({
  printSpeed: 17, // ms per dot row
  feedSpeed: 11,
  onEvent(event) {
    if (event.type === 'row') {
      // event.kind === 'print' (event.shades: Uint8Array(160), 0..3)
      // event.kind === 'feed'  (event.shades === null)
    }
  },
});
```

Call `printer.update(performance.now())` once per animation frame so the motor
moves independently of serial polls.

## 4. Packaging checklist for another project

1. Copy `src/linkport/gba-linkport.js`, `src/linkport/byte-link.js`, and
   `src/printer/gb-printer.js`.
2. Load stock GBA.js.
3. `installGbaLinkPort()` before `new GameBoyAdvance()`.
4. `gba.sio.attachDevice(device)` after (or before) `setRom`.
5. Keep the MIT notice from this repository and the BSD notice from GBA.js.

No GBScribe ROM, UI, paper renderer, or exporter is required to reuse the
link-port and printer layers. The printer can back any front end: a GB Camera
gallery, a Pokémon print viewer, or a hardware bridge.
