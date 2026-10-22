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
| `font-url` | `../assets/fonts/PressStart2P-Regular.woff2` |
| `gba-image` | `../assets/img/gba.webp` |
| `printer-image` | `../assets/img/printer.webp` |
| `guide-prompt` | `true`; set to `false` to skip the first-load guide question |

`bios-url` and `vendor-base` are still accepted for compatibility; the
WebAssembly core is self-contained and does not read either path.

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

- `script-src 'self' 'wasm-unsafe-eval'` — module, vendored core, WebAssembly;
- `style-src 'self' 'unsafe-inline'` — the component injects scoped styles;
- `font-src 'self'` — Press Start 2P;
- `img-src 'self' data:` — exported paper previews;
- `worker-src 'self' blob:` — the emulator threads and the printer worker;
- `connect-src 'self'` — no remote origins.

The core uses shared memory, so the embedding page must be cross-origin
isolated:

```txt
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`index.html` registers `coi-serviceworker.js` to add those headers on static
hosts such as GitHub Pages. An embedder that already serves the headers does not
need it; an embedder that cannot set them must host the demo in an iframe served
with the headers.

## Caching and MIME types

Serve `.gba` as `application/octet-stream` (or any binary type) and `.wasm` as
`application/wasm`. The ROM is ~82 KB, the font ~12 KB, and the WebAssembly core
~2 MB uncompressed. GitHub Pages sets the JavaScript MIME type automatically,
but not `application/wasm`; streaming instantiation falls back to
`ArrayBuffer` if it is missing, so the demo still boots. The test server sends
the same headers and MIME types.

## Updating the ROM

Replace `assets/roms/GBScribe.gba` with a fresh build. No code changes are
needed unless the ROM's printer protocol changes. Keep the MIT license and
provenance notes in `assets/roms/README.md`.
