/**
 * Reusable link-port + printer entry point.
 *
 * This module intentionally has no dependency on the demo UI or the GBScribe
 * ROM. Copy `src/linkport/` and `src/printer/gb-printer.js` into another
 * browser emulator project, or import the package subpath.
 */

export { attachGbaDevice, installGbaLinkPort } from './gba-linkport.js';
export { ByteLevelLinkPort, ByteLinkAdapter } from './byte-link.js';
export {
  CMD,
  GBPrinterDevice,
  KEEPALIVE,
  STATUS,
  decodeDotRow,
  decompressRle,
  BYTES_PER_DOT_ROW,
  DOT_ROWS_PER_TILE_ROW,
  MAX_BUFFER_BYTES,
  PAPER_FULL_ROLL_ROWS,
} from '../printer/gb-printer.js';
