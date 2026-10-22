#!/usr/bin/env python3
"""Turn the supplied hardware photos into the browser cutout assets.

Requires: pillow, rembg, onnxruntime

    python tools/prepare-assets.py \
      --gba .scratchwork/reference/user-uIBWG9-0.jpg \
      --printer .scratchwork/reference/user-uIBWG9-1.jpg

Outputs assets/img/gba.png, gba.webp, printer.png, printer.webp.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw
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
    """Replace the photo's short paper leader with a clean slot opening."""
    draw = ImageDraw.Draw(image)
    scale = image.width / 700
    # Clone a text-free black-band slice over the leader.
    patch = image.crop(
        (
            round(120 * scale),
            round(600 * scale),
            round(600 * scale),
            round(620 * scale),
        )
    ).resize((round(480 * scale), round(82 * scale)))
    image.paste(patch, (round(120 * scale), round(500 * scale)))
    # Pale lip, dark exit, lower lip.
    draw.rounded_rectangle(
        (round(126 * scale), round(514 * scale), round(596 * scale), round(530 * scale)),
        radius=max(1, round(3 * scale)),
        fill=(205, 197, 183, 255),
        outline=(105, 98, 88, 255),
        width=1,
    )
    draw.rectangle(
        (round(134 * scale), round(530 * scale), round(588 * scale), round(548 * scale)),
        fill=(8, 8, 9, 255),
    )
    draw.rectangle(
        (round(126 * scale), round(548 * scale), round(596 * scale), round(556 * scale)),
        fill=(104, 97, 87, 255),
    )


def save(image: Image.Image, stem: str) -> None:
    image.save(OUT / f"{stem}.png")
    image.save(OUT / f"{stem}.webp", "WEBP", quality=92, method=6)
    print(f"{stem}: {image.width}x{image.height}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gba", type=Path, default=ROOT / ".scratchwork/reference/user-uIBWG9-0.jpg")
    parser.add_argument("--printer", type=Path, default=ROOT / ".scratchwork/reference/user-uIBWG9-1.jpg")
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    gba = cutout(args.gba, 1200)
    save(gba, "gba")

    printer = cutout(args.printer, 700)
    empty_printer_slot(printer)
    save(printer, "printer")


if __name__ == "__main__":
    main()
