#!/usr/bin/env python3
"""Turn the supplied hardware photos into the browser cutout assets.

Requires: pillow, rembg, onnxruntime

    python tools/prepare-assets.py \
      --gba .scratchwork/reference/issue5/gba.jpg \
      --printer .scratchwork/reference/issue5/printer-off.jpg

Outputs assets/img/gba.png, gba.webp, printer.png, printer.webp.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image
from rembg import remove

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"


def cutout(source: Path, width: int) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    image = remove(image)
    bbox = image.getbbox()
    if not bbox:
        raise SystemExit(f"No opaque device found in {source}")
    image = image.crop(bbox)
    if image.width > width:
        height = round(image.height * width / image.width)
        image = image.resize((width, height), Image.LANCZOS)
    return image


def empty_printer_slot(image: Image.Image) -> None:
    """Replace the photo's paper leader with a clean slot opening."""
    scale = image.width / 700
    # Clone the dark slot interior from just above the leader over the leader.
    patch = image.crop(
        (
            round(110 * scale),
            round(484 * scale),
            round(590 * scale),
            round(510 * scale),
        )
    ).resize((round(480 * scale), round(50 * scale)))
    image.paste(patch, (round(110 * scale), round(508 * scale)))


def save(image: Image.Image, stem: str) -> None:
    image.save(OUT / f"{stem}.png")
    image.save(OUT / f"{stem}.webp", "WEBP", quality=92, method=6)
    print(f"{stem}: {image.width}x{image.height}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gba", type=Path, default=ROOT / ".scratchwork/reference/issue5/gba.jpg")
    parser.add_argument("--printer", type=Path, default=ROOT / ".scratchwork/reference/issue5/printer-off.jpg")
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    gba = cutout(args.gba, 1200)
    save(gba, "gba")

    printer = cutout(args.printer, 700)
    empty_printer_slot(printer)
    save(printer, "printer")


if __name__ == "__main__":
    main()
