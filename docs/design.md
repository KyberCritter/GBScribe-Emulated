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
- Red POWER LED centered in the photographed socket at 84.08% / 18.36% of the
  shell image. It is a 1.35%-wide circle with a radial specular highlight, so it
  reads as a glossy LED at every responsive size.
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
  lower left, and gray POWER slider with ON/OFF at the lower right. The FEED
  hit zone is centered on the photographed button at 24.5% / 86.9% of the
  printer image.
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

The paper exits the white slot and moves upward over the printer front. Its
bottom stays at the slot while the free top edge grows upward; new rows appear
at the bottom. The output viewport auto-follows the newest row, and the tear tab
is on the free top edge (scissors are always available).

## Link Cable

The cable is an SVG path computed from the real DOM rectangles of the GBA
top port and printer right port. It leaves the GBA upward, arcs over the gap,
and enters the printer on its right side. At widths below 1040 px the cable is
replaced by a compact “Link Cable” chip between the stacked devices.

## Guided tour

The guide is a fixed overlay inside the component's Shadow DOM. It dims the
page with a large `box-shadow` around a transparent hole, adds pulsing rings
around each target, and places a callout with an arrow beside the target. Target
rectangles come from the live DOM, so they follow the responsive layout; the
in-game **Print document** step computes its rectangle from the 30x20 BG text
grid inside the 240x160 canvas.

The guide is a step machine, not a scripted video. Each step highlights its
controls and waits. On a tap, click, or key press, the guide performs that step's
action through the same `pressButton()` path as the on-screen controls, waits
for the emulator or printer to finish, then reveals the next step. This keeps
the highlighted controls and the emulated state in sync. The steps are:

1. Start on the title screen.
2. D-pad selection and A confirmation in the mode chooser.
3. The writing controls after entering the text editor.
4. Start to open the document menu.
5. The **Print document** entry in that menu.
6. A to confirm the print.
7. The tear tab and scissors.
8. The PNG, BMP, PDF, and Print export bar.

**End tutorial** stays in the viewport's top right while the guide is active.
The guide can be replayed from the header **Guide** button. Embeds can suppress
the first-load question with the `guide-prompt="false"` attribute, and tests use
`?guide=0`.

## Responsive behavior

- Desktop: printer left, GBA right, cable between.
- Tablet/phone: stacked GBA → Link Cable chip → printer.
- The paper remains an overlay on the printer at all sizes; feed/power stay
  outside the paper width.
