# GBScribe.gba

The ROM in this directory is built from the upstream GBScribe source, not a
third-party download.

| Field | Value |
| --- | --- |
| Source | https://github.com/KyberCritter/GBScribe |
| Branch | `master` |
| Commit | `fb78d59413e70ad901b725425bb2b25ba49082c0` |
| Commit date | 2026-10-10 |
| Build | `devkitpro/devkitarm:latest` Docker image via `./build.sh` |
| Size | 82,100 bytes |
| SHA-256 | `8A1E7981065CBC9291EA0FE491BE2457560178A52F09C69D5F955D7C02BD061E` |
| License | MIT (GBScribe, Scott Ratchford) |

The latest release tag at the time of writing is `v0.3`; this build is from
`master`, which is the branch requested for the demo and includes the MIT
license/protocol cleanup commits.

Rebuild with `tools/build-rom.sh` or:

```sh
git clone https://github.com/KyberCritter/GBScribe.git reference/GBScribe
cd reference/GBScribe
./build.sh
cp GBScribe.gba ../../assets/roms/GBScribe.gba
```

The ROM is loaded by the page via `fetch`; it is never uploaded anywhere.

GBScribe is © Scott Ratchford and is licensed under the MIT License. See
[`../../LICENSE.md`](../../LICENSE.md).
