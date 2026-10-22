import { test, expect } from '@playwright/test';
import {
  BINDINGS_KEY,
  CONSENT_KEY,
  PAGES_KEY,
} from '../../src/persistence.js';
import {
  boot,
  expectText,
  flushSave,
  installTestHooks,
  openEditor,
  openTitleChoice,
  saveDocument,
  tap,
  typeLower,
  waitForText,
} from './helpers.js';

async function waitForLoaded(page) {
  await page.waitForFunction(() => window.__gbsDemo?.loaded === true, null, {
    timeout: 30_000,
  });
  await installTestHooks(page);
}

test('first-load policy accepts and restores printed pages', async ({ page }) => {
  await page.goto('/?guide=0&cookies=missing');
  const policy = page.locator('gbscribe-emulator [data-dialog="cookie-policy"]');
  await expect(policy).toBeVisible();
  await expect(policy).toContainText('No data is sent to the server.');
  await expect(policy).toContainText('Every feature works without cookies.');

  await page.locator('gbscribe-emulator [data-cookie-accept]').click();
  await waitForLoaded(page);
  await expect(policy).toBeHidden();

  await page.evaluate(() => {
    const demo = window.__gbsDemo;
    for (let y = 0; y < 30; y++) {
      demo.paperStore.appendRow(new Uint8Array(160).fill((y * 3) % 4));
    }
  });
  await expect(page.locator('gbscribe-emulator [data-paper]')).toBeVisible();

  await page.reload();
  await waitForLoaded(page);
  await expect(page.locator('gbscribe-emulator [data-paper]')).toBeVisible();
  expect(await page.evaluate(() => window.__gbsTest.paperRows())).toBe(30);

  await page.evaluate(() => window.__gbsDemo.tearPaper());
  await expect(page.locator('gbscribe-emulator .gbs-page-card')).toHaveCount(1);
  expect(await page.evaluate((key) => localStorage.getItem(key), PAGES_KEY)).toBeTruthy();

  await page.reload();
  await waitForLoaded(page);
  await expect(policy).toBeHidden();
  await expect(page.locator('gbscribe-emulator .gbs-page-card')).toHaveCount(1);
});

test('rejecting storage keeps the demo working without saving anything', async ({ page }) => {
  await page.goto('/?guide=0&cookies=missing');
  const policy = page.locator('gbscribe-emulator [data-dialog="cookie-policy"]');
  await expect(policy).toBeVisible();
  await page.locator('gbscribe-emulator [data-cookie-reject]').click();
  await waitForLoaded(page);
  await waitForText(page, 'PRESS START');

  await page.evaluate(() => {
    const demo = window.__gbsDemo;
    for (let y = 0; y < 30; y++) {
      demo.paperStore.appendRow(new Uint8Array(160).fill((y * 3) % 4));
    }
    demo.tearPaper();
    demo.gba.storeSavedata();
  });
  await expect(page.locator('gbscribe-emulator .gbs-page-card')).toHaveCount(1);

  const stored = await page.evaluate(() => ({ ...localStorage }));
  expect(stored[CONSENT_KEY]).toBe('rejected');
  expect(stored[PAGES_KEY]).toBeUndefined();
  expect(stored[BINDINGS_KEY]).toBeUndefined();
  expect(Object.keys(stored).some((key) => key.startsWith('com.endrift.gbajs.'))).toBe(false);

  await page.reload();
  await waitForLoaded(page);
  await expect(policy).toBeHidden();
  await expect(page.locator('gbscribe-emulator .gbs-page-card')).toHaveCount(0);
});

test('accepted storage restores remapped controls', async ({ page }) => {
  await boot(page);
  await page.locator('gbscribe-emulator [data-action="controls"]').click();
  await page.locator('gbscribe-emulator [data-rebind="A"]').click();
  await page.keyboard.press('KeyQ');
  await expect(page.locator('gbscribe-emulator [data-binding="A"]')).toHaveText('Q');
  await page.locator('gbscribe-emulator [data-dialog="controls"] [data-close]').first().click();

  await page.reload();
  await waitForLoaded(page);
  await page.locator('gbscribe-emulator [data-action="controls"]').click();
  await expect(page.locator('gbscribe-emulator [data-binding="A"]')).toHaveText('Q');
});

test('accepted storage restores the GBScribe save file', async ({ page }) => {
  await boot(page);
  await openEditor(page);
  await typeLower(page, 'saved');
  await saveDocument(page, 0);
  await flushSave(page);

  const gbaKeys = await page.evaluate(() =>
    Object.keys(localStorage).filter((key) => key.startsWith('com.endrift.gbajs.')),
  );
  expect(gbaKeys.length).toBeGreaterThan(0);

  await page.reload();
  await waitForLoaded(page);
  await waitForText(page, 'PRESS START');
  await openTitleChoice(page, 2);
  await waitForText(page, 'LOAD A FILE');
  await tap(page, 'A');
  await page.waitForTimeout(500);
  await expectText(page, 'saved');
});
