#!/usr/bin/env python3
"""Turn the supplied hardware photos into the browser cutout assets.

Requires: pillow, numpy, rembg, onnxruntime

    python tools/prepare-assets.py \
      --gba .scratchwork/reference/issue5/gba.jpg \
      --printer .scratchwork/reference/issue5/printer-on.jpg \
      --printer-off .scratchwork/reference/issue5/printer-off.jpg

Outputs assets/img/gba.png, gba.webp, printer.png, printer.webp, and the
printer-switch-on/off cutouts.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import remove

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"

# Rocker positions in the 700x1356 printer cutout, measured from the on and
# off photos. The cleaned base keeps the panel; only these discs are layered.
SWITCH_ON = (504, 1172)
SWITCH_OFF = (492, 1178)
SWITCH_RADIUS = 54
SWITCH_MASK_RADIUS = 50


def cutout(source: Path, width: int, rotate: int = 0) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    if rotate:
        image = image.rotate(rotate, expand=True)
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


def remove_switch(image: Image.Image) -> Image.Image:
    """Fill the rocker's socket with the surrounding panel before layering."""
    rgba = np.asarray(image.convert("RGBA")).astype(float)
    source = rgba[:, :, :3]
    original_alpha = rgba[:, :, 3].copy()
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    cx, cy = SWITCH_ON
    r = SWITCH_MASK_RADIUS
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    hole = np.asarray(mask) > 0

    ring_mask = Image.new("L", image.size, 0)
    ring_draw = ImageDraw.Draw(ring_mask)
    ring_draw.ellipse((cx - r - 14, cy - r - 14, cx + r + 14, cy + r + 14), fill=255)
    ring_draw.ellipse((cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2), fill=0)
    ring = np.asarray(ring_mask) > 0

    ys, xs = np.nonzero(ring)
    design = np.vstack([np.ones_like(xs), xs, ys, xs * ys, xs * xs, ys * ys]).T.astype(float)
    my, mx = np.nonzero(hole)
    fill_design = np.vstack([np.ones_like(mx), mx, my, mx * my, mx * mx, my * my]).T.astype(float)

    filled = source.copy()
    for channel in range(3):
        coefficients, *_ = np.linalg.lstsq(design, source[ys, xs, channel], rcond=None)
        filled[my, mx, channel] = fill_design @ coefficients

    alpha = Image.fromarray(hole.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(5))
    feather = np.asarray(alpha).astype(float)[:, :, None] / 255.0
    blended = source * (1 - feather) + filled * feather
    result = np.dstack([np.clip(blended, 0, 255), original_alpha]).astype(np.uint8)
    return Image.fromarray(result, "RGBA")


def rocker_cutout(image: Image.Image, center: tuple[int, int], radius: int = SWITCH_RADIUS) -> Image.Image:
    """Cut a soft-edged disc around the rocker and its shadow."""
    cx, cy = center
    crop = image.crop((cx - radius, cy - radius, cx + radius, cy + radius))
    size = crop.size
    inset = 6
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((inset, inset, size[0] - inset - 1, size[1] - inset - 1), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(inset))
    crop.putalpha(mask)
    return crop


def match_panel(
    crop: Image.Image,
    source_image: Image.Image,
    base_image: Image.Image,
    center: tuple[int, int],
) -> Image.Image:
    """Color-match the off rocker to the cleaned base's panel."""
    cx, cy = center
    r = SWITCH_RADIUS
    ring_mask = Image.new("L", source_image.size, 0)
    draw = ImageDraw.Draw(ring_mask)
    draw.ellipse((cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2), fill=255)
    draw.ellipse((cx - r + 10, cy - r + 10, cx + r - 10, cy + r - 10), fill=0)
    ring = np.asarray(ring_mask) > 0

    source = np.asarray(source_image.convert("RGB")).astype(float)
    target = np.asarray(base_image.convert("RGB")).astype(float)
    out = np.asarray(crop.convert("RGB")).astype(float)
    for channel in range(3):
        src_mean = source[ring, channel].mean()
        dst_mean = target[ring, channel].mean()
        gain = dst_mean / src_mean if src_mean > 1 else 1.0
        out[:, :, channel] = np.clip(out[:, :, channel] * gain, 0, 255)

    result = Image.fromarray(out.astype(np.uint8)).convert("RGBA")
    result.putalpha(crop.getchannel("A"))
    return result


def save(image: Image.Image, stem: str) -> None:
    image.save(OUT / f"{stem}.png")
    image.save(OUT / f"{stem}.webp", "WEBP", quality=92, method=6)
    print(f"{stem}: {image.width}x{image.height}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gba", type=Path, default=ROOT / ".scratchwork/reference/issue5/gba.jpg")
    parser.add_argument("--printer", type=Path, default=ROOT / ".scratchwork/reference/issue5/printer-on.jpg")
    parser.add_argument("--printer-off", type=Path, default=ROOT / ".scratchwork/reference/issue5/printer-off.jpg")
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    gba = cutout(args.gba, 1200)
    save(gba, "gba")

    # The first printer photo is landscape and shows the switch in the ON
    # position. Keep its rocker as a layer, then paint the socket out of the
    # base so only the switch has to change between states.
    printer = cutout(args.printer, 700, rotate=-90)
    empty_printer_slot(printer)
    switch_on = rocker_cutout(printer, SWITCH_ON)
    printer_base = remove_switch(printer)
    save(printer_base, "printer")
    save(switch_on, "printer-switch-on")

    printer_off = cutout(args.printer_off, 700)
    printer_off = printer_off.resize(printer.size, Image.LANCZOS)
    empty_printer_slot(printer_off)
    switch_off = rocker_cutout(printer_off, SWITCH_OFF)
    switch_off = match_panel(switch_off, printer_off, printer_base, SWITCH_OFF)
    save(switch_off, "printer-switch-off")


if __name__ == "__main__":
    main()
