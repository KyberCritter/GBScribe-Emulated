# Testing

## Commands

```sh
npm install
npm test                 # Node unit tests
npm run test:e2e         # Playwright, Chromium
npm run test:all         # both
```

`npm run test:e2e` starts `tests/e2e/server.mjs` on port 8099 unless a server
is already running there. The server serves the repository with the correct MIME
types for `.gba`, `.woff2`, and ES modules.

## Unit coverage

`tests/printer.test.js`

- INQUIRY keepalive/status
- DATA → empty DATA → PRINT state machine
- margin/feed rows, paper consumption, roll depletion/jam
- PRINT before ARM is ignored
- checksum error is reported in status
- 2bpp bitplane decoding
- RLE expansion
- multi-copy prints
- `ByteLinkAdapter`
- a full GB Camera-sized 160x144 image through the byte adapter

`tests/paper.test.js`

- rows are centered in the 281-dot paper with 160-dot print width
- blank feed rows, tear labels, page ordering/removal
- RGBA rendering and palette

`tests/export.test.js`

- BMP header/dimensions/bottom-up pixel data
- multi-page PDF, 281-dot 2-bit image streams, physical page width
- empty export rejection

`tests/persistence.test.js`

- consent accepted/rejected decisions
- JSON reads and writes only when accepted
- rejection clearing demo keys and `com.endrift.gbajs.*` saves while keeping
  the consent choice

`tests/paper.test.js` also round-trips detached pages and the current sheet
through the persistence format.

## Playwright coverage

`tests/e2e/core.spec.js`

- boot + printer detection
- GBA power LED alignment with the photographed socket, circular shape, and
  radial specular highlight
- printer starts ON, switch disconnects/reconnects it, and GBScribe reports disconnected/OK
- guided test print, paper rendering, tear, PNG download, and per-page delete
- drag-to-tear, feed hit-zone alignment, hold-to-feed without text selection,
  roll replacement, cover, power cycle + disconnection
- printer shake animation stays off while idle and is cleared when a feed finishes
- PNG/BMP/PDF downloads and browser print popup
- title menu inventory

`tests/e2e/gbscribe.spec.js`

- text editor: typing, backspace, L+arrow caret, four keyboard layers,
  save-slot data, wrap setting, new/load, print
- drawing: pencil, eraser, line, rect, stamp, palette, save/load/clear, print,
  drawing menu
- credits/legal/QR print, instructions paging, and print-confirm cancel,
  About/Instructions from the editor menu
- Konami Easter egg debug menu and print path
- title-screen load of a saved document after reset
- uppercase/symbol/shape keyboard layers
- Resume and Drawing mode routing
- mobile layout: stacking, no overflow, image loading, on-screen Start, and the
  cable running off the component instead of a “Link Cable” chip

`tests/e2e/cookies.spec.js`

- first-load cookie and local-storage policy, including the no-server and
  every-feature-works-without-cookies statements
- accept restores printed pages and the current paper strip after reload
- reject keeps the demo working but writes no pages, bindings, or emulator save
- accepted remapped controls persist across reload
- accepted GBScribe FLASH save persists and loads from the title screen

`tests/e2e/guide.spec.js`

- first-load **Would you like to view a guide?** prompt and Yes/No choice
- eight-step tour: Start, mode select, writing controls, menu print entry,
  print confirmation, paper, tear, and export
- on a phone viewport in portrait, an extra first step recommends rotating the
  device horizontally for the GBA
- each step waits for a click or key press before the guide performs the
  highlighted action and moves on
- the tutorial prints and tears a real sheet, then leaves the export controls
  enabled
- **End tutorial** stops the overlay and leaves the demo usable
- completed and skipped guide states suppress the prompt after reload

`tests/e2e/linkport.spec.js`

- GPIO shim with a fake device: clock count, SOUT → SI, attach/detach,
  idempotent install
- remappable keyboard binding, on-screen Start pointer press, labeled Reset
  controls action
- printer over the byte-level adapter

The e2e tests use GBScribe's actual BG text map and FLASH save buffer through
the emulator. Helpers live in `tests/e2e/helpers.js`; they include a replica of
the ROM's keyboard navigation for deterministic typing.

## Notes

- Playwright runs a single worker because the WebAssembly core is CPU-bound.
- The guide demo takes ~25–30 seconds because GBScribe bit-bangs the printer at
  the real 8192 Hz rate.
- Screenshots on failure are written to `test-results/` (gitignored).
- Reference photos and design notes live in `.scratchwork/` (gitignored) and are
  not part of the published site.
