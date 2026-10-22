# mGBA (vendored)

Source: https://github.com/thenick775/mgba (branch `feature/wasm`)

Upstream: https://github.com/mgba-emu/mgba

- License: MPL-2.0 (see [`../../LICENSES/mgba-MPL-2.0.txt`](../../LICENSES/mgba-MPL-2.0.txt))
- Files: `mgba.js` and `mgba.wasm` are built from `src/platform/wasm` with
  [`../../tools/mgba-wasm.patch`](../../tools/mgba-wasm.patch) applied.
- Build: see "Rebuilding the emulator core" in
  [`../../README.md`](../../README.md).

The patch adds the `RCNT` link-port channel, the FLASH1M save type override,
and the save/memory exports the demo uses. The rest of the core is unchanged.
