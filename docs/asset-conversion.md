# Turning the hardware photos into browser assets

The GBA and printer shells are the photographs supplied for the project, not
CSS drawings. The build keeps the photos as images and composites the live
emulator/paper into them.

## 1. Keep the originals out of git

The uploads are copied into `.scratchwork/reference/` (gitignored):

```txt
user-uIBWG9-0.jpg  front-on crimson GBA
user-uIBWG9-1.jpg  front-on Game Boy Printer
user-1PRHhr-0.jpg  printed paper close-up (print-width measurement)
```

The images are the project author's own photographs. The published cutouts are
in `assets/img/` with attribution in `assets/img/README.md`.

## 2. Cut out the devices

`tools/prepare-assets.py` runs the conversion with
[`rembg`](https://github.com/danielgatis/rembg):

```sh
python -m pip install pillow rembg onnxruntime
python tools/prepare-assets.py \
  --gba .scratchwork/reference/user-uIBWG9-0.jpg \
  --printer .scratchwork/reference/user-uIBWG9-1.jpg
```

The pipeline is:

1. Load the JPEG and convert to RGBA.
2. `rembg.remove()` produces an alpha matte for the device.
3. `getbbox()` crops away the transparent wall/table.
4. Resize to a web-friendly width (GBA 1200 px, printer 700 px).
5. Write both `gba.png` / `printer.png` and lossy-alpha WebP versions.

Why both formats? WebP is what the page loads; the PNG is the higher-quality
source for other uses and for documentation.

## 3. Rebuild the printer's empty slot

The printer photo has a short printed paper leader hanging out of the slot. A
live paper strip is overlaid there, so the leader would show through around the
edges and in the empty state. The script:

- samples a text-free slice of the black band,
- pastes it over the short leader,
- draws the pale slot lip, the dark opening, and the lower lip.

The live paper starts exactly at the dark opening. This makes the empty state
look like an empty printer and lets the app's own paper supply the output.

## 4. Composite the GBA screen

The GBA photo is front-on enough that a flat composite works. In the 1200×708
cutout the black screen occupies:

```txt
left:   25.7%
top:    17.5%
width:  46.4%
height: 54.0%
```

`src/ui/template.js` places a `<canvas>` in a `.gbs-screen-mount` at those
percentages. The mount has a black background, rounded corners, a small inset,
and a glossy `::after` highlight. The 240×160 canvas is drawn at 96.8% of the
mount so a thin black bezel remains. No perspective transform is needed for
this photo.

## 5. Place the controls

The photo buttons are not redrawn. Transparent buttons sit over them:

| Control | Approx. position in the 1200×708 GBA photo |
| --- | --- |
| D-pad | left 4.6%, top 31%, width 14.8%, height 24.5% |
| A | left 89%, top 32%, width 7.5%, height 13.5% |
| B | left 81.8%, top 34%, width 7.5%, height 13.5% |
| Start | left 18%, top 60.5%, width 5.5%, height 7% |
| Select | left 18%, top 67%, width 5.5%, height 7% |
| L/R | top edge zones |
| Link port | top edge, moved left as requested |

The printer uses the same technique at the FEED, POWER, and roll-cover regions
of its 700×1328 cutout. The paper stage starts at the dark slot opening.

## 6. Measure the print width

The close-up shows the printed square at about 443 px on a paper strip about
780 px wide, so the print is ~57% of the paper. The model uses:

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
