# Turning the hardware photos into browser assets

The GBA and printer shells are the photographs supplied for the project, not
CSS drawings. The build keeps the photos as images and composites the live
emulator/paper into them.

## 1. Keep the originals out of git

The uploads are copied into `.scratchwork/reference/issue5/` (gitignored):

```txt
gba.jpg          front-on crimson GBA
printer-on.jpg   Game Boy Printer with the switch ON (landscape source)
printer-off.jpg  the same printer with the switch OFF
```

The images are the project author's own photographs. The published cutouts are
in `assets/img/` with attribution in `assets/img/README.md`.

## 2. Cut out the devices

`tools/prepare-assets.py` runs the conversion with
[`rembg`](https://github.com/danielgatis/rembg):

```sh
python -m pip install pillow numpy rembg onnxruntime
python tools/prepare-assets.py \
  --gba .scratchwork/reference/issue5/gba.jpg \
  --printer .scratchwork/reference/issue5/printer-on.jpg \
  --printer-off .scratchwork/reference/issue5/printer-off.jpg
```

The pipeline is:

1. Load the JPEG and convert to RGBA.
2. `rembg.remove()` produces an alpha matte for the device.
3. `getbbox()` crops away the transparent wall/table.
4. Resize to a web-friendly width (GBA 1200 px, printer 700 px).
5. Write both `gba.png` / `printer.png` and lossy-alpha WebP versions.

The resulting cutouts are 1200×691 (GBA) and 700×1356 (printer). Why both
formats? WebP is what the page loads; the PNG is the higher-quality source for
other uses and for documentation.

The printer base comes from the **power-on** photo: its switch is the ON
reference, and the body is the shell used in the page.

## 3. Rebuild the printer's empty slot

The printer photo has a printed paper leader hanging out of the slot. A live
paper strip is overlaid there, so the leader would show through around the
edges and in the empty state. The script clones a text-free slice of the dark
slot interior from just above the leader (x 110–590, y 484–510 in the 700 px
image) down over it (y 508–558). The ribbed platen bar below remains visible,
and the live paper starts at the slot line.

The old pale lip and lower-lip drawing is no longer needed: this photo already
has the dark opening and the ribbed bar.

## 4. Layer the power rocker

Only the power rocker changes between ON and OFF; the printer body must not
swap. The script therefore:

1. Cuts a soft-edged disc around the ON rocker at (504, 1172), radius 54.
2. Paints the rocker socket out of the base shell with a quadratic panel fit,
   so the body has no rocker baked in.
3. Cuts the OFF rocker from the power-off photo at (492, 1178), radius 54, and
   color-matches its surrounding panel to the cleaned base.

`src/ui/template.js` stacks the two 108×108 rocker cutouts over the single
base shell. `.gbs-printer-scene.is-powered` fades the ON rocker in and the OFF
rocker out over 120 ms, with a 2 px horizontal nudge, so the switch flicks
without the body moving or a rectangular patch appearing.

## 5. Composite the GBA screen

The GBA photo is front-on enough that a flat composite works. In the 1200×691
cutout the black screen occupies:

```txt
left:   27.25%
top:    18.52%
width:  44.67%
height: 51.95%
```

`src/ui/template.js` places a `<canvas>` in a `.gbs-screen-mount` at those
percentages. The mount has a black background, rounded corners, a small inset,
and a glossy `::after` highlight. The 240×160 canvas is drawn at 96.8% of the
mount so a thin black bezel remains. No perspective transform is needed for
this photo.

## 6. Place the controls

The photo buttons are not redrawn. Transparent buttons sit over them:

| Control | Position in the 1200×691 GBA cutout |
| --- | --- |
| D-pad | left 6.75%, top 30.25%, width 12.42%, height 21.42% |
| A | left 87%, top 32.3%, width 8%, height 13.8% |
| B | left 77.9%, top 37.7%, width 8%, height 13.4% |
| Start | left 16.72%, top 60.56%, width 5.4%, height 5.4% |
| Select | left 16.55%, top 70.48%, width 5.4%, height 5.4% |
| L/R | rotated oval edge zones following the shoulder line |
| Power LED | centre 81.83%, 16.79%, width 2.7% |
| Link port | synthetic connector at left 37.5%, top edge |

The Start and Select hit zones are larger than the photographed domes for
touch. The top shoulder buttons and the physical link port are cropped out of
this photo, so L/R remain invisible edge zones and the cable connector is still
a small drawn port.

The printer uses the same technique on its 700×1356 cutout:

| Control | Position in the 700×1356 printer cutout |
| --- | --- |
| Roll cover | left 11%, top 1.3%, width 78%, height 33.5% |
| FEED | centre 24.1%, 84.8%; hit zone 25.4% × 14% |
| POWER panel | left 60.7%, top 78.7%, width 21.5%, height 13.1% |
| Rocker ON | left 64.286%, top 82.448%, 108×108 px layer |
| Rocker OFF | left 62.571%, top 82.891%, 108×108 px layer |
| Status LED | centre 88.9%, 50.2% (red) |
| Link port | right edge, 61% down |
| Paper stage | left 19%, top 1.5%, width 62%, height 42.5% |

The cigarette-style paper strip grows upward from the slot line at the bottom
of the paper stage.

## 7. Measure the print width

The earlier printed-paper close-up shows the printed square at about 443 px on a
paper strip about 780 px wide, so the print is ~57% of the paper. The model uses:

```txt
paper width: 281 dots
print width: 160 dots
offset:       60 dots left, 61 dots right
```

This is applied consistently in the display canvas, PNG/BMP renderer, and PDF
image stream, so on-screen and exported paper match.

## 8. Re-running

`tools/prepare-assets.py` is idempotent and only depends on Pillow + rembg.
The final assets are committed; the source photos are not. If you replace the
photos, rerun the script and adjust the screen/control percentages in
`src/ui/styles.js` and the paper/slot percentages in the same file.
