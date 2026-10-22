# Design notes

The in-browser shells are the hardware photos supplied during the project,
cut out from their backgrounds and used directly:

- `assets/img/gba.png` / `gba.webp` — front-on crimson GBA; the original screen
  is replaced by the live 240×160 canvas.
- `assets/img/printer.png` / `printer.webp` — front-on Game Boy Printer; the
  short paper leader is removed and the live paper overlays the white slot.

The original uploads are kept in `.scratchwork/reference/` (uncommitted) for
comparison.

## GBA

- Translucent crimson original-GBA shell, white/cream screen bezel.
- White D-pad on the left, white A/B on the right.
- Two small white Start/Select buttons under the D-pad, with tiny labels for
  accessibility.
- Red POWER LED at the top right.
- Speaker grille at the bottom right.
- Link Cable port on the **top edge**, right of centre.
- The real 240×160 emulator canvas is inset in a dark screen frame inside the
  white bezel.

## Game Boy Printer

- Portrait beige body, approximately 0.72 width/height.
- Smoked translucent paper-roll cover at the top; roll and core visible.
- Black brand band below the cover with the white “GAME BOY printer” wordmark
  and status/battery LEDs.
- **White paper slot** at the top of the black band is the paper exit.
- Beige front with an embossed Nintendo oval, red circular FEED button at the
  lower left, and gray POWER slider with ON/OFF at the lower right.
- Link Cable port on the **right side**.

## Paper and print width

The print photo measures a printed area of about 443 px on a paper strip of
about 780 px, so the print is **~57% of the paper width**. The model uses:

```txt
paper width: 281 dots
print width: 160 dots
left margin:  60 dots
right margin: 61 dots
```

The paper exits the white slot and hangs down over the printer front. Its top
remains at the slot while new rows appear at the bottom; the output viewport
auto-follows the newest row and exposes the tear tab.

## Link Cable

The cable is an SVG path computed from the real DOM rectangles of the GBA
top port and printer right port. It leaves the GBA upward, arcs over the gap,
and enters the printer on its right side. At widths below 1040 px the cable is
replaced by a compact “Link Cable” chip between the stacked devices.

## Responsive behavior

- Desktop: printer left, GBA right, cable between.
- Tablet/phone: stacked GBA → Link Cable chip → printer.
- The paper remains an overlay on the printer at all sizes; feed/power stay
  outside the paper width.
