#!/usr/bin/env bash
# Rebuild GBScribe from upstream master with the devkitPro Docker image.
# Usage: tools/build-rom.sh [path-to-GBScribe-checkout]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="${1:-$ROOT/reference/GBScribe}"

if [ ! -d "$REF/.git" ]; then
  git clone https://github.com/KyberCritter/GBScribe.git "$REF"
fi

# Normalize CRLF if a Windows checkout wrote shell/Make files that way.
for f in build.sh Makefile; do
  if [ -f "$REF/$f" ]; then
    sed -i 's/\r$//' "$REF/$f"
  fi
done

(cd "$REF" && ./build.sh)
cp "$REF/GBScribe.gba" "$ROOT/assets/roms/GBScribe.gba"
git -C "$REF" rev-parse HEAD > "$ROOT/assets/roms/GBScribe.commit"
sha256sum "$ROOT/assets/roms/GBScribe.gba" | awk '{print toupper($1)}' > "$ROOT/assets/roms/GBScribe.sha256"
echo "Built $(cat "$ROOT/assets/roms/GBScribe.sha256")"
