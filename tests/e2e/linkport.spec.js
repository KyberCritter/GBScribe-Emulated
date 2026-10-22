import { test, expect } from '@playwright/test';
import { boot } from './helpers.js';

test.describe('Reusable GBA.js link port and host controls', () => {
  test.beforeEach(async ({ page }) => {
    await boot(page);
  });

  test('GPIO link port clocks generic devices and exposes SI', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const module = await import('/src/linkport/gba-linkport.js');
      const first = module.installGbaLinkPort();
      const second = module.installGbaLinkPort();

      const gba = new window.GameBoyAdvance();
      const events = [];
      const fake = {
        clockCount: 0,
        lastBit: null,
        sout: 1,
        attach() { events.push('attach'); },
        detach() { events.push('detach'); },
        clock(bit) { this.clockCount++; this.lastBit = bit; return this.sout; },
        getSOUT() { return this.sout; },
      };
      gba.sio.attachDevice(fake);
      gba.sio.setMode(gba.sio.SIO_GPIO);
      gba.sio.clear(); // must preserve the plugged-in device
      gba.sio.writeRCNT(0x8000 | 0x10 | 0x80 | 8); // SC low, SO=1, SC/SO outputs
      gba.sio.writeRCNT(0x8000 | 0x10 | 0x80 | 9); // rising edge
      fake.sout = 0;
      const low = gba.sio.readRCNT();
      fake.sout = 1;
      const high = gba.sio.readRCNT();
      const detached = gba.sio.detachDevice();
      return {
        sameInstall: first === second,
        installed: first.installed,
        clocks: fake.clockCount,
        lastBit: fake.lastBit,
        siLow: (low >> 2) & 1,
        siHigh: (high >> 2) & 1,
        events,
        detached: detached === fake,
        preserveDevice: !!gba.sio,
      };
    });

    expect(result.sameInstall).toBe(true);
    expect(result.installed).toBe(true);
    expect(result.clocks).toBe(1);
    expect(result.lastBit).toBe(1);
    expect(result.siLow).toBe(0);
    expect(result.siHigh).toBe(1);
    expect(result.events).toEqual(['attach', 'detach']);
    expect(result.detached).toBe(true);
  });

  test('keyboard bindings are remappable and on-screen buttons press GBA keys', async ({ page }) => {
    await page.locator('gbscribe-emulator [data-action="controls"]').click();
    await expect(page.locator('gbscribe-emulator [data-dialog="controls"]')).toBeVisible();
    await page.locator('gbscribe-emulator [data-rebind="A"]').click();
    await page.keyboard.press('KeyQ');
    await expect(page.locator('gbscribe-emulator [data-binding="A"]')).toHaveText('Q');
    await page.locator('gbscribe-emulator [data-dialog="controls"] [data-close]').first().click();

    await page.locator('gbscribe-emulator .gbs-screen-mount').click();
    await page.keyboard.down('KeyQ');
    expect(await page.evaluate(() => (window.__gbsDemo.gba.keypad.currentDown & 1) === 0)).toBe(true);
    await page.keyboard.up('KeyQ');
    expect(await page.evaluate(() => (window.__gbsDemo.gba.keypad.currentDown & 1) === 1)).toBe(true);

    // On-screen Start: real pointer events, active-low keypad bit 3.
    const startButton = page.locator('gbscribe-emulator [data-button="START"]');
    await startButton.scrollIntoViewIfNeeded();
    const box = await startButton.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    expect(await page.evaluate(() => (window.__gbsDemo.gba.keypad.currentDown & (1 << 3)) === 0)).toBe(true);
    await page.mouse.up();
    await page.waitForTimeout(80);
    expect(await page.evaluate(() => (window.__gbsDemo.gba.keypad.currentDown & (1 << 3)) !== 0)).toBe(true);

    // Reset defaults.
    await page.locator('gbscribe-emulator [data-action="controls"]').click();
    await page.locator('gbscribe-emulator [data-reset-bindings]').click();
    await expect(page.locator('gbscribe-emulator [data-binding="A"]')).toHaveText('Z');
  });

  test('the printer device can be driven through the byte-level adapter', async ({ page }) => {
    const replies = await page.evaluate(async () => {
      const { GBPrinterDevice, CMD } = await import('/src/printer/gb-printer.js');
      const { ByteLinkAdapter } = await import('/src/linkport/byte-link.js');
      const printer = new GBPrinterDevice();
      const cable = new ByteLinkAdapter(printer);
      const packet = (cmd, payload = []) => {
        const bytes = [0x88, 0x33, cmd, 0, payload.length & 0xff, payload.length >> 8, ...payload];
        let sum = 0;
        for (let i = 2; i < bytes.length; i++) sum = (sum + bytes[i]) & 0xffff;
        bytes.push(sum & 0xff, sum >> 8, 0, 0);
        return bytes;
      };
      const out = packet(CMD.INQUIRY).map((byte) => cable.transferByte(byte));
      return out.slice(-2);
    });
    expect(replies[0]).toBe(0x81);
    expect(replies[1]).toBe(0x00);
  });
});
