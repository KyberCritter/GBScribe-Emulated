# GBScribe-Emulated — plan and implementation notes

## Goal

Prepare the project so it can be added as a section to a personal GitHub Pages blog that demonstrates GBScribe and the Game Boy Printer with real emulated hardware:

**Do not** attempt to publish to GitHub Pages.

- a pre-existing in-browser GBA emulator running a GBScribe ROM built from the
  upstream main branch (or latest release);
- a GBA shell with clickable and remappable controls;
- a Game Boy Printer connected through an emulated Link Cable;
- printing, paper feed, paper-roll replacement, power, and tearing;
- slow dot-row-by-dot-row paper output;
- tear by dragging or scissors;
- export to PNG, BMP, multi-page PDF, or a real printer.

A second goal emerged during development: the emulator integration must be
packaged so it can be reused in another browser emulator project, such as a
GB Camera / GB/GBC emulator that prints to the same printer model.

## Status

| Area | Status |
| --- | --- |
| Build GBScribe from upstream `master` | Done (`fb78d59`) |
| In-browser GBA emulation | Done (mGBA WebAssembly, MPL-2.0) |
| GPIO link-port channel | Done, patched core + printer worker |
| Serial Game Boy Printer | Done |
| GBA shell + input | Done |
| Printer shell, power, feed, roll, cover | Done |
| Paper output, tear, scissors, pages | Done |
| PNG / BMP / PDF / print | Done |
| Reusable link-port package | Done (`src/linkport/`) |
| Local persistence and cookie policy | Done, consent-gated |
| Node unit tests | Done (22) |
| Playwright feature tests | Done (28) |
| Blog embedding docs | Done |

## Requirements trace

| Requirement | Implementation |
| --- | --- |
| Preexisting in-browser GBA emulator | mGBA, compiled to WebAssembly, MPL-2.0 |
| GBScribe ROM from main / latest release | Built from `KyberCritter/GBScribe` master at `fb78d59` |
| GBA around emulated screen | The supplied crimson GBA photo, cut out, with the live screen composited into its display |
| Clickable / remappable controls | Transparent hit zones over the photo + remappable keyboard bindings |
| GB Printer next to it, Link Cable | Supplied printer photo, cut out, on the left; cable from GBA top port to printer right port |
| Print, replace paper, power, feed | Printer device + UI controls |
| Paper slowly prints out | Print job emits one dot row per tick; paper strip grows in real time |
| Tear by drag or scissors | Drag tear tab or paper body; scissors button; gallery |
| BMP / PNG / PDF / real printer | Hand-written BMP/PDF encoders; canvas PNG; print dialog |
| GitHub Pages section | Shadow-DOM custom element + iframe fallback |
| MIT if deps allow | MIT; mGBA MPL-2.0; font OFL; no GPL |
| Document work/references | README, PLAN, docs, LICENSES |
| Guided tutorial | First-load Yes/No prompt; spotlight/labels/arrows; on phones in portrait recommends rotating to landscape; auto-advances Start, mode select, typing, print, tear, and export after each user input; End tutorial and Guide replay controls |
| Cookie / storage policy | First-load template with Accept/Reject; states that no data is sent to the server and every feature works without cookies; Privacy settings can reopen it |
| Local save data | With consent, saves controls, sound, printed pages/current paper, guide completed/skipped state, and the GBScribe FLASH save in local browser storage; rejection clears demo data and disables writes |

## Emulator and license choice

Options considered:

| Emulator | License | Problem |
| --- | --- | --- |
| EmulatorJS + mGBA | GPL-3.0 wrapper | GNU copyleft; mGBA has no printer model |
| gbajs3 + `@thenick775/mgba-wasm` | MPL-2.0 + MIT/BSD | mGBA lacks the printer; modifying/compiling WASM is heavy |
| GBA.js (endrift) | BSD-2-Clause | Small, readable JS core; GPIO stub is easy to replace |
| NanoBoyAdvance / SkyEmu | GPL / other | License and/or WASM build complexity |

mGBA won: it is accurate at 60 fps, MPL-2.0 is file-level copyleft, and its
WebAssembly platform gives the demo a browser core that can be rebuilt with a
link-port hook. The core is patched in `sio.c` to call the printer on GPIO clock
edges and in `main.c` to expose the channel, flash save, and memory reads. The
build is vendored in `vendor/mgba/`; the printer model stays in JavaScript.

## ROM provenance

```txt
Repo:   https://github.com/KyberCritter/GBScribe
Branch: master
Commit: fb78d59413e70ad901b725425bb2b25ba49082c0
Date:   2026-10-10
Build:  devkitpro/devkitarm Docker image, ./build.sh
Output: GBScribe.gba (82,100 bytes)
SHA256: 8A1E7981065CBC9291EA0FE491BE2457560178A52F09C69D5F955D7C02BD061E
```

The latest tagged release is `v0.3`; the demo uses master because it is the
requested main branch and includes the MIT license/protocol cleanup commits.

## Architecture

```txt
GBScribe ROM
    │
mGBA CPU / MMU / timers / VRAM (WebAssembly)
    │  RCNT bit 15 = GPIO, bits 0..3 pins, bits 4..7 directions
    │  rising SCK → shared channel → clock(SO); SI ← reply
    ▼
GBPrinterDevice (printer worker)
    │  0x88 0x33 packets, checksum, INIT/DATA/PRINT/INQUIRY/BREAK
    │  2bpp 160-dot tile rows, 18-row buffer, margins
    ▼
Print job (wall-clock motor)
    │  one dot row per printSpeed ms
    ▼
PaperStore (281-dot paper strip, 160-dot centered print)
    │
PaperCanvasView / export encoders / print dialog
```

### Link-port channel

`gbsGpioClock()` in the core calls the printer worker on each SC rising edge and
returns the SI bit synchronously. The handshake uses a 16-byte shared block in
the core's memory; the worker runs the printer model and posts its row and
status events back to the page.

The reusable GBA.js shim is still in `src/linkport/gba-linkport.js` for GBA.js
projects: `installGbaLinkPort()` patches `sio.clear`, adds
`attachDevice`/`detachDevice`, overrides `writeRCNT`/`readRCNT`, and routes
`GameBoyAdvanceIO.loadU16`/`load16` so reads see the SI pin.

### Byte-level reuse

`src/linkport/byte-link.js` provides `ByteLinkAdapter.transferByte(byte)` for
emulators that expose the DMG `SB`/`SC` shift register instead of GPIO pins.
That is the path for a GB Camera / GB/GBC emulator: the same printer model
parses the same packets.

## Printer protocol details

Packet:

```txt
88 33 | cmd | compr | len_lo len_hi | payload… | ck_lo ck_hi | 00 | 00
magic                                                   checksum  reply slots
```

- Checksum is the 16-bit sum of `cmd` through payload.
- Reply slot 1 = `0x81` keepalive; slot 2 = status.
- Status: checksum error, printing, data full, unprocessed, packet error,
  paper jam, other error, low battery.
- Data buffer: 20 tiles × 16 bytes = 320 bytes per tile row; 18 rows = 5,760
  bytes; 40 bytes per dot row.
- PRINT args: sheets, margins (hi = feed before, lo = feed after), palette,
  exposure.
- Margins are interpreted as 8-dot rows, matching GBScribe's chunk joins.
- Multi-copy prints repeat the image; `sheets = 0` is a feed-only job.
- RLE compression is supported.
- GBScribe polls every ~50 ms while printing; the printer keeps the PRINTING
  bit asserted until the motor finishes.

## Paper model and measured width

The uploaded print photo shows a printed square about **443 px** wide on a
paper strip about **780 px** wide, i.e. the printed content is ~57% of the paper
width. The model therefore stores a **281-dot paper row** with the printer's
160-dot image centered at offset 60:

```txt
paper:  281 dots  (38 mm presentation)
print:  160 dots  (57% of paper)
margin:  60 + 61 dots
```

This presentation width is separate from the serial buffer, which remains the
real 160-dot printer data. Exports use the same 281-dot/2bpp image, so PNG, BMP,
PDF, and print match the on-screen paper margins.

## UI design

The supplied hardware photos are used directly, with their backgrounds cut out:

1. Front-on translucent crimson GBA with a white screen bezel, white D-pad,
   A/B, small Start/Select under the D-pad, top-right POWER LED, bottom-right
   speaker, and Link Cable port on the top edge.
2. Front-on beige Game Boy Printer, smoked roll cover, black brand band, white
   paper slot, red FEED button, gray POWER switch, Nintendo oval, and a
   right-side Link Cable port.
3. Printed paper close-up for the print-width ratio.

Implementation notes:

- The printer sits on the **left**, the GBA on the **right**.
- The GBA screen is the real 240×160 canvas, scaled with pixelated rendering.
- The printer is the supplied photo; paper exits the **white slot** below the
  roll cover and moves upward over the printer front, like a real print.
- The paper strip is clipped in a scrollable window with auto-follow; its
  tear tab is at the free top edge (use the scissors when it scrolls out of view).
- The Link Cable starts at the GBA's **top link port** and ends at the
  printer's **right-side port**. The SVG path is measured from the actual DOM
  port rectangles at runtime, so it follows responsive layout.
- On narrow screens the cable is still drawn: each end runs off the component
  instead of joining the stacked devices directly.

## Tests

### Node (`npm test`)

- Packet framing/checksums, INQUIRY, INIT/DATA/ARM/PRINT
- margins, paper consumption, paper-out jam, multiple copies
- checksum error status, dot-row decode, RLE
- ByteLinkAdapter
- PaperStore tear/labels/remove, centered print width
- BMP header/pixels, PDF pages/image dimensions/streams

### Playwright (`npm run test:e2e`)

- Boot, printer detection, guided test print, tear, PNG export
- Paper drag tear, feed, roll replacement, power off/on detection
- PNG/BMP/PDF downloads and real-print popup
- Title chooser inventory
- Text editor: typing, backspace, caret + L, layers, save data, settings,
  new/load, print
- Drawing: pencil, eraser, line, stamp, palette, save/load/clear, print, menu
- Credits, legal page, QR print, instructions, print confirm cancel
- Konami debug menu and print path
- Title-screen load after reset
- Reusable GPIO shim with a fake device, SI input, attach/detach, idempotence
- Key rebinding, on-screen Start, reset defaults
- Printer via ByteLinkAdapter
- First-load guide prompt, auto-driven walkthrough with a phone-rotation step in
  portrait, print/tear/export result, and ending the tutorial early
- Guide completion/skip remembered across reloads
- First-load cookie policy, accept/reject, rejected writes, and accepted
  restoration of printed pages, current paper, controls, and the GBScribe save
  file
- `LocalStore` consent, JSON round-trip, rejection, and clearing behavior

The tests read the ROM's BG text map and FLASH save data through the emulator,
not DOM mocks.

## Risks / limitations

- GBA.js is not cycle-accurate; GBScribe's timing loops happen to work at 60 fps.
- Printer motor/paper timing is wall-clock for presentation; serial timing is
  driven by the ROM.
- The printer model covers GBScribe's use of the protocol plus multi-copy and
  RLE, but is not a full hardware reimplementation of analog behavior.
- Paper is a 4,000-dot demo roll (~95 cm) to make replacement reachable.
- Persistence uses the browser's local-storage quota; very large page histories
  can hit it, in which case a warning is shown and the session continues.
- The consent choice is stored in local storage, not a tracking cookie, so it is
  never attached to an HTTP request.
- Print exposure is parsed but the visible burn is fixed.
- Browser audio needs a user gesture.
- Saves are browser-local.

## References

1. GBScribe — https://github.com/KyberCritter/GBScribe
2. AdvancePrint — https://github.com/KyberCritter/AdvancePrint
3. Pan Docs, Game Boy Printer — https://gbdev.io/pandocs/Gameboy_Printer.html
4. GBATEK (GBA link port/RCNT) — https://problemkaputt.de/gbatek.htm
5. GBA.js — https://github.com/endrift/gbajs
6. shonumi, In Depth: The Game Boy Printer — https://shonumi.github.io/articles/art2.html
7. gba-link-connection — https://github.com/afska/gba-link-connection
8. Game Boy Printer, Wikipedia — https://en.wikipedia.org/wiki/Game_Boy_Printer
