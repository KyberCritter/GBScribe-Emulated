# Turning the hardware photos into browser assets

The GBA and printer shells are the photographs supplied for the project, not
CSS drawings. The build keeps the photos as images and composites the live
emulator/paper into them.

## 1. Keep the originals out of git

The uploads are copied into `.scratchwork/reference/issue5/` (gitignored):

```txt
gba.jpg          front-on crimson GBA
printer-off.jpg  front-on Game Boy Printer, power off
printer-on.jpg   the same printer powered on (rotated 90°; reference only)
```

The images are the project author's own photographs. The published cutouts are
in `assets/img/` with attribution in `assets/img/README.md`.

## 2. Cut out the devices

`tools/prepare-assets.py` runs the conversion with
[`rembg`](https://github.com/danielgatis/rembg):

```sh
python -m pip install pillow rembg onnxruntime
python tools/prepare-assets.py \
  --gba .scratchwork/reference/issue5/gba.jpg \
  --printer .scratchwork/reference/issue5/printer-off.jpg
```

The pipeline is:

1. Load the JPEG and convert to RGBA.
2. `rembg.remove()` produces an alpha matte for the device.
3. `getbbox()` crops away the transparent wall/table.
4. Resize to a web-friendly width (GBA 1200 px, printer 700 px).
5. Write both `gba.png` / `printer.png` and lossy-alpha WebP versions.

The resulting cutouts are 1200×691 (GBA) and 700×1358 (printer). Why both
formats? WebP is what the page loads; the PNG is the higher-quality source for
other uses and for documentation.

## 3. Rebuild the printer's empty slot

The printer photo has a printed paper leader hanging out of the slot. A live
paper strip is overlaid there, so the leader would show through around the
edges and in the empty state. The script clones a text-free slice of the dark
slot interior from just above the leader (x 110–590, y 484–510 in the 700 px
image) down over it (y 508–558). The ribbed platen bar below remains visible,
and the live paper starts at the slot line.

The old pale lip and lower-lip drawing is no longer needed: this photo already
has the dark opening and the ribbed bar.

## 4. Composite the GBA screen

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

## 5. Place the controls

The photo buttons are not redrawn. Transparent buttons sit over them:

| Control | Position in the 1200×691 GBA cutout |
| --- | --- |
| D-pad | left 5%, top 28.7%, width 14.5%, height 24.3% |
| A | left 88.5%, top 31.9%, width 8%, height 13.8% |
| B | left 81.8%, top 43.5%, width 8%, height 13.4% |
| Start | left 16.6%, top 60.6%, width 5.4%, height 5.4% |
| Select | left 16.5%, top 70.4%, width 5.4%, height 5.4% |
| L/R | top edge zones |
| Power LED | centre 81.83%, 16.79%, width 2.7% |
| Link port | synthetic connector at left 37.5%, top edge |

The Start and Select hit zones are larger than the photographed domes for
touch. The top shoulder buttons and the physical link port are cropped out of
this photo, so L/R remain edge zones and the cable connector is still a small
drawn port.

The printer uses the same technique on its 700×1358 cutout:

| Control | Position in the 700×1358 printer cutout |
| --- | --- |
| Roll cover | left 11%, top 1.3%, width 78%, height 33.5% |
| FEED | centre 24.1%, 84.8%; hit zone 25.4% × 14% |
| POWER | left 60%, top 77.8%, width 35%, height 13.6% |
| Status LED | centre 88.9%, 50.2% |
| Link port | right edge, 61% down |
| Paper stage | left 19%, top 1.5%, width 62%, height 42.5% |

The cigarette-style paper strip grows upward from the slot line at the bottom
of the paper stage.


## 6. Measure the print width

The earlier printed-paper close-up shows the printed square at about 443 px on a
paper strip about 780 px wide, so the print is ~57% of the paper. The model uses:

```txt
paper width: 281 dots
print width: 160 dots
offset:       60 dots left, 61 dots right
```

This is applied consistently in the display canvas, PNG/BMP renderer, and PDF
image stream, so on-screen and exported paper match.

## 7. Re-running

`tools/prepare-assets.py` is idempotent and only depends on Pillow + rembg.
The final assets are committed; the source photos are not. If you replace the
photos, rerun the script and adjust the screen/control percentages in
`src/ui/styles.js` and the paper/slot percentages in the same file.
