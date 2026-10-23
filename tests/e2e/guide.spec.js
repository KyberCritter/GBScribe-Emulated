import { test, expect } from '@playwright/test';
import { GUIDE_KEY } from '../../src/persistence.js';
import { boot } from './helpers.js';

const STEPS = [
  'start',
  'mode',
  'writing',
  'print-menu',
  'print-option',
  'printing',
  'tear',
  'export',
];

test('guided tutorial walks through starting, writing, printing, tearing, and export', async ({
  page,
}) => {
  await boot(page, '/?guide=1');

  const prompt = page.locator('gbscribe-emulator [data-dialog="guide-intro"]');
  await expect(prompt).toBeVisible();
  await page.locator('gbscribe-emulator [data-guide-yes]').click();

  const guide = page.locator('gbscribe-emulator [data-guide]');
  await expect(guide).toBeVisible();

  for (let index = 0; index < STEPS.length; index++) {
    const step = STEPS[index];
    await expect(guide).toHaveAttribute('data-step', step, { timeout: 35_000 });
    await expect(guide).toHaveAttribute('data-ready', 'true', { timeout: 35_000 });
    await expect(page.locator('gbscribe-emulator [data-guide-title]')).not.toHaveText('');

    if (index % 2 === 0) {
      await page.keyboard.press('Space');
    } else {
      await guide.click({ position: { x: 12, y: 12 } });
    }
  }

  await expect(guide).toBeHidden();
  expect(await page.evaluate(() => window.__gbsTest.detached())).toBe(1);
  await expect(page.locator('gbscribe-emulator [data-pages]')).toBeVisible();
  await expect(page.locator('gbscribe-emulator .gbs-page-card')).toHaveCount(1);
  await expect(page.locator('gbscribe-emulator .gbs-page-card [data-page-action="png"]')).toBeEnabled();
  expect(await page.evaluate((key) => localStorage.getItem(key), GUIDE_KEY)).toBe('"completed"');

  await page.reload();
  await page.waitForFunction(() => window.__gbsDemo?.loaded === true, null, { timeout: 30_000 });
  await page.waitForTimeout(1400);
  await expect(guide).toBeHidden();
  expect(await page.evaluate(() => window.__gbsDemo.guideStatus)).toBe('completed');
});

test('skipping the guide is remembered', async ({ page }) => {
  await boot(page, '/?guide=1');
  const prompt = page.locator('gbscribe-emulator [data-dialog="guide-intro"]');
  await expect(prompt).toBeVisible();
  await page.locator('gbscribe-emulator [data-guide-no]').click();
  expect(await page.evaluate((key) => localStorage.getItem(key), GUIDE_KEY)).toBe('"skipped"');

  await page.reload();
  await page.waitForFunction(() => window.__gbsDemo?.loaded === true, null, { timeout: 30_000 });
  await page.waitForTimeout(1400);
  await expect(prompt).toBeHidden();
  expect(await page.evaluate(() => window.__gbsDemo.guideStatus)).toBe('skipped');
});

test('declining the guide leaves the demo ready to use', async ({ page }) => {
  await boot(page, '/?guide=1');
  const prompt = page.locator('gbscribe-emulator [data-dialog="guide-intro"]');
  await expect(prompt).toBeVisible();
  await page.locator('gbscribe-emulator [data-guide-no]').click();
  await expect(prompt).toBeHidden();
  await expect(page.locator('gbscribe-emulator [data-guide]')).toBeHidden();
  await expect(page.locator('gbscribe-emulator [data-action="guide"]')).toBeVisible();
});

test('ending the tutorial early leaves the demo usable', async ({ page }) => {
  await boot(page, '/?guide=1');
  await page.locator('gbscribe-emulator [data-guide-yes]').click();
  const guide = page.locator('gbscribe-emulator [data-guide]');
  await expect(guide).toBeVisible();

  await page.locator('gbscribe-emulator [data-guide-end]').click();
  await expect(guide).toBeHidden();
  await expect(page.locator('gbscribe-emulator [data-action="guide"]')).toBeVisible();
});

test.describe('on a phone in portrait', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the guide recommends rotating the phone for the GBA', async ({ page }) => {
    await boot(page, '/?guide=1');
    await page.locator('gbscribe-emulator [data-guide-yes]').click();

    const guide = page.locator('gbscribe-emulator [data-guide]');
    await expect(guide).toHaveAttribute('data-step', 'rotate', { timeout: 35_000 });
    await expect(guide).toHaveAttribute('data-ready', 'true', { timeout: 35_000 });
    await expect(page.locator('gbscribe-emulator [data-guide-title]')).toHaveText(
      'Turn your phone sideways',
    );
    await expect(page.locator('gbscribe-emulator [data-guide-body]')).toContainText(
      'Rotate your phone horizontally',
    );

    await page.keyboard.press('Space');
    await expect(guide).toHaveAttribute('data-step', 'start', { timeout: 35_000 });
    await page.locator('gbscribe-emulator [data-guide-end]').click();
  });
});
