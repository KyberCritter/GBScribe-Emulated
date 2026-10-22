# Adding the demo to a GitHub Pages / Jekyll blog

## Option A — custom element (recommended)

Copy the project folder into your site's assets so the relative paths stay
intact:

```txt
assets/gbscribe-emulated/
  index.html
  src/
  vendor/
  assets/
```

In a post, include:

```html
<div id="gbscribe-demo"></div>
<script type="module"
        src="/assets/gbscribe-emulated/src/gbscribe-demo.js"></script>
```

The module defines `<gbscribe-emulator>` and replaces the placeholder on load.
All UI styles live in a Shadow DOM, so the blog theme cannot leak in and the
demo cannot restyle the page.

You can skip the placeholder and use the element directly:

```html
<gbscribe-emulator
  rom-url="/assets/gbscribe-emulated/assets/roms/GBScribe.gba">
</gbscribe-emulator>
<script type="module"
        src="/assets/gbscribe-emulated/src/gbscribe-demo.js"></script>
```

The first-load guide question can be skipped per embed with
`guide-prompt="false"`. A page can also append `?guide=0` to its URL. Users can
still replay the tour from the **Guide** button.

Supported attributes:

| Attribute | Default |
| --- | --- |
| `rom-url` | `../assets/roms/GBScribe.gba` relative to the module |
| `bios-url` | `../vendor/gbajs/resources/bios.bin` |
| `vendor-base` | `../vendor/gbajs/js/` |
| `font-url` | `../assets/fonts/PressStart2P-Regular.woff2` |
| `guide-prompt` | `true`; set to `false` to skip the first-load guide question |

## Option B — iframe

Useful if the blog strips custom elements or module scripts:

```html
<iframe src="/assets/gbscribe-emulated/index.html"
        title="GBScribe and Game Boy Printer"
        style="width:100%;height:1100px;border:0"
        loading="lazy"></iframe>
```

## Jekyll include

Create `_includes/gbscribe-demo.html`:

```html
<div id="gbscribe-demo"></div>
<script type="module"
        src="{{ '/assets/gbscribe-emulated/src/gbscribe-demo.js' | relative_url }}"></script>
```

and put `{% include gbscribe-demo.html %}` in the post.

## Local saved data and consent

On first load the demo asks whether it may save data locally. Nothing is sent
to a server. With **Accept**, the demo keeps control bindings, sound preference,
printed pages, guide progress, and the GBScribe FLASH save in the browser's
`localStorage`. With **Reject**, those writes are disabled and existing demo
keys are cleared. The choice itself is remembered locally so the policy does not
reappear on every visit.

Because storage is origin-scoped, the demo must be served from the same origin
and path as the page that should restore it. To reset a visitor's choice, use
the **Privacy settings** button in **How it works**, or clear the site's local
storage in the browser. The test helper uses `?cookies=missing` to exercise the
first-load notice and `?cookies=reject` for the rejected path.

## Content Security Policy

The demo needs:

- `script-src 'self'` — module + vendored scripts;
- `style-src 'self' 'unsafe-inline'` — the component injects scoped styles;
- `font-src 'self'` — Press Start 2P;
- `img-src 'self' data:` — exported paper previews;
- `media-src` none; no workers; no remote origins.

## Caching and MIME types

Serve `.gba` as `application/octet-stream` (or any binary type). The ROM is
~82 KB, the font ~12 KB, and the emulator ~300 KB uncompressed. GitHub Pages
sets the JavaScript MIME type automatically. The test server includes the
same headers.

## Updating the ROM

Replace `assets/roms/GBScribe.gba` with a fresh build. No code changes are
needed unless the ROM's printer protocol changes. Keep the MIT license and
provenance notes in `assets/roms/README.md`.
