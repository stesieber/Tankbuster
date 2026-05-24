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

  // Hilfsfunktion: Touch-Event via page.evaluate dispatchen
  async function dispatchTouch(page, type, id, x, y) {
    await page.evaluate(({ type, id, x, y }) => {
      const t = new Touch({ identifier: id, target: document.body, clientX: x, clientY: y });
      const active = type === 'touchend' ? [] : [t];
      document.dispatchEvent(new TouchEvent(type, { touches: active, changedTouches: [t], bubbles: true, cancelable: true }));
    }, { type, id, x, y });
  }

  test('Joystick-Touch bewegt den Panzer (linke Seite, nach oben)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(1000);

    const posBefore = await page.evaluate(() => window.__testCameraZ);
    const cx = 85;
    const cy = page.viewportSize().height - 95;

    await dispatchTouch(page, 'touchstart', 99, cx, cy);
    await dispatchTouch(page, 'touchmove',  99, cx, cy - 60);
    await page.waitForTimeout(600);
    await dispatchTouch(page, 'touchend',   99, cx, cy);

    const posAfter = await page.evaluate(() => window.__testCameraZ);
    expect(posAfter, 'Joystick-Touch hat den Panzer nicht bewegt').not.toBe(posBefore);
  });

  // REGRESSION TEST: Joystick am unteren Rand des Joystick-Bereichs antippen
  // Bug: getBoundingClientRect() lieferte auf Mobile falsche Koordinaten,
  //      sodass nur Touches ÜBER dem Joystick registriert wurden.
  test('Joystick reagiert bei Touch am unteren Joystick-Rand', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(1000);

    // Touch am untersten Punkt des linken Joystick-Bereichs (bottom: 40px)
    const cx = 85;
    const cy = page.viewportSize().height - 50; // fast am Bildschirmrand

    await dispatchTouch(page, 'touchstart', 42, cx, cy);
    // Joystick muss nach touchstart aktiv sein
    const isActive = await page.evaluate(() => window.__testJoystickLeft?.active);
    expect(isActive, 'Joystick wurde am unteren Rand nicht aktiviert').toBe(true);

    await dispatchTouch(page, 'touchend', 42, cx, cy);
  });

  // REGRESSION TEST: Kanone zeigt nach vorne (nicht seitwärts)
  // rotation.z=PI/2 (Bug): Zylinder-Längsachse zeigt in X-Richtung (seitwärts), |dir.z| ≈ 0
  // rotation.x=PI/2 (Fix): Zylinder-Längsachse zeigt in Z-Richtung (vorwärts), |dir.z| ≈ 1
  test('Kanone zeigt nach vorne – Längsachse entlang Z, nicht X', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    const dir = await page.evaluate(() => window.__testCannonDir);
    expect(dir, '__testCannonDir nicht gesetzt').toBeTruthy();
    expect(
      Math.abs(dir.z),
      `Kanone zeigt seitwärts: dir=(${dir.x.toFixed(2)}, ${dir.y.toFixed(2)}, ${dir.z.toFixed(2)}), erwartet |z|>0.9`
    ).toBeGreaterThan(0.9);
  });
});
