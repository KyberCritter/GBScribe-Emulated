# Reuse examples

## `gb-printer-bytes.mjs`

A complete Game Boy Camera-sized print without GBA.js or a browser UI:

```sh
npm run example:bytes
```

It sends a 160×144 checkerboard through the DMG byte-level serial protocol
(`ByteLinkAdapter`), arms the printer buffer, prints, and renders the 144 dot
rows in the terminal. This is the same `GBPrinterDevice` used by the browser
demo, and the same packet stream a GB/GBC emulator would produce.

## Import paths

The package exposes the reusable layers:

```js
import { installGbaLinkPort, GBPrinterDevice, ByteLinkAdapter } from
  './src/linkport/index.js';

// or, if the package is linked/installed:
import { installGbaLinkPort, GBPrinterDevice } from 'gbscribe-emulated/linkport';
```

## GBA.js in three lines

```js
installGbaLinkPort();
const gba = new GameBoyAdvance();
gba.sio.attachDevice(new GBPrinterDevice());
```

The printer is preserved across `gba.setRom()` / `reset()`; the cable stays
plugged in while the pin state resets.

See [`../docs/linkport.md`](../docs/linkport.md) for the full pin/device
contract and the GB/GBC `SB`/`SC` integration.
