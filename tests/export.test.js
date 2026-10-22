import test from 'node:test';
import assert from 'node:assert/strict';

import { PAPER_WIDTH, PRINT_OFFSET, PaperSheet, renderSheetRgba } from '../src/printer/paper.js';
import { encodeBmp, encodePdf } from '../src/export/exporters.js';

function makeSheet(rows, shade = 3) {
  const sheet = new PaperSheet();
  for (let i = 0; i < rows; i++) sheet.append(new Uint8Array(160).fill(shade));
  return sheet;
}

test('BMP has a valid header, dimensions, and bottom-up rows', () => {
  const sheet = makeSheet(3, 3);
  const rgba = renderSheetRgba(sheet, 2);
  const bmp = encodeBmp(rgba);
  const view = new DataView(bmp.buffer, bmp.byteOffset, bmp.byteLength);
  assert.equal(String.fromCharCode(bmp[0], bmp[1]), 'BM');
  assert.equal(view.getUint32(2, true), bmp.length);
  assert.equal(view.getUint32(10, true), 54);
  assert.equal(view.getUint32(18, true), PAPER_WIDTH * 2);
  assert.equal(view.getUint32(22, true), 6);
  assert.equal(view.getUint16(28, true), 24);
  // BMP stores the bottom row first; the left edge is paper white.
  assert.deepEqual(Array.from(bmp.slice(54, 57)), [233, 244, 248]);
  // The centered print area is the dark burn shade.
  const printOffset = 54 + PRINT_OFFSET * 2 * 3;
  assert.deepEqual(Array.from(bmp.slice(printOffset, printOffset + 3)), [28, 32, 36]);
  assert.equal(view.getUint32(34, true), Math.ceil((PAPER_WIDTH * 2 * 3) / 4) * 4 * 6);
});

test('PDF is a multi-page 160-dot document with 2-bit grayscale images', () => {
  const pdf = encodePdf([makeSheet(12, 3), makeSheet(8, 1)]);
  const text = new TextDecoder('latin1').decode(pdf);
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.endsWith('%%EOF\n'));
  assert.match(text, /\/Count 2/);
  assert.match(text, new RegExp(`/Width ${PAPER_WIDTH} /Height 12`));
  assert.match(text, new RegExp(`/Width ${PAPER_WIDTH} /Height 8`));
  assert.match(text, /\/BitsPerComponent 2/);
  assert.match(text, /\/MediaBox \[0 0 107\.7165 /);
  assert.match(text, /\/ColorSpace \/DeviceGray/);
  assert.match(text, /startxref\n\d+\n%%EOF/);
});

test('PDF page height matches the 281-dot paper aspect', () => {
  const pdf = encodePdf([makeSheet(PAPER_WIDTH, 3)]);
  const text = new TextDecoder('latin1').decode(pdf);
  const box = text.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
  assert.ok(box);
  assert.ok(Math.abs(Number(box[1]) - Number(box[2])) < 0.01);
});

test('PDF refuses an empty export', () => {
  assert.throws(() => encodePdf([]), /No printed sheets/);
});

test('PDF image streams are exactly 40 bytes per dot row', () => {
  const pdf = encodePdf([makeSheet(4, 3)]);
  const text = new TextDecoder('latin1').decode(pdf);
  const match = text.match(/\/BitsPerComponent 2 \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/);
  assert.ok(match);
  assert.equal(Number(match[1]), 4 * Math.ceil((PAPER_WIDTH * 2) / 8));
});
