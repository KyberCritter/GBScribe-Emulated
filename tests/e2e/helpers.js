import { expect } from '@playwright/test';

/** Lowercase keyboard layer, matching src/ui/keyboard.c. */
const LOWER = [
  ...'qwertyuiop'.split('').map((ch, i) => ({ ch, x: 2 + i * 2, y: 15, w: 1 })),
  ...'asdfghjkl'.split('').map((ch, i) => ({ ch, x: 2 + i * 2, y: 16, w: 1 })),
  ...'zxcvbnm, .'.replace(' ', '').split('').map((ch, i) => ({ ch, x: 2 + i * 2, y: 17, w: 1 })),
  { label: 'SHIFT', x: 24, y: 15, w: 5 },
  { label: 'SPACE', x: 24, y: 16, w: 5 },
  { label: 'ENTER', x: 24, y: 17, w: 5 },
  { label: 'abc', x: 2, y: 19, w: 3 },
  { label: 'ABC', x: 6, y: 19, w: 3 },
  { label: '!@#', x: 10, y: 19, w: 3 },
  { label: 'shape', x: 14, y: 19, w: 3 },
];

const center = (key) => key.x * 2 + key.w;

/** Exact port of kb_move from src/ui/keyboard.c. */
function kbMove(keys, sel, dx, dy) {
  const cur = keys[sel];
  if (dx) {
    let best = -1;
    let bestD = 0;
    let wrap = -1;
    let wrapX = 0;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].y !== cur.y || i === sel) continue;
      const d = (keys[i].x - cur.x) * dx;
      if (d > 0 && (best < 0 || d < bestD)) {
        best = i;
        bestD = d;
      }
      const wx = keys[i].x * -dx;
      if (wrap < 0 || wx > wrapX) {
        wrap = i;
        wrapX = wx;
      }
    }
    return best >= 0 ? best : wrap >= 0 ? wrap : sel;
  }
  if (dy) {
    let best = -1;
    let bestS = 1 << 30;
    for (let i = 0; i < keys.length; i++) {
      const dr = (keys[i].y - cur.y) * dy;
      if (dr <= 0) continue;
      const dc = Math.abs(center(keys[i]) - center(cur));
      const s = dr * 8 + dc;
      if (s < bestS) {
        best = i;
        bestS = s;
      }
    }
    if (best >= 0) return best;
    for (let i = 0; i < keys.length; i++) {
      if (i === sel) continue;
      const dr = (keys[i].y - cur.y) * dy;
      const dc = Math.abs(center(keys[i]) - center(cur));
      const s = dr * 8 + dc;
      if (s < bestS) {
        best = i;
        bestS = s;
      }
    }
    return best >= 0 ? best : sel;
  }
  return sel;
}

const MOVES = [
  ['LEFT', -1, 0],
  ['RIGHT', 1, 0],
  ['UP', 0, -1],
  ['DOWN', 0, 1],
];

function pathTo(keys, start, target) {
  if (start === target) return [];
  const queue = [[start, []]];
  const seen = new Set([start]);
  while (queue.length) {
    const [index, path] = queue.shift();
    for (const [button, dx, dy] of MOVES) {
      const next = kbMove(keys, index, dx, dy);
      if (next === index || seen.has(next)) continue;
      const nextPath = [...path, button];
      if (next === target) return nextPath;
      seen.add(next);
      queue.push([next, nextPath]);
    }
  }
  throw new Error(`No keyboard path from ${start} to ${target}`);
}

export async function boot(page, path = '/') {
  await page.goto(path);
  await page.waitForFunction(() => window.__gbsDemo?.loaded === true, null, { timeout: 30_000 });
  await page.evaluate(() => {
    const readText = () => {
      const gba = window.__gbsDemo.gba;
      const base = 0x06000000 + 30 * 0x800;
      const lines = [];
      for (let y = 0; y < 20; y++) {
        let line = '';
        for (let x = 0; x < 30; x++) {
          const value = gba.mmu.load16(base + (y * 32 + x) * 2);
          const code = value & 0x3ff;
          line += code === 0 ? ' ' : code >= 0x20 && code < 0x7f ? String.fromCharCode(code) : '·';
        }
        lines.push(line.replace(/\s+$/, ''));
      }
      return lines;
    };

    const slotSize = () => {
      const save = window.__gbsDemo.gba.mmu.save;
      const bytes = new Uint8Array(save.buffer);
      return Math.floor((bytes.length - 1024) / 8);
    };

    const slotData = (slot) => {
      const save = window.__gbsDemo.gba.mmu.save;
      const bytes = new Uint8Array(save.buffer);
      const view = new DataView(bytes.buffer);
      const dirOffset = 16 + slot * 18;
      const length = view.getUint16(dirOffset + 2, true);
      const start = 1024 + slot * slotSize();
      return Array.from(bytes.slice(start, start + length));
    };

    window.__gbsTest = {
      screenText: readText,
      screenCodes: () => {
        const gba = window.__gbsDemo.gba;
        const base = 0x06000000 + 30 * 0x800;
        const rows = [];
        for (let y = 0; y < 20; y++) {
          const row = [];
          for (let x = 0; x < 30; x++) row.push(gba.mmu.load16(base + (y * 32 + x) * 2) & 0x3ff);
          rows.push(row);
        }
        return rows;
      },
      codeAt: (x, y) => {
        const gba = window.__gbsDemo.gba;
        return gba.mmu.load16(0x06000000 + 30 * 0x800 + (y * 32 + x) * 2) & 0x3ff;
      },
      saveBytes: () => Array.from(new Uint8Array(window.__gbsDemo.gba.mmu.save.buffer)),
      parseSave: () => {
        const save = window.__gbsDemo.gba.mmu.save;
        const bytes = new Uint8Array(save.buffer);
        const view = new DataView(bytes.buffer);
        const dirs = [];
        for (let i = 0; i < 8; i++) {
          const offset = 16 + i * 18;
          const name = String.fromCharCode(...bytes.slice(offset + 4, offset + 18)).replace(/\0.*$/, '');
          dirs.push({
            type: bytes[offset],
            length: view.getUint16(offset + 2, true),
            name,
            data: (() => {
              const length = view.getUint16(offset + 2, true);
              const start = 1024 + i * slotSize();
              return Array.from(bytes.slice(start, start + length));
            })(),
          });
        }
        return {
          magic: String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]),
          version: view.getUint16(4, true),
          wrapMode: bytes[6],
          drawPal: bytes[8],
          slotSize: slotSize(),
          dirs,
        };
      },
      paperRows: () => window.__gbsDemo.paperStore.current.rowCount,
      paperInk: () => {
        const sheet = window.__gbsDemo.paperStore.current;
        let ink = 0;
        for (const row of sheet.rows) {
          if (!row) continue;
          for (const shade of row) if (shade) ink++;
        }
        return ink;
      },
      detached: () => window.__gbsDemo.paperStore.detached.length,
      resetBindings: () => localStorage.removeItem('gbscribe-emulated.bindings.v1'),
    };
  });
  await page.waitForTimeout(500);
}

export async function screenText(page) {
  return page.evaluate(() => window.__gbsTest.screenText());
}

export async function waitForText(page, text, timeout = 6000) {
  await page.waitForFunction(
    (needle) => window.__gbsTest.screenText().join('\n').includes(needle),
    text,
    { timeout },
  );
}

export async function tap(page, button, hold = 95) {
  await page.evaluate(
    async ({ button, hold }) => {
      const demo = window.__gbsDemo;
      demo.pressButton(button, 'e2e');
      await new Promise((resolve) => setTimeout(resolve, hold));
      demo.releaseButton(button, 'e2e');
      await new Promise((resolve) => setTimeout(resolve, 75));
    },
    { button, hold },
  );
}

export async function tapMany(page, buttons, hold = 95) {
  for (const button of buttons) await tap(page, button, hold);
}

export async function press(page, button) {
  await page.evaluate((button) => window.__gbsDemo.pressButton(button, 'e2e'), button);
}

export async function release(page, button) {
  await page.evaluate((button) => window.__gbsDemo.releaseButton(button, 'e2e'), button);
}

export async function hold(page, button, ms = 350) {
  await press(page, button);
  await page.waitForTimeout(ms);
  await release(page, button);
  await page.waitForTimeout(80);
}

export async function resetGba(page) {
  await page.evaluate(() => window.__gbsDemo.resetGba(false));
  await page.waitForTimeout(1200);
}

export async function openTitleChoice(page, index) {
  await resetGba(page);
  await waitForText(page, 'PRESS START');
  await tap(page, 'START');
  await waitForText(page, 'New text document');
  for (let i = 0; i < index; i++) await tap(page, 'DOWN');
  await tap(page, 'A');
  await page.waitForTimeout(450);
}

export async function openEditor(page) {
  await openTitleChoice(page, 0);
  await waitForText(page, 'abc');
}

export async function openDrawing(page) {
  await openTitleChoice(page, 1);
  await page.waitForFunction(() => window.__gbsTest.codeAt(2, 2) === 0x19, null, { timeout: 5000 });
}

export async function openMenu(page) {
  await tap(page, 'START');
  await waitForText(page, 'Print document');
}

export async function openDrawMenu(page) {
  await tap(page, 'START');
  await waitForText(page, 'Resume drawing');
}

export async function menuSelect(page, index) {
  await openMenu(page);
  for (let i = 0; i < index; i++) await tap(page, 'DOWN');
  await tap(page, 'A');
  await page.waitForTimeout(350);
}

export async function drawMenuSelect(page, index) {
  await openDrawMenu(page);
  for (let i = 0; i < index; i++) await tap(page, 'DOWN');
  await tap(page, 'A');
  await page.waitForTimeout(350);
}

/**
 * Type lowercase text on GBScribe's on-screen keyboard. Returns the updated
 * keyboard cursor index. Spaces are entered with R, as the ROM's help says.
 */
export async function typeLower(page, text, cursor = 0) {
  let index = cursor;
  for (const char of text) {
    if (char === ' ') {
      await tap(page, 'R');
      continue;
    }
    const target = LOWER.findIndex((key) => key.ch === char);
    if (target < 0) throw new Error(`No lowercase key for ${JSON.stringify(char)}`);
    const path = pathTo(LOWER, index, target);
    for (const button of path) await tap(page, button);
    await tap(page, 'A');
    index = target;
  }
  return index;
}

export async function waitForPaper(page, minRows = 12, timeout = 40_000) {
  await page.waitForFunction(
    ({ minRows }) => {
      const demo = window.__gbsDemo;
      return demo.paperStore.current.rowCount >= minRows && !demo.printer.printJob;
    },
    { minRows },
    { timeout },
  );
}

export async function printFromEditor(page) {
  await menuSelect(page, 1);
  await waitForText(page, 'A: Print');
  await tap(page, 'A');
  await waitForPaper(page, 12);
}

export async function printFromDrawing(page) {
  await drawMenuSelect(page, 1);
  await waitForText(page, 'A: Print');
  await tap(page, 'A');
  await waitForPaper(page, 12);
}

export async function saveDocument(page, slot = 0) {
  await menuSelect(page, 2);
  await waitForText(page, 'SAVE TO SLOT');
  for (let i = 0; i < slot; i++) await tap(page, 'DOWN');
  await tap(page, 'A');
  await waitForText(page, 'SAVED');
  await page.waitForTimeout(1300);
}

export async function loadDocument(page, slot = 0) {
  await menuSelect(page, 3);
  await waitForText(page, 'LOAD FROM SLOT');
  for (let i = 0; i < slot; i++) await tap(page, 'DOWN');
  await tap(page, 'A');
  await page.waitForTimeout(450);
}

export async function saveDrawing(page, slot = 0) {
  await drawMenuSelect(page, 2);
  await waitForText(page, 'SAVE DRAWING TO');
  for (let i = 0; i < slot; i++) await tap(page, 'DOWN');
  await tap(page, 'A');
  await waitForText(page, 'SAVED');
  await page.waitForTimeout(1300);
}

export async function loadDrawing(page, slot = 0) {
  await drawMenuSelect(page, 3);
  await waitForText(page, 'LOAD DRAWING FROM');
  for (let i = 0; i < slot; i++) await tap(page, 'DOWN');
  await tap(page, 'A');
  await page.waitForTimeout(450);
}

export async function readSave(page) {
  return page.evaluate(() => window.__gbsTest.parseSave());
}

export async function flushSave(page) {
  await page.evaluate(() => window.__gbsDemo.gba.storeSavedata());
  await page.waitForTimeout(100);
}

export async function expectText(page, text) {
  await expect
    .poll(async () => (await screenText(page)).join('\n'), { timeout: 6000 })
    .toContain(text);
}
