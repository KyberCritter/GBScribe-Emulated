import { test, expect } from '@playwright/test';
import {
  boot,
  expectText,
  openTitleChoice,
  readSave,
  resetGba,
  screenText,
  tap,
  waitForPaper,
  waitForText,
} from './helpers.js';

test('printer starts on and the power switch disconnects it', async ({ page }) => {
  await boot(page);
  const power = page.locator('gbscribe-emulator .gbs-hit-power');
  await expect(power).toHaveAttribute('aria-pressed', 'true');
  await waitForText(page, 'Printer: OK');

  await power.click();
  await expect(power).toHaveAttribute('aria-pressed', 'false');
  await waitForText(page, 'Printer: disconnected');

  await power.click();
  await expect(power).toHaveAttribute('aria-pressed', 'true');
  await waitForText(page, 'Printer: OK');
});

test('the POWER layer is the whole cap, not just the circular bump', async ({ page }) => {
  await boot(page);
  const geometry = await page.evaluate(() => {
    const root = document.querySelector('gbscribe-emulator').shadowRoot;
    const scene = root.querySelector('.gbs-printer-scene').getBoundingClientRect();
    const on = root.querySelector('.gbs-printer-switch-on');
    const off = root.querySelector('.gbs-printer-switch-off');
    const onBox = on.getBoundingClientRect();
    const offBox = off.getBoundingClientRect();
    return {
      width: onBox.width / scene.width,
      height: onBox.height / scene.height,
      sourceAspect: on.naturalHeight / on.naturalWidth,
      sameWidth: Math.abs(onBox.width - offBox.width) < 0.5,
      travelLeft:
        (parseFloat(getComputedStyle(on).left) - parseFloat(getComputedStyle(off).left)) /
        scene.width,
      sameTop:
        Math.abs(
          parseFloat(getComputedStyle(on).top) - parseFloat(getComputedStyle(off).top),
        ) < 0.5,
    };
  });
  expect(geometry.width).toBeGreaterThan(0.16);
  expect(geometry.height).toBeGreaterThan(0.12);
  // A disc would be square; the cap is noticeably taller than it is wide.
  expect(geometry.sourceAspect).toBeGreaterThan(1.2);
  expect(geometry.sameWidth).toBe(true);
  // OFF is to the left of ON, and the switch does not drop downward.
  expect(geometry.travelLeft).toBeGreaterThan(0.02);
  expect(geometry.travelLeft).toBeLessThan(0.05);
  expect(geometry.sameTop).toBe(true);
});

test.describe('GBScribe emulator shell and Game Boy Printer', () => {
  test.beforeEach(async ({ page }) => {
    await boot(page);
  });

  test('boots GBScribe and detects the emulated printer', async ({ page }) => {
    await waitForText(page, 'PRESS START');
    await waitForText(page, 'Printer: OK');
    await expect(page.locator('gbscribe-emulator')).toHaveAttribute('data-ready', '');
    expect(await page.evaluate(() => Boolean(window.__gbsLinkPort?.installed))).toBe(true);

    const underGba = await page.evaluate(() => {
      const root = document.querySelector('gbscribe-emulator').shadowRoot;
      const photo = root.querySelector('.gbs-gba-photo').getBoundingClientRect();
      const reset = root.querySelector('.gbs-under-gba [data-action="reset"]').getBoundingClientRect();
      const sound = root.querySelector('.gbs-under-gba [data-action="mute"]').getBoundingClientRect();
      return {
        photoCenter: photo.left + photo.width / 2,
        groupCenter: (reset.left + sound.right) / 2,
        rowDelta: Math.abs(reset.top - sound.top),
        gap: sound.left - reset.right,
      };
    });
    expect(Math.abs(underGba.photoCenter - underGba.groupCenter)).toBeLessThan(2);
    expect(underGba.rowDelta).toBeLessThan(1);
    expect(underGba.gap).toBeGreaterThanOrEqual(0);
  });

  test('GBA power LED sits in the photographed socket and stays circular', async ({ page }) => {
    const led = await page.evaluate(() => {
      const root = document.querySelector('gbscribe-emulator').shadowRoot;
      const photo = root.querySelector('.gbs-gba-photo').getBoundingClientRect();
      const element = root.querySelector('.gbs-gba-power-led');
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        centerX: (rect.left + rect.width / 2 - photo.left) / photo.width,
        centerY: (rect.top + rect.height / 2 - photo.top) / photo.height,
        widthRatio: rect.width / photo.width,
        width: rect.width,
        height: rect.height,
        radius: style.borderRadius,
        background: style.backgroundImage,
        on: element.classList.contains('on'),
      };
    });

    expect(led.centerX).toBeCloseTo(0.8183, 3);
    expect(led.centerY).toBeCloseTo(0.1679, 3);
    expect(led.widthRatio).toBeCloseTo(0.027, 3);
    expect(led.height).toBeCloseTo(led.width, 1);
    expect(led.radius).toBe('50%');
    expect(led.background).toContain('radial-gradient');
    expect(led.on).toBe(true);
  });

  test('L/R trigger zones cover the whole shoulders', async ({ page }) => {
    const geometry = await page.evaluate(() => {
      const root = document.querySelector('gbscribe-emulator').shadowRoot;
      const photo = root.querySelector('.gbs-gba-photo').getBoundingClientRect();
      const left = root.querySelector('.gbs-hit-l');
      const right = root.querySelector('.gbs-hit-r');
      return {
        leftWidth: left.offsetWidth / photo.width,
        leftHeight: left.offsetHeight / photo.height,
        rightWidth: right.offsetWidth / photo.width,
        rightHeight: right.offsetHeight / photo.height,
        leftPoint: {
          x: photo.left + photo.width * 0.06,
          y: photo.top + photo.height * 0.08,
        },
        rightPoint: {
          x: photo.left + photo.width * 0.94,
          y: photo.top + photo.height * 0.08,
        },
      };
    });

    expect(geometry.leftWidth).toBeGreaterThan(0.2);
    expect(geometry.leftHeight).toBeGreaterThan(0.12);
    expect(geometry.rightWidth).toBeGreaterThan(0.2);
    expect(geometry.rightHeight).toBeGreaterThan(0.12);

    // Press the outer, lower part of each photographed trigger, not just the
    // old narrow strip along the top edge.
    for (const [point, bit] of [
      [geometry.leftPoint, 9],
      [geometry.rightPoint, 8],
    ]) {
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      expect(
        await page.evaluate(
          (bit) => (window.__gbsDemo.gba.keypad.currentDown & (1 << bit)) === 0,
          bit,
        ),
      ).toBe(true);
      await page.mouse.up();
      await page.waitForTimeout(80);
      expect(
        await page.evaluate(
          (bit) => (window.__gbsDemo.gba.keypad.currentDown & (1 << bit)) !== 0,
          bit,
        ),
      ).toBe(true);
    }
  });

  test('Try a test print runs GBScribe, prints paper, tears and exports a PNG', async ({ page }) => {
    await page.locator('gbscribe-emulator [data-action="demo"]').first().click();
    await waitForPaper(page, 100, 45_000);

    const ink = await page.evaluate(() => window.__gbsTest.paperInk());
    expect(ink).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__gbsTest.paperRows())).toBeGreaterThan(100);

    await page.locator('gbscribe-emulator .gbs-scissors').click();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__gbsTest.detached())).toBe(1);
    await expect(page.locator('gbscribe-emulator [data-pages]')).toBeVisible();
    await expect(page.locator('gbscribe-emulator .gbs-page-card')).toHaveCount(1);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('gbscribe-emulator .gbs-page-card [data-page-action="png"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^gbscribe-paper-.*\.png$/);

    const deleteButton = page.locator('gbscribe-emulator .gbs-page-card [data-page-action="delete"]');
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toContainText('Delete');
    await deleteButton.click();
    await expect(page.locator('gbscribe-emulator .gbs-page-card')).toHaveCount(0);
  });

  test('paper drag tear, feed, roll replacement, power cycling, and detection', async ({ page }) => {
    // Synthetic rows let this test focus on the printer body controls.
    await page.evaluate(() => {
      const demo = window.__gbsDemo;
      for (let y = 0; y < 60; y++) demo.paperStore.appendRow(new Uint8Array(160).fill(y % 4));
    });
    await expect(page.locator('gbscribe-emulator [data-paper]')).toBeVisible();

    const beforeFeed = await page.evaluate(() => window.__gbsTest.paperRows());
    await page.locator('gbscribe-emulator [data-action="feed"]').last().click();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__gbsTest.paperRows())).toBeGreaterThan(beforeFeed);

    // Holding the photo's FEED button keeps advancing paper.
    const feedButton = page.locator('gbscribe-emulator .gbs-hit-feed');
    await feedButton.scrollIntoViewIfNeeded();
    const feedGeometry = await page.evaluate(() => {
      const root = document.querySelector('gbscribe-emulator').shadowRoot;
      const scene = root.querySelector('.gbs-printer-scene').getBoundingClientRect();
      const feed = root.querySelector('.gbs-hit-feed').getBoundingClientRect();
      return {
        centerX: (feed.left + feed.width / 2 - scene.left) / scene.width,
        centerY: (feed.top + feed.height / 2 - scene.top) / scene.height,
        aspect: feed.height / feed.width,
        userSelect: getComputedStyle(root.querySelector('.gbs-root')).userSelect,
      };
    });
    expect(feedGeometry.centerX).toBeCloseTo(0.241, 3);
    expect(feedGeometry.centerY).toBeCloseTo(0.851, 3);
    expect(feedGeometry.aspect).toBeGreaterThan(0.9);
    expect(feedGeometry.aspect).toBeLessThan(1.1);
    expect(feedGeometry.userSelect).toBe('none');

    const feedBox = await feedButton.boundingBox();
    const beforeHold = await page.evaluate(() => window.__gbsDemo.printer.rollRows);
    await page.mouse.move(feedBox.x + feedBox.width / 2, feedBox.y + feedBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__gbsDemo.printer.rollRows)).toBeLessThan(beforeHold - 8);
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');

    // Drag the paper tab downward to tear it off physically.
    const rect = await page.evaluate(() => {
      const demo = window.__gbsDemo;
      demo.refs.tearTab.scrollIntoView({ block: 'center' });
      const box = demo.refs.tearTab.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    await page.mouse.move(rect.x, rect.y);
    await page.mouse.down();
    await page.mouse.move(rect.x, rect.y - 72, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__gbsTest.detached())).toBe(1);

    // Paper compartment: open, remove, and insert.
    await page.locator('gbscribe-emulator [data-action="paper"]').last().click();
    await expect(page.locator('gbscribe-emulator [data-dialog="paper"]')).toBeVisible();
    await page.locator('gbscribe-emulator [data-paper-cover]').click();
    await page.locator('gbscribe-emulator [data-paper-remove]').click();
    await expect
      .poll(async () => page.evaluate(() => ({
        roll: window.__gbsDemo.printer.rollRows,
        cover: window.__gbsDemo.printer.coverClosed,
        feedDisabled: window.__gbsDemo.refs.feedButtons.every((button) => button.disabled),
      })))
      .toEqual({ roll: 0, cover: false, feedDisabled: true });
    await page.locator('gbscribe-emulator [data-paper-replace]').click();
    await expect
      .poll(() => page.evaluate(() => window.__gbsDemo.printer.rollRows))
      .toBe(4000);
    await page.locator('gbscribe-emulator [data-dialog="paper"] [data-close]').first().click();

    // Power off -> the ROM's real INQUIRY path reports disconnected.
    await page.locator('gbscribe-emulator [data-action="power"]').first().click();
    await expect(
      page.locator('gbscribe-emulator .gbs-hit-power'),
    ).toHaveAttribute('aria-pressed', 'false');
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(() => {
        const root = document.querySelector('gbscribe-emulator').shadowRoot;
        return {
          powered: root.querySelector('.gbs-printer-scene').classList.contains('is-powered'),
          on: getComputedStyle(root.querySelector('.gbs-printer-switch-on')).opacity,
          off: getComputedStyle(root.querySelector('.gbs-printer-switch-off')).opacity,
        };
      }),
    ).toEqual({ powered: false, on: '0', off: '1' });
    await resetGba(page);
    await waitForText(page, 'Printer: disconnected', 8000);

    await page.locator('gbscribe-emulator [data-action="power"]').first().click();
    await waitForText(page, 'Printer: OK', 8000);
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(() => {
        const root = document.querySelector('gbscribe-emulator').shadowRoot;
        return {
          powered: root.querySelector('.gbs-printer-scene').classList.contains('is-powered'),
          on: getComputedStyle(root.querySelector('.gbs-printer-switch-on')).opacity,
          off: getComputedStyle(root.querySelector('.gbs-printer-switch-off')).opacity,
        };
      }),
    ).toEqual({ powered: true, on: '1', off: '0' });
  });

  test('printer image stays still while idle and feeding', async ({ page }) => {
    const sampleFrames = () =>
      page.evaluate(async () => {
        const image = window.__gbsDemo.refs.printerImage;
        const frames = [];
        for (let i = 0; i < 12; i++) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const { x, y } = image.getBoundingClientRect();
          frames.push(`${x.toFixed(2)},${y.toFixed(2)}`);
        }
        return frames;
      });

    // Repeated refreshes must not animate the printer while it is idle.
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.__gbsDemo.updateUI());
    }
    expect(new Set(await sampleFrames()).size).toBe(1);
    expect(await page.evaluate(() => window.__gbsDemo.printer.feeding)).toBe(false);

    // Feeding advances paper through the worker, but the printer body must not move.
    await page.evaluate(() => window.__gbsDemo.printer.feedRows(24));
    expect(new Set(await sampleFrames()).size).toBe(1);
    expect(await page.evaluate(() => window.__gbsDemo.printer.feeding)).toBe(true);
    await expect
      .poll(async () => page.evaluate(() => window.__gbsDemo.printer.feeding), { timeout: 8000 })
      .toBe(false);
    expect(new Set(await sampleFrames()).size).toBe(1);
  });

  test('long sheets keep the paper width when the canvas grows', async ({ page }) => {
    const size = await page.evaluate(async () => {
      const { PaperCanvasView, PaperSheet } = await import('/src/printer/paper.js');
      const canvas = document.createElement('canvas');
      const view = new PaperCanvasView(canvas);
      const sheet = new PaperSheet();
      for (let i = 0; i < 600; i++) sheet.append(new Uint8Array(160).fill(i % 4));
      view.setSheet(sheet);
      return { width: canvas.width, height: canvas.height };
    });
    expect(size.width).toBe(281);
    expect(size.height).toBe(1024);
  });

  test('PNG, BMP, PDF, and browser print exports are wired to each printed page', async ({ page }) => {
    await page.evaluate(() => {
      const demo = window.__gbsDemo;
      for (let y = 0; y < 30; y++) demo.paperStore.appendRow(new Uint8Array(160).fill((y * 3) % 4));
      demo.tearPaper();
    });
    await page.waitForTimeout(500);

    const card = page.locator('gbscribe-emulator .gbs-page-card');
    await expect(card).toHaveCount(1);
    await expect(page.locator('gbscribe-emulator .gbs-export')).toHaveCount(0);
    for (const action of ['png', 'bmp', 'pdf', 'print']) {
      await expect(card.locator(`[data-page-action="${action}"]`)).toBeVisible();
    }

    for (const kind of ['png', 'bmp', 'pdf']) {
      const downloadPromise = page.waitForEvent('download');
      await card.locator(`[data-page-action="${kind}"]`).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${kind}$`));
      const path = await download.path();
      expect(path).toBeTruthy();
      const size = (await import('node:fs')).statSync(path).size;
      expect(size).toBeGreaterThan(kind === 'pdf' ? 1000 : 500);
    }

    const popupPromise = page.waitForEvent('popup');
    await card.locator('[data-page-action="print"]').click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup.locator('img')).toHaveCount(1);
    const grayscale = await popup.evaluate(async () => {
      const image = document.querySelector('img');
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== data[i + 1] || data[i + 1] !== data[i + 2]) return false;
      }
      return true;
    });
    expect(grayscale).toBe(true);
    await popup.close();
  });

  test('title chooser exposes every GBScribe entry point', async ({ page }) => {
    await resetGba(page);
    await waitForText(page, 'PRESS START');
    await tap(page, 'START');
    await waitForText(page, 'New text document');
    for (const item of ['New drawing', 'Load a file', 'Print test page', 'Instructions', 'Credits']) {
      await expectText(page, item);
    }
  });
});
