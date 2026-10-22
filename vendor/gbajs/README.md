# GBA.js (vendored)

Source: https://github.com/endrift/gbajs

- Commit: `0cf0ac7d624eaae032e19ba2f154e0ae1ce73796`
- License: BSD-2-Clause (see [`COPYING`](COPYING))
- Files: `js/` and `resources/bios.bin` are unmodified.

The Game Boy Printer/GPIO support is **not** patched into these files. It is
installed at runtime by [`../../src/linkport/gba-linkport.js`](../../src/linkport/gba-linkport.js),
so the vendored emulator can be updated independently and the link-port layer
can be reused in another project.
