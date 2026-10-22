import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PAPER_WIDTH,
  PRINT_OFFSET,
  PaperSheet,
  PaperStore,
  renderSheetRgba,
} from '../src/printer/paper.js';

function sheetWithRows(count, shade = 3) {
  const sheet = new PaperSheet();
  for (let i = 0; i < count; i++) sheet.append(new Uint8Array(160).fill(shade));
  return sheet;
}

test('PaperSheet centers appended print rows inside paper margins', () => {
  const sheet = new PaperSheet();
  const row = new Uint8Array(160).fill(1);
  sheet.append(row);
  row.fill(3);
  assert.equal(sheet.rowCount, 1);
  assert.equal(sheet.rows[0][0], 0);
  assert.equal(sheet.rows[0][PRINT_OFFSET], 1);
  assert.equal(sheet.rows[0][PRINT_OFFSET + 159], 1);
  assert.equal(sheet.rows[0][PAPER_WIDTH - 1], 0);
  sheet.append(null);
  assert.equal(sheet.rows[1], null);
});

test('PaperStore tears a sheet and starts a new one', () => {
  const store = new PaperStore();
  for (let i = 0; i < 12; i++) store.appendRow(new Uint8Array(160).fill(3));
  assert.equal(store.current.label, 'Current sheet');
  const torn = store.tear();
  assert.equal(torn.label, 'Print 1');
  assert.equal(store.detached.length, 1);
  assert.equal(store.current.rowCount, 0);
  assert.equal(store.current.label, 'Print 2');
  assert.equal(store.hasPaper, false);
  assert.equal(store.exportableSheets().length, 1);
});

test('PaperStore keeps detached pages in order and can remove one', () => {
  const store = new PaperStore();
  store.appendRow(new Uint8Array(160).fill(1));
  const first = store.tear();
  store.appendRow(new Uint8Array(160).fill(2));
  const second = store.tear();
  assert.deepEqual(store.detached.map((sheet) => sheet.id), [first.id, second.id]);
  store.remove(first.id);
  assert.deepEqual(store.detached.map((sheet) => sheet.id), [second.id]);
});

test('renderSheetRgba scales each dot and uses the paper palette', () => {
  const sheet = sheetWithRows(2, 3);
  const image = renderSheetRgba(sheet, 2);
  assert.equal(image.width, PAPER_WIDTH * 2);
  assert.equal(image.height, 4);
  // Left margin is paper white.
  const margin = Array.from(image.data.slice(0, 4));
  assert.deepEqual(margin, [248, 244, 233, 255]);
  // The printed area starts at PRINT_OFFSET and is the dark burn shade.
  const print = Array.from(image.data.slice(PRINT_OFFSET * 2 * 4, PRINT_OFFSET * 2 * 4 + 4));
  assert.deepEqual(print, [36, 32, 28, 255]);
  // Second dot row of the same printer row is duplicated vertically.
  const nextRow = image.width * 4;
  assert.deepEqual(Array.from(image.data.slice(nextRow, nextRow + 4)), margin);
});
