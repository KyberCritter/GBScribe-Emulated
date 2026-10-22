import { test, expect } from '@playwright/test';
import { boot, waitForText } from './helpers.js';

test.use({ viewport: { width: 390, height: 844 } });

test('mobile layout stacks the hardware and the on-screen controls work', async ({ page }) => {
  await boot(page);
  await waitForText(page, 'PRESS START');

  const layout = await page.evaluate(() => {
    const shadow = document.querySelector('gbscribe-emulator').shadowRoot;
    const gba = shadow.querySelector('[data-gba-image]');
    const printer = shadow.querySelector('[data-printer-image]');
    return {
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      gba: gba.getBoundingClientRect().toJSON(),
      printer: printer.getBoundingClientRect().toJSON(),
      gbaLoaded: gba.complete && gba.naturalWidth > 0,
      printerLoaded: printer.complete && printer.naturalWidth > 0,
    };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
  expect(layout.gbaLoaded).toBe(true);
  expect(layout.printerLoaded).toBe(true);
  expect(layout.printer.top).toBeGreaterThan(layout.gba.bottom);

  await expect(page.locator('gbscribe-emulator [data-toast]')).not.toHaveClass(/show/);
  await page.locator('gbscribe-emulator [data-button="START"]').click();
  await waitForText(page, 'New text document');
});
