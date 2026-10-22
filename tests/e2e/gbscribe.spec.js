import { test, expect } from '@playwright/test';
import {
  boot,
  drawMenuSelect,
  expectText,
  flushSave,
  loadDocument,
  loadDrawing,
  menuSelect,
  openDrawMenu,
  openDrawing,
  openEditor,
  openMenu,
  openTitleChoice,
  printFromDrawing,
  printFromEditor,
  readSave,
  resetGba,
  saveDrawing,
  screenText,
  switchLayer,
  typeLower,
  typeShape,
  typeSymbols,
  typeUpper,
  tap,
  waitForPaper,
  waitForText,
} from './helpers.js';

async function pagesText(page) {
  return (await screenText(page)).slice(0, 13).join('\n');
}

test.describe('GBScribe features through the emulated hardware', () => {
  test.beforeEach(async ({ page }) => {
    await boot(page);
  });

  test('text editor: typing, layers, caret, save/load, settings, and printing', async ({ page }) => {
    await openEditor(page);

    let cursor = await typeLower(page, 'hello world');
    await expectText(page, 'hello world');

    await tap(page, 'B'); // backspace
    await expectText(page, 'hello worl');
    cursor = await typeLower(page, 'd', cursor);
    await expectText(page, 'hello world');

    // Caret movement with L held, then insert in the middle.
    await page.evaluate(() => window.__gbsDemo.pressButton('L', 'e2e'));
    await tap(page, 'LEFT');
    await page.evaluate(() => window.__gbsDemo.releaseButton('L', 'e2e'));
    await typeLower(page, 'x', cursor);
    await expectText(page, 'hello worlxd');

    // Layer switching: lower -> upper -> symbols -> shapes -> lower.
    await tap(page, 'SELECT');
    await waitForText(page, 'Q W E R T Y U I O P');
    await tap(page, 'SELECT');
    await waitForText(page, '1 2 3 4 5 6 7 8 9 0');
    await tap(page, 'SELECT');
    await expect
      .poll(async () => page.evaluate(() => window.__gbsTest.codeAt(2, 14)))
      .toBe(0x01); // arrow-up glyph on the shapes layer
    await tap(page, 'SELECT');
    await waitForText(page, 'q w e r t y u i o p');

    // Save slot 0 and inspect the real flash save data.
    await tap(page, 'START');
    await waitForText(page, 'Print document');
    for (const item of ['Resume', 'Save document', 'Load document', 'New document', 'Drawing mode', 'Settings', 'Instructions', 'About', 'Main menu']) {
      await expectText(page, item);
    }
    await tap(page, 'B');
    await waitForText(page, 'abc');

    await menuSelect(page, 2);
    await waitForText(page, 'SAVE TO SLOT');
    await tap(page, 'A');
    await waitForText(page, 'SAVED');
    await page.waitForTimeout(1300);

    const saved = await readSave(page);
    expect(saved.magic).toBe('GBSC');
    expect(saved.dirs[0].type).toBe(1);
    expect(saved.dirs[0].name).toContain('hello');
    expect(String.fromCharCode(...saved.dirs[0].data)).toContain('hello worlxd');

    // Settings: toggle wrap mode and verify the persisted header byte.
    await menuSelect(page, 6);
    await waitForText(page, 'Wrap:');
    await expectText(page, 'Word');
    await tap(page, 'RIGHT');
    await expectText(page, 'Mid-word');
    await tap(page, 'B');
    await waitForText(page, 'Print document');
    expect((await readSave(page)).wrapMode).toBe(1);
    await tap(page, 'B');
    await waitForText(page, 'hello worlxd');

    // New document, then load the saved one back.
    await menuSelect(page, 4);
    await page.waitForTimeout(300);
    expect(await pagesText(page)).not.toContain('hello');
    await loadDocument(page, 0);
    await expectText(page, 'hello worlxd');

    // Print the loaded document to the emulated printer.
    await printFromEditor(page);
    expect(await page.evaluate(() => window.__gbsTest.paperInk())).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__gbsTest.paperRows())).toBeGreaterThan(12);
  });

  test('keyboard layers type uppercase, symbols, and shape glyphs', async ({ page }) => {
    await openEditor(page);
    let state = { layer: 0, index: 0 };

    state = await typeUpper(page, 'HI', state);
    await expectText(page, 'HI');
    await waitForText(page, 'Q W E R T Y U I O P');

    state = await typeSymbols(page, '!?', state);
    await expectText(page, 'HI!?');
    await waitForText(page, '1 2 3 4 5 6 7 8 9 0');

    state = await typeShape(page, 0x07, state); // filled circle
    const codes = await page.evaluate(() => window.__gbsTest.screenCodes());
    expect(codes.slice(0, 13).flat()).toContain(0x07);

    state = await switchLayer(page, state, 0);
    await waitForText(page, 'q w e r t y u i o p');
    await tap(page, 'A');
    await expectText(page, 'HI!?');
  });

  test('editor menu Resume and Drawing mode route correctly', async ({ page }) => {
    await openEditor(page);
    await typeLower(page, 'go');
    await menuSelect(page, 0); // Resume
    await expectText(page, 'go');
    await menuSelect(page, 5); // Drawing mode
    await page.waitForFunction(() => window.__gbsTest.codeAt(2, 2) === 0x19);
    await drawMenuSelect(page, 6); // Main menu
    await waitForText(page, 'PRESS START');
  });

  test('drawing tools, palette, save/load, clear, print, and menu', async ({ page }) => {
    await openDrawing(page);

    // Pencil draws at the cursor; save the 160x144 canvas.
    await tap(page, 'RIGHT');
    await tap(page, 'RIGHT');
    await tap(page, 'DOWN');
    await tap(page, 'DOWN');
    await tap(page, 'A');
    await page.waitForTimeout(120);
    await openDrawMenu(page);
    for (const item of ['Print drawing', 'Save drawing', 'Load drawing', 'Palette:', 'Clear canvas', 'Main menu']) {
      await expectText(page, item);
    }
    await tap(page, 'B');
    await page.waitForFunction(() => window.__gbsTest.codeAt(2, 2) === 0x19);

    await saveDrawing(page, 0);
    const pencilSave = await readSave(page);
    expect(pencilSave.dirs[0].type).toBe(2);
    expect(pencilSave.dirs[0].length).toBe(5760);
    expect(pencilSave.dirs[0].data.filter(Boolean).length).toBeGreaterThan(0);
    const pencilPixels = pencilSave.dirs[0].data.filter(Boolean).length;

    // Color cycles 4 -> 1; eraser clears the pixel.
    await tap(page, 'R');
    await expect.poll(async () => page.evaluate(() => window.__gbsTest.codeAt(2, 14))).toBe('1'.charCodeAt(0));
    await tap(page, 'SELECT');
    await tap(page, 'A');

    await saveDrawing(page, 1);
    const erased = await readSave(page);
    expect(erased.dirs[1].data.filter(Boolean).length).toBeLessThan(pencilPixels);

    // Line and stamp tools.
    await tap(page, 'SELECT'); // line
    await tap(page, 'A');
    await tap(page, 'RIGHT');
    await tap(page, 'RIGHT');
    await tap(page, 'RIGHT');
    await tap(page, 'A');
    await tap(page, 'SELECT'); // rect
    await tap(page, 'SELECT'); // stamp
    await tap(page, 'A');

    // Palette change persists in the save header.
    await drawMenuSelect(page, 4);
    await expectText(page, 'Palette: gb');
    await tap(page, 'B');
    expect((await readSave(page)).drawPal).toBe(1);

    // Clear the canvas and save an empty drawing.
    await drawMenuSelect(page, 5);
    await page.waitForFunction(() => window.__gbsTest.codeAt(2, 2) === 0x19);
    await saveDrawing(page, 2);
    const empty = await readSave(page);
    expect(empty.dirs[2].data.filter(Boolean).length).toBe(0);

    // Load the pencil drawing, save it to slot 3, and compare bytes.
    await loadDrawing(page, 0);
    await saveDrawing(page, 3);
    const reloaded = await readSave(page);
    expect(reloaded.dirs[3].data).toEqual(pencilSave.dirs[0].data);

    // Print the loaded drawing.
    await printFromDrawing(page);
    expect(await page.evaluate(() => window.__gbsTest.paperInk())).toBeGreaterThan(0);

    // Back from print to the drawing menu, then Main menu.
    await tap(page, 'B');
    await waitForText(page, 'Resume drawing');
    for (let i = 0; i < 6; i++) await tap(page, 'DOWN');
    await tap(page, 'A');
    await waitForText(page, 'PRESS START');
  });

  test('credits, legal page, QR print, and instructions', async ({ page }) => {
    await openTitleChoice(page, 5);
    await waitForText(page, 'By Scott');
    await expectText(page, 'MIT License');
    await expectText(page, 'A: Print QR');
    await tap(page, 'DOWN');
    await expectText(page, 'QR Code is a trademark');
    await expectText(page, 'Not affiliated with or');
    await tap(page, 'UP');
    await expectText(page, 'A: Print QR');

    // Print the contact QR page through the real printer path.
    await tap(page, 'A');
    await waitForText(page, 'A: Print');
    await tap(page, 'A');
    await waitForPaper(page, 100, 35_000);
    expect(await page.evaluate(() => window.__gbsTest.paperInk())).toBeGreaterThan(0);
    await tap(page, 'B');
    await waitForText(page, 'A: Print QR');
    await tap(page, 'B');
    await waitForText(page, 'PRESS START');

    // Instructions viewer: page down, print confirm, cancel.
    await openTitleChoice(page, 4);
    await waitForText(page, 'INSTRUCTIONS');
    await expectText(page, 'UP/DN:Page A:Print B:Back');
    const pageOne = (await screenText(page)).join('\n');
    await tap(page, 'DOWN');
    await page.waitForTimeout(200);
    const pageTwo = (await screenText(page)).join('\n');
    expect(pageTwo).not.toBe(pageOne);
    await tap(page, 'A');
    await waitForText(page, 'A: Print');
    await tap(page, 'B');
    await waitForText(page, 'INSTRUCTIONS');
    await tap(page, 'B');
    await waitForText(page, 'PRESS START');

    // About and instructions from the editor menu.
    await openEditor(page);
    await menuSelect(page, 8);
    await waitForText(page, 'By Scott');
    await tap(page, 'B');
    await waitForText(page, 'Print document');
    await tap(page, 'B');
    await waitForText(page, 'abc');

    await menuSelect(page, 7);
    await waitForText(page, 'INSTRUCTIONS');
    await tap(page, 'B');
    await waitForText(page, 'Print document');
    await tap(page, 'B');
    await waitForText(page, 'abc');
  });

  test('Konami Easter egg opens the debug menu and its print path', async ({ page }) => {
    await resetGba(page);
    await waitForText(page, 'PRESS START');
    for (const button of ['UP', 'UP', 'DOWN', 'DOWN', 'LEFT', 'RIGHT', 'LEFT', 'RIGHT', 'B', 'A']) {
      await tap(page, button);
    }
    await waitForText(page, '- DEBUG MENU -');
    await expectText(page, 'Alice in Wonderland');
    await expectText(page, 'Dracula');
    await expectText(page, 'Genesis 1');
    await expectText(page, 'A: Print  B: Back');

    await tap(page, 'A');
    await waitForText(page, 'A: Print');
    await tap(page, 'B');
    await waitForText(page, '- DEBUG MENU -');
    await tap(page, 'B');
    await waitForText(page, 'PRESS START');
  });

  test('title-screen load restores a document after a reset', async ({ page }) => {
    await openEditor(page);
    await typeLower(page, 'saved');
    await expectText(page, 'saved');
    await menuSelect(page, 2);
    await waitForText(page, 'SAVE TO SLOT');
    await tap(page, 'A');
    await waitForText(page, 'SAVED');
    await page.waitForTimeout(1300);
    await flushSave(page);

    await resetGba(page);
    await openTitleChoice(page, 2);
    await waitForText(page, 'LOAD A FILE');
    await tap(page, 'A');
    await page.waitForTimeout(500);
    await expectText(page, 'saved');
  });
});
