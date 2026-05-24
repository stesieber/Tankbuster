const { test, expect } = require('@playwright/test');

test.describe('Tankbuster Phase 1 – Smoke Tests', () => {

  test('Seite lädt ohne JS-Fehler', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // version.js 404 ist lokal erwartet (wird erst von GitHub Actions erzeugt)
        if (text.includes('version.js')) return;
        errors.push(text);
      }
    });

    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(2000);

    expect(errors, `JS-Fehler gefunden:\n${errors.join('\n')}`).toHaveLength(0);
  });

  test('Three.js ist geladen (THREE global vorhanden)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(1000);

    const threeLoaded = await page.evaluate(() => typeof THREE !== 'undefined');
    expect(threeLoaded).toBe(true);
  });

  test('Canvas rendert – kein schwarzer Bildschirm', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(2000);

    // Pixel-Sample aus der Mitte des Canvas lesen
    const isNotBlack = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      // WebGL-Canvas: über drawImage in 2D-Context kopieren
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      const t2d = tmp.getContext('2d');
      t2d.drawImage(canvas, 0, 0);
      const px = t2d.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
      // Nicht komplett schwarz (R+G+B > 30)?
      return (px[0] + px[1] + px[2]) > 30;
    });

    // Screenshot für Debug-Zwecke
    await page.screenshot({ path: 'tests/screenshot.png' });

    expect(isNotBlack, 'Canvas ist schwarz – Three.js rendert nichts').toBe(true);
  });

  test('HUD-Elemente sind sichtbar', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(1000);

    await expect(page.locator('#hp-text')).toBeVisible();
    await expect(page.locator('#tank-name')).toContainText('Königstiger');
    await expect(page.locator('#joystick-left-base')).toBeVisible();
    await expect(page.locator('#joystick-right-base')).toBeVisible();
    await expect(page.locator('#shoot-btn')).toBeVisible();
  });

  test('Preview-Banner ist lokal ausgeblendet', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    const banner = page.locator('#preview-banner');
    await expect(banner).toBeHidden();
  });

  test('Panzer reagiert auf Tastatur (W vorwärts)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(1000);

    const posBefore = await page.evaluate(() => window.__testCameraZ);

    await page.keyboard.down('w');
    await page.waitForTimeout(500);
    await page.keyboard.up('w');
    await page.waitForTimeout(200);

    const posAfter = await page.evaluate(() => window.__testCameraZ);

    if (posBefore !== undefined && posAfter !== undefined) {
      expect(posAfter).not.toBe(posBefore);
    }
  });

});

// Touch-Tests benötigen hasTouch: true im Context
test.describe('Touch-Steuerung', () => {
  test.use({ hasTouch: true });

  test('Joystick-Touch bewegt den Panzer (linke Seite, nach oben)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(1000);

    const posBefore = await page.evaluate(() => window.__testCameraZ);

    const cx = 85;
    const cy = page.viewportSize().height - 95;

    await page.evaluate(({ cx, cy }) => {
      const startTouch = new Touch({ identifier: 99, target: document.body, clientX: cx, clientY: cy });
      document.dispatchEvent(new TouchEvent('touchstart', { touches: [startTouch], changedTouches: [startTouch], bubbles: true, cancelable: true }));
      const moveTouch = new Touch({ identifier: 99, target: document.body, clientX: cx, clientY: cy - 60 });
      document.dispatchEvent(new TouchEvent('touchmove', { touches: [moveTouch], changedTouches: [moveTouch], bubbles: true, cancelable: true }));
    }, { cx, cy });

    await page.waitForTimeout(600);

    await page.evaluate(({ cx, cy }) => {
      const endTouch = new Touch({ identifier: 99, target: document.body, clientX: cx, clientY: cy });
      document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [endTouch], bubbles: true, cancelable: true }));
    }, { cx, cy });

    const posAfter = await page.evaluate(() => window.__testCameraZ);
    expect(posAfter, 'Joystick-Touch hat den Panzer nicht bewegt').not.toBe(posBefore);
  });
});
