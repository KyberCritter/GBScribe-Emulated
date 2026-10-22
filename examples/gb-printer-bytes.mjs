/**
 * Reuse example: print a 160x144 Game Boy Camera-sized image through the
 * byte-level adapter, with no GBA.js and no browser UI.
 *
 *   node examples/gb-printer-bytes.mjs
 *
 * The same GBPrinterDevice also accepts pin-level clock/getSOUT calls from the
 * GBA.js GPIO shim. This script models a GB/GBC emulator's SB/SC transfers.
 */

import { ByteLinkAdapter } from '../src/linkport/byte-link.js';
import { CMD, GBPrinterDevice } from '../src/printer/gb-printer.js';

let now = 0;
const printer = new GBPrinterDevice({
  now: () => now,
  printSpeed: 1,
  feedSpeed: 1,
  onEvent(event) {
    if (event.type === 'row' && event.kind === 'print') printRow(event.shades);
  },
});

const cable = new ByteLinkAdapter(printer);

function packet(cmd, payload = new Uint8Array()) {
  const bytes = [0x88, 0x33, cmd, 0, payload.length & 0xff, payload.length >> 8, ...payload];
  let sum = 0;
  for (let i = 2; i < bytes.length; i++) sum = (sum + bytes[i]) & 0xffff;
  bytes.push(sum & 0xff, sum >> 8, 0, 0);
  return Uint8Array.from(bytes);
}

function send(bytes) {
  for (const byte of bytes) cable.transferByte(byte);
}

let rowNumber = 0;
function printRow(shades) {
  // Render a coarse preview in the terminal.
  let line = '';
  for (let x = 0; x < 160; x += 4) {
    const value = shades[x];
    line += value === 0 ? ' ' : value === 1 ? '.' : value === 2 ? '+' : '#';
  }
  console.log(String(rowNumber++).padStart(3, '0'), line);
}

// A 160x144 checkerboard/ramp, in GB 2bpp tile order.
const image = new Uint8Array(5760);
for (let y = 0; y < 144; y++) {
  for (let x = 0; x < 160; x += 8) {
    const tile = Math.floor(y / 8) * 20 + x / 8;
    const row = y % 8;
    const shade = ((x / 8 + Math.floor(y / 8)) % 4) | 0;
    const offset = tile * 16 + row * 2;
    image[offset] = shade & 1 ? 0xff : 0x00;
    image[offset + 1] = shade & 2 ? 0xff : 0x00;
  }
}

for (let offset = 0; offset < image.length; offset += 640) {
  send(packet(CMD.DATA, image.subarray(offset, offset + 640)));
}
send(packet(CMD.DATA)); // arm buffer
send(packet(CMD.PRINT, Uint8Array.from([1, 0x13, 0xe4, 0x40])));

for (let i = 0; i < 200; i++) {
  now += 100;
  printer.update(now);
}

console.log(`\nPrinted ${rowNumber} dot rows. roll=${printer.rollRows}`);
if (rowNumber !== 144) process.exitCode = 1;
