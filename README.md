# GBScribe-Emulated

[![GBScribe logo: a Game Boy with a quill and ink pot](assets/img/logo.png)](https://github.com/KyberCritter/GBScribe)

An interactive browser demo of **GBScribe**, the Game Boy Advance word processor
and pixel-art tool, connected to an emulated **Game Boy Printer**.

By Scott Ratchford — [scottratchford.com](https://scottratchford.com)

Licensed under the **MIT License** — see [LICENSE.md](LICENSE.md).

```txt
GBScribe ROM ── mGBA CPU / VRAM / timers
                       │
                 RCNT GPIO mode
                 SCK / SO / SI
                       │
              Game Boy Printer model
                       │
        thermal paper ─ tear ─ export
```

## Why this exists

GBScribe is a native GBA homebrew app that bit-bangs the DMG printer protocol
over the GBA link port in **general-purpose GPIO mode**. Most browser GBA
emulators do not implement that mode, and none ship a Game Boy Printer. This
project fills both gaps with a browser build of mGBA:

- **mGBA** (MPL-2.0), compiled to WebAssembly, runs the unmodified GBScribe ROM.
- A small, reusable **GPIO link-port channel** clocks the printer from `RCNT`
  GPIO mode and exposes its SI replies back to the core.
- A serial-level **Game Boy Printer** parses the real `0x88 0x33` packet
  protocol, buffers 2bpp tile data, runs the motor, and physically advances
  paper.
- The UI wraps the emulator in a clickable GBA, plugs a Link Cable into the
  printer, and lets you tear the output off and export it.

The printer model is not a GBScribe mock. The ROM detects it with its normal
INQUIRY probe, streams its normal DATA chunks, and polls the normal PRINTING
status bit. Powering the printer off makes GBScribe report
`Printer: disconnected` through the same code path as real hardware.

The shells are the supplied hardware photos, cut out for the browser: a
front-on crimson GBA with a white bezel and white controls, and a front-on
beige printer with a smoked paper-roll cover, black brand band, and white
output slot. The printer is on the left, the GBA on the right. The Link Cable leaves
the **top** of the GBA and enters the **right side** of the printer. On narrow
screens the devices stack and the cable runs off the edges of the demo, as if
the connection continues out of view. Paper feeds
out of the white slot and rises up over the printer, like the real thing. The
print image is centered on the paper at the ~57% width measured from a real
Game Boy Camera print.

## Features

### GBA and GBScribe
- Unmodified GBScribe ROM built from the project's `master` branch.
- 240x160 screen in a translucent crimson GBA shell, with clickable/touch
  D-pad, A/B, L/R, Start, and Select.
- Keyboard controls, fully remappable and saved locally with permission.
- GBA saves (GBScribe's FLASH1M save slots) persist in the browser with
  permission.
- Guided **Try a test print** button.
- A first-load guide that can walk through the whole app, plus a **Guide** button
  to replay it.

### Guided tour
- On first load, asks **"Would you like to view a guide?"** with Yes/No choices.
- Highlights Start, the D-pad and A button, the writing controls, the
  **Print document** menu entry, the printer, the tear controls, and the
  export bar in order, with labels and arrows.
- Performs the highlighted action after each tap, click, or key press, so the
  screen state advances with the instructions instead of ahead of them.
- On phones held upright, starts by suggesting the device be rotated horizontally
  so the GBA screen and on-screen controls have room side by side.
- **End tutorial** stays in the top right while the guide is running. The
  **Guide** button in the header can replay it at any time.
- Embedders can suppress the first-load prompt with
  `guide-prompt="false"` or `?guide=0`.

### Privacy and saved data
- On the first visit, a dependency-free cookie and local-storage notice explains
  what can be saved and offers **Accept** or **Reject**.
- It states that **no data is sent to the server** and that **every feature works
  without cookies**.
- Accepting saves keyboard bindings, sound preference, printed pages and the
  current paper strip, guide completion/skip state, and the GBScribe FLASH save
  locally in the browser.
- Rejecting clears local demo data and keeps the demo fully usable; it simply
  starts fresh on the next visit.
- The choice is remembered locally. **Privacy settings** in the **How it works**
  dialog reopens the policy so it can be changed later.
- The browser's local storage is used rather than tracking cookies, so saved
  data is not attached to HTTP requests.

### Game Boy Printer
- Serial-level GPIO emulation: SCK rising edges, SOUT/SI, pull-ups.
- INIT, DATA, PRINT, INQUIRY, BREAK; checksums; compression; status bits.
- 160-dot, four-shade thermal output with 18-tile-row buffer semantics.
- Feed-before/feed-after margins and multi-copy prints.
- Portrait printer based on the hardware photo: smoked roll cover, black brand
  band, white paper slot, red FEED button, gray POWER switch.
- **Slow, visible paper feed** from the white slot — one dot row at a time,
  rising up over the printer front.
- Paper is 281 dots wide with the 160-dot print centered at ~57%, matching a
  real Game Boy Camera print.
- **Tear by dragging** the paper or click the **scissors**.
- **Power**, **Feed**, **paper roll replacement**, cover state, and paper-out
  jams. The printer starts powered on; its switch still disconnects it.
- Roll gauge and physical paper length in cm/mm.
- Detached sheets collect in **Printed pages**, with PNG, BMP, PDF, Print, and
  a labeled **Delete** action on every saved print.

### Export
- **PNG** and **BMP** at 4× printer resolution.
- Multi-page **PDF** at the printer's physical 38 mm width, 2-bit grayscale.
- **Print** via the browser's real print dialog (scaled up for readability).
- Everything is generated locally; no uploads or services.

### Reusable link-port layer
The emulator adapter and printer model are standalone modules, documented in
[`docs/linkport.md`](docs/linkport.md). They can be reused in another emulator
project — for example, a GB Camera / GB/GBC emulator using the
`ByteLinkAdapter`, or a different GBA front end using
`installGbaLinkPort()`.

Detailed notes: [embedding](docs/integration.md) · [link-port reuse](docs/linkport.md) · [design](docs/design.md) · [testing](docs/testing.md) · [plan](PLAN.md).

## Run it

There is no build step for the demo. Serve the repository over HTTP (ES modules,
`fetch`, and Web Audio do not work from `file://`):

```sh
python -m http.server 8099
# open http://localhost:8099/
```

or, with the Playwright test server:

```sh
npm install
npm run serve
```

## Embed it in a Jekyll / GitHub Pages blog

Copy the whole project folder to your site's assets, for example:

```txt
assets/gbscribe-emulated/
  index.html
  src/
  vendor/
  assets/
```

Then put this in a post or include:

```html
<div id="gbscribe-demo"></div>
<script type="module"
        src="/assets/gbscribe-emulated/src/gbscribe-demo.js"></script>
```

The module defines `<gbscribe-emulator>` and auto-mounts it into the
placeholder. It uses a Shadow DOM, so the blog theme cannot leak into the demo
and the demo cannot restyle the blog. Assets are resolved relative to the
module (`../assets/…`, `../vendor/…`), so keep the folder structure intact.

You can also use the element directly:

```html
<gbscribe-emulator
  rom-url="/assets/gbscribe-emulated/assets/roms/GBScribe.gba">
</gbscribe-emulator>
<script type="module"
        src="/assets/gbscribe-emulated/src/gbscribe-demo.js"></script>
```

Or use an iframe if your blog strips module scripts or custom elements:

```html
<iframe src="/assets/gbscribe-emulated/index.html"
        title="GBScribe and Game Boy Printer"
        style="width:100%;height:1100px;border:0"
        loading="lazy"></iframe>
```

### CSP notes

The demo needs `script-src 'self'`, `font-src 'self'`, `img-src 'self' data:`,
and `style-src 'self' 'unsafe-inline'` (the component injects scoped styles).
No third-party origins are contacted at runtime.

## Controls

| GBA button | Default key |
| --- | --- |
| D-pad | Arrow keys |
| A | `Z` |
| B | `X` |
| L | `A` |
| R | `S` |
| Start | `Enter` |
| Select | `Backspace` |

Click the GBA (or a control inside the component) to give it keyboard focus.
The on-screen buttons support mouse, touch, and multi-touch. Use **Controls** in
the demo to rebind any button; **Reset defaults** restores the table above.

### GBScribe quick start
1. Click **Start** on the GBA.
2. Choose **New text document** or **New drawing**.
3. Press **Start** again to open the document/drawing menu.
4. Choose **Print document** or **Print drawing**, then **A: Print**.
5. Drag the paper up or use the scissors when it is done.
6. Export the sheet, replace the roll, or power-cycle the printer.

Or click **Try a test print** to watch the whole chain automatically.

## Building the ROM

The included ROM was built from
[`KyberCritter/GBScribe`](https://github.com/KyberCritter/GBScribe) `master`
at commit `fb78d59413e70ad901b725425bb2b25ba49082c0` (2026-10-10), which is
after the `v0.3` release. Its SHA-256 is
`8A1E7981065CBC9291EA0FE491BE2457560178A52F09C69D5F955D7C02BD061E`.

To rebuild:

```sh
git clone https://github.com/KyberCritter/GBScribe.git reference/GBScribe
cd reference/GBScribe
./build.sh                    # requires Docker + devkitpro/devkitarm
cp GBScribe.gba ../../assets/roms/GBScribe.gba
```

`tools/build-rom.sh` wraps that flow. See
[`assets/roms/README.md`](assets/roms/README.md) for provenance.

## Architecture

| Layer | Location | Notes |
| --- | --- | --- |
| ROM | `assets/roms/GBScribe.gba` | MIT, built from source |
| Emulator | `vendor/mgba/` | mGBA WebAssembly core, MPL-2.0 |
| Emulator adapter | `src/emulator/mgba-core.js` | ROM/save mounting, keypad, audio, memory reads |
| GPIO channel | `src/emulator/mgba-core.js`, `vendor/mgba/mgba.js` | `RCNT` clock edges and SI replies |
| Printer host | `src/printer/printer-worker.js` | Runs the device off the page thread |
| Byte adapter | `src/linkport/byte-link.js` | GB/GBC serial-register transport |
| Printer | `src/printer/gb-printer.js` | Serial pins → packets → motor/paper |
| Paper | `src/printer/paper.js` | 281-dot sheets with centered 160-dot print, renderer, tear model |
| Export | `src/export/exporters.js` | BMP, PDF, PNG, print |
| UI | `src/app.js`, `src/ui/` | Shadow DOM component, GBA/printer shells |
| Persistence | `src/persistence.js` | Consent-gated local storage for controls, pages, guide state, and saves |
| Tests | `tests/` | Node unit tests + Playwright e2e |

The printer's DATA buffer is the real 2bpp tile format: 20 tiles per row, 16
bytes per tile, 320 bytes per tile row, 5,760 bytes per 18-row GBScribe chunk.
Shade 0 is paper; 3 is the darkest burn.

## Tests

```sh
npm test          # Node: protocol, paper, PDF/BMP/PNG encoders
npm run test:e2e  # Playwright: GBScribe features + printer UI
npm run test:all
```

The Playwright suite boots GBScribe, detects the printer, exercises the text
editor, drawing tools, saves, settings, credits, legal page, instructions,
Konami Easter egg, QR print, drawing print, paper tearing, roll replacement,
power cycling, exports, rebinding, the guided tour, consent-gated persistence,
and the reusable GPIO/byte link layers.

The e2e suite has 26 tests; the Node suite has 22. The e2e tests read
GBScribe's real BG text map and FLASH save data through the emulator, so
assertions cover actual ROM state rather than DOM mocks.

## Layout

```txt
assets/         ROM, font, logo
docs/           integration, link-port reuse, testing notes
src/
  app.js        demo orchestration
  persistence.js  consent-gated local browser storage
  gbscribe-demo.js  custom element entry point
  emulator/     mGBA adapter and link-port channel
  linkport/     reusable byte-level link adapter
  printer/      Game Boy Printer, paper model, printer worker
  export/       BMP/PDF/PNG/print
  ui/           template, styles, icons, sound
tests/          Node tests + Playwright e2e
vendor/mgba/    mGBA WebAssembly build (MPL-2.0)
vendor/gbajs/   stock GBA.js for the standalone link-port module (BSD-2-Clause)
```

## Limitations

- mGBA is accurate for GBScribe's needs, but the browser build trades desktop
  peripherals for a single GPIO link-port channel and wall-clock printer timing.
- The demo needs cross-origin isolation (`COOP: same-origin` and
  `COEP: require-corp`) for its WebAssembly threads. The bundled service worker
  adds the headers on static hosts that cannot set them.
- The printer's motor timing is wall-clock based for a pleasant demo, not
  cycle-accurate hardware timing. Serial timing is driven by GBScribe's own
  TM2 delays.
- The demo roll is 4,000 dot rows (~95 cm) so paper replacement is reachable.
  A real roll is longer.
- Print density/exposure is parsed but the visible burn is currently fixed.
- Audio starts only after a user gesture, per browser policy.
- Saves are browser-local; clearing site data removes them. Printed pages share
  the browser's local-storage quota, so very large page histories can hit the
  quota and show a warning.
- Rejecting storage removes the demo's local data and keeps every feature
  available for the current visit, but nothing is restored next time.

## Legal

GBScribe and AdvancePrint ? Scott Ratchford 2026. GBScribe and AdvancePrint are free software, licensed under the [MIT License](LICENSE.md).

mGBA © 2013–2025 Jeffrey Pfau and contributors, licensed under the [Mozilla Public License 2.0](LICENSES/mgba-MPL-2.0.txt).

Press Start 2P font, SIL Open Font License 1.1; see
[`assets/fonts/OFL.txt`](assets/fonts/OFL.txt).

The GBA and printer photographs are the project author's own hardware photos,
cut out for the browser shells; see [`assets/img/README.md`](assets/img/README.md).

Third-party notices are collected in [`LICENSES/`](LICENSES/).

Not affiliated with, endorsed by, or sponsored by Nintendo. Game Boy, Game Boy
Color, Game Boy Advance, and Game Boy Printer are trademarks of Nintendo. “QR
Code” is a registered trademark of DENSO WAVE Incorporated.

## References

1. [GBScribe](https://github.com/KyberCritter/GBScribe) and
   [AdvancePrint](https://github.com/KyberCritter/AdvancePrint) by Scott Ratchford
2. [Pan Docs — Game Boy Printer](https://gbdev.io/pandocs/Gameboy_Printer.html)
3. [GBATEK — GBA link port / RCNT](https://problemkaputt.de/gbatek.htm)
4. [mGBA](https://github.com/mgba-emu/mgba) by Jeffrey Pfau and contributors
5. [shonumi — In Depth: The Game Boy Printer](https://shonumi.github.io/articles/art2.html)
6. [gba-link-connection](https://github.com/afska/gba-link-connection) by afska
7. [Game Boy Printer on Wikipedia](https://en.wikipedia.org/wiki/Game_Boy_Printer)
