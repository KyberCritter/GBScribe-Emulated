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

# The POWER control is the whole rounded cap around its circular bump: the cap
# carries the POWER label and rocks as one piece. Boxes are measured in the
# 700x1356 printer cutout, from the power-on and power-off photos.
SWITCH_ON_BOX = (448, 1071, 568, 1248)
SWITCH_OFF_BOX = (429, 1071, 548, 1249)
SWITCH_RADIUS = 7
SWITCH_FEATHER = 2
# The exposed ribbed track left of the ON cap, mirrored into the right side of
# the recess that the cap uncovers when it slides left to OFF.
SWITCH_TRACK_BOX = (428, 1064, 447, 1254)
SWITCH_TRACK_TARGET = (549, 1064)


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
    """Paint the cap's socket out of the shell so the cap can move on top."""
    rgba = np.asarray(image.convert("RGBA")).astype(float)
    source = rgba[:, :, :3]
    original_alpha = rgba[:, :, 3].copy()
    x0, y0, x1, y1 = SWITCH_ON_BOX
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        (x0, y0, x1 - 1, y1 - 1), radius=SWITCH_RADIUS, fill=255
    )
    hole = np.asarray(mask) > 0

    pad = 16
    ring_mask = Image.new("L", image.size, 0)
    ring_draw = ImageDraw.Draw(ring_mask)
    ring_draw.rectangle((x0 - pad, y0 - pad, x1 + pad, y1 + pad), fill=255)
    ring_draw.rectangle((x0 - 3, y0 - 3, x1 + 3, y1 + 3), fill=0)
    ring = (np.asarray(ring_mask) > 0) & (original_alpha > 240)

    ys, xs = np.nonzero(ring)
    design = np.vstack([np.ones_like(xs), xs, ys, xs * ys, xs * xs, ys * ys]).T.astype(float)
    my, mx = np.nonzero(hole)
    fill_design = np.vstack([np.ones_like(mx), mx, my, mx * my, mx * mx, my * my]).T.astype(float)

    filled = source.copy()
    for channel in range(3):
        coefficients, *_ = np.linalg.lstsq(design, source[ys, xs, channel], rcond=None)
        filled[my, mx, channel] = fill_design @ coefficients

    alpha = Image.fromarray(hole.astype(np.uint8) * 255).filter(
        ImageFilter.GaussianBlur(SWITCH_FEATHER + 1)
    )
    feather = np.asarray(alpha).astype(float)[:, :, None] / 255.0
    blended = source * (1 - feather) + filled * feather
    result = np.dstack([np.clip(blended, 0, 255), original_alpha]).astype(np.uint8)
    return Image.fromarray(result, "RGBA")


def add_switch_track(image: Image.Image) -> None:
    """Mirror the exposed ribbed track into the right side of the recess."""
    x0, y0, x1, y1 = SWITCH_TRACK_BOX
    track = image.crop((x0, y0, x1, y1)).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    image.alpha_composite(track, SWITCH_TRACK_TARGET)


def switch_cutout(
    image: Image.Image,
    box: tuple[int, int, int, int],
    size: tuple[int, int] | None = None,
) -> Image.Image:
    """Cut the whole switch cap with a soft rounded-rectangle edge."""
    crop = image.crop(box).convert("RGBA")
    if size:
        crop = crop.resize(size, Image.LANCZOS)
    width, height = crop.size
    mask = Image.new("L", crop.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        (0, 0, width - 1, height - 1), radius=SWITCH_RADIUS, fill=255
    )
    mask = mask.filter(ImageFilter.GaussianBlur(SWITCH_FEATHER))
    crop.putalpha(mask)
    return crop


def match_panel(
    crop: Image.Image,
    source_image: Image.Image,
    base_image: Image.Image,
) -> Image.Image:
    """Color-match the off cap to the cleaned base's panel."""
    sx0, sy0, sx1, sy1 = SWITCH_OFF_BOX
    bx0, by0, bx1, by1 = SWITCH_ON_BOX
    pad = 12
    source = np.asarray(source_image.convert("RGB")).astype(float)
    target = np.asarray(base_image.convert("RGB")).astype(float)
    out = np.asarray(crop.convert("RGB")).astype(float)

    source_ring = np.zeros(source.shape[:2], bool)
    source_ring[sy0 - pad:sy1 + pad, sx0 - pad:sx1 + pad] = True
    source_ring[sy0 - 2:sy1 + 2, sx0 - 2:sx1 + 2] = False
    base_ring = np.zeros(target.shape[:2], bool)
    base_ring[by0 - pad:by1 + pad, bx0 - pad:bx1 + pad] = True
    base_ring[by0 - 2:by1 + 2, bx0 - 2:bx1 + 2] = False

    for channel in range(3):
        src_mean = source[source_ring, channel].mean()
        dst_mean = target[base_ring, channel].mean()
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
    # position. Keep its whole POWER cap as a layer, then paint the cap's
    # socket out of the base so only the switch has to move between states.
    printer = cutout(args.printer, 700, rotate=-90)
    empty_printer_slot(printer)
    switch_on = switch_cutout(printer, SWITCH_ON_BOX)
    printer_base = remove_switch(printer)
    add_switch_track(printer_base)
    save(printer_base, "printer")
    save(switch_on, "printer-switch-on")

    printer_off = cutout(args.printer_off, 700)
    printer_off = printer_off.resize(printer.size, Image.LANCZOS)
    empty_printer_slot(printer_off)
    switch_off = switch_cutout(printer_off, SWITCH_OFF_BOX, switch_on.size)
    switch_off = match_panel(switch_off, printer_off, printer_base)
    save(switch_off, "printer-switch-off")


if __name__ == "__main__":
    main()
