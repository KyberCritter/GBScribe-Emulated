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
  await expect(page.locator('gbscribe-emulator [data-status]')).toHaveText('Printer on');
  await waitForText(page, 'Printer: OK');

  await page.locator('gbscribe-emulator .gbs-hit-power').click();
  await expect(page.locator('gbscribe-emulator [data-status]')).toHaveText('Printer off');
  await waitForText(page, 'Printer: disconnected');

  await page.locator('gbscribe-emulator .gbs-hit-power').click();
  await expect(page.locator('gbscribe-emulator [data-status]')).toHaveText('Printer on');
  await waitForText(page, 'Printer: OK');
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

    expect(led.centerX).toBeCloseTo(0.8408, 3);
    expect(led.centerY).toBeCloseTo(0.1836, 3);
    expect(led.widthRatio).toBeCloseTo(0.0135, 3);
    expect(led.height).toBeCloseTo(led.width, 1);
    expect(led.radius).toBe('50%');
    expect(led.background).toContain('radial-gradient');
    expect(led.on).toBe(true);
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
    await page.locator('gbscribe-emulator [data-export="png"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^gbscribe-paper-.*\.png$/);
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
    const feedBox = await feedButton.boundingBox();
    const beforeHold = await page.evaluate(() => window.__gbsDemo.printer.rollRows);
    await page.mouse.move(feedBox.x + feedBox.width / 2, feedBox.y + feedBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(650);
    await page.mouse.up();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__gbsDemo.printer.rollRows)).toBeLessThan(beforeHold - 8);

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
    await expect(page.locator('gbscribe-emulator [data-status]')).toHaveText('Printer on');
    expect(await page.evaluate(() => window.__gbsDemo.printer.rollRows)).toBe(4000);
    await page.locator('gbscribe-emulator [data-dialog="paper"] [data-close]').first().click();

    // Power off -> the ROM's real INQUIRY path reports disconnected.
    await page.locator('gbscribe-emulator [data-action="power"]').first().click();
    await expect(page.locator('gbscribe-emulator [data-status]')).toHaveText('Printer off');
    await resetGba(page);
    await waitForText(page, 'Printer: disconnected', 8000);

    await page.locator('gbscribe-emulator [data-action="power"]').first().click();
    await waitForText(page, 'Printer: OK', 8000);
  });

  test('PNG, BMP, PDF, and browser print exports are wired to the UI', async ({ page }) => {
    const exportLayout = await page.evaluate(() => {
      const root = document.querySelector('gbscribe-emulator').shadowRoot;
      const bar = root.querySelector('.gbs-export');
      const buttons = [...bar.querySelectorAll('[data-export]')];
      const barRect = bar.getBoundingClientRect();
      const rects = buttons.map((button) => button.getBoundingClientRect());
      return {
        labels: root.querySelectorAll('.gbs-export-label').length,
        buttons: buttons.length,
        barWidth: barRect.width,
        sameRow: Math.max(...rects.map((rect) => rect.top)) - Math.min(...rects.map((rect) => rect.top)) < 1,
        inside: rects.every((rect) => rect.left >= barRect.left - 1 && rect.right <= barRect.right + 1),
        widths: rects.map((rect) => rect.width),
      };
    });
    expect(exportLayout.labels).toBe(0);
    expect(exportLayout.buttons).toBe(4);
    expect(exportLayout.barWidth).toBeLessThan(400);
    expect(exportLayout.sameRow).toBe(true);
    expect(exportLayout.inside).toBe(true);
    expect(Math.max(...exportLayout.widths) - Math.min(...exportLayout.widths)).toBeLessThan(2);

    await page.evaluate(() => {
      const demo = window.__gbsDemo;
      for (let y = 0; y < 30; y++) demo.paperStore.appendRow(new Uint8Array(160).fill((y * 3) % 4));
      demo.tearPaper();
    });
    await page.waitForTimeout(500);

    for (const kind of ['png', 'bmp', 'pdf']) {
      const downloadPromise = page.waitForEvent('download');
      await page.locator(`gbscribe-emulator [data-export="${kind}"]`).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${kind}$`));
      const path = await download.path();
      expect(path).toBeTruthy();
      const size = (await import('node:fs')).statSync(path).size;
      expect(size).toBeGreaterThan(kind === 'pdf' ? 1000 : 500);
    }

    const popupPromise = page.waitForEvent('popup');
    await page.locator('gbscribe-emulator [data-export="print"]').click();
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
