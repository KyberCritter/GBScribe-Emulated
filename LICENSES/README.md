# Third-party licenses

This project is MIT licensed (see [`../LICENSE.md`](../LICENSE.md)). The
third-party components below are compatible with that choice; none are GNU
copyleft licenses.

| Component | Version / source | License | File |
| --- | --- | --- | --- |
| GBScribe ROM | master `fb78d59` (built from source) | MIT | [`gbscribe-MIT.txt`](gbscribe-MIT.txt) |
| AdvancePrint | protocol/job semantics from the GBScribe printer layer | MIT | [`gbscribe-MIT.txt`](gbscribe-MIT.txt) |
| mGBA | mgba-emu/mgba, compiled to WebAssembly from the wasm platform | MPL-2.0 | [`mgba-MPL-2.0.txt`](mgba-MPL-2.0.txt) |
| SDL 2 | libsdl-org/SDL, statically linked into the WebAssembly build | zlib | [`sdl-zlib.txt`](sdl-zlib.txt) |
| GBA.js | endrift/gbajs, vendored for the reusable link-port module | BSD-2-Clause | [`gbajs-BSD-2-Clause.txt`](gbajs-BSD-2-Clause.txt) |
| Press Start 2P | Google Fonts, latin WOFF2 subset | SIL Open Font License 1.1 | [`press-start-2p-OFL-1.1.txt`](press-start-2p-OFL-1.1.txt) |
| Hardware photos | Supplied by Scott Ratchford | Author's own photographs | [`../assets/img/README.md`](../assets/img/README.md) |

mGBA is distributed under the [Mozilla Public License 2.0](https://github.com/mgba-emu/mgba/blob/master/LICENSE). The vendored
WebAssembly build keeps the upstream license at
[`mgba-MPL-2.0.txt`](mgba-MPL-2.0.txt); the platform wrapper is part of the same
source tree and carries the same notice.

GBA.js is distributed under the 2-clause BSD license, which permits
redistribution and modification provided the copyright notice and disclaimer
are retained. The vendored copy keeps the original `COPYING` file at
[`../vendor/gbajs/COPYING`](../vendor/gbajs/COPYING).

The Game Boy Printer emulator, UI, paper renderer, exporters, and test suite in
this repository are original work for this demo and are MIT licensed.

Game Boy, Game Boy Color, Game Boy Advance, and Game Boy Printer are trademarks
of Nintendo. This project is not affiliated with, endorsed by, or sponsored by
Nintendo.
