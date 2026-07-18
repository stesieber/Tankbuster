const { test, expect } = require('@playwright/test');

// Seit Phase 5 muss vor der Schwierigkeitsauswahl erst ein Panzer gewählt werden
// (Panzerauswahl-Bildschirm liegt über dem Start-Screen).
async function selectTank(page, key = 'koenigstiger') {
  await page.click(`#btn-select-${key}`);
  await page.waitForTimeout(200);
}

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
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(500);

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

// ── Phase 3 Tests ────────────────────────────────────────────────────────────
test.describe('Phase 3 – Gegner-System', () => {

  test('Startscreen mit Schwierigkeitsauswahl erscheint', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#btn-diff-einfach')).toBeVisible();
    await expect(page.locator('#btn-diff-normal')).toBeVisible();
    await expect(page.locator('#btn-diff-schwer')).toBeVisible();
  });

  test('5 Gegner werden nach Spielstart erstellt', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(1000);

    const count = await page.evaluate(() => window.__testEnemyCount);
    expect(count, '5 Gegner müssen vorhanden sein').toBe(5);
  });

  test('Gegner-Zähler zeigt 5 / 5 nach Spielstart', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(500);

    const counter = await page.locator('#enemies-left').textContent();
    expect(counter.trim()).toBe('5');
  });

  test('Gewonnen-Overlay erscheint nach game-state-Manipulation', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(500);

    await page.evaluate(() => window.__testTriggerGameOver('gewonnen'));
    await page.waitForTimeout(200);

    await expect(page.locator('#game-overlay')).toBeVisible();
    await expect(page.locator('#overlay-title')).toContainText('Sieg');
  });

  test('Verloren-Overlay erscheint nach game-state-Manipulation', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(500);

    await page.evaluate(() => window.__testTriggerGameOver('verloren'));
    await page.waitForTimeout(200);

    await expect(page.locator('#game-overlay')).toBeVisible();
    await expect(page.locator('#overlay-title')).toContainText('Niederlage');
  });

  test('Nochmal-spielen-Button ist sichtbar und hat korrekten Text', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(500);

    await page.evaluate(() => window.__testTriggerGameOver('verloren'));
    await page.waitForTimeout(200);

    const btn = page.locator('#overlay-button');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Nochmal');
  });

  test('Minimap ist im DOM vorhanden', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    await expect(page.locator('#minimap')).toBeAttached();
  });

  test('Spieler-HP startet bei 100', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    const hp = await page.evaluate(() => window.__testPlayerHP);
    expect(hp).toBe(100);
  });

  test('Spieler-Treffer reduziert HP', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    await page.evaluate(() => window.__testPlayerGetHit(30));
    const hp = await page.evaluate(() => window.__testPlayerHP);
    expect(hp).toBe(70);
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
    await page.waitForTimeout(500);
    await page.tap('#btn-select-koenigstiger');
    await page.waitForTimeout(200);
    await page.tap('#btn-diff-normal');
    await page.waitForTimeout(500);

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

// ── Phase 5 Tests ────────────────────────────────────────────────────────────
test.describe('Phase 5 – Panzerauswahl', () => {

  test('Panzerauswahl-Bildschirm erscheint zuerst mit beiden Panzern', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    await expect(page.locator('#tank-select-screen')).toBeVisible();
    await expect(page.locator('#tank-card-koenigstiger')).toBeVisible();
    await expect(page.locator('#tank-card-leopard')).toBeVisible();
    await expect(page.locator('#btn-select-koenigstiger')).toBeVisible();
    await expect(page.locator('#btn-select-leopard')).toBeVisible();
  });

  test('Panzerauswahl-Vorschauen rendern (Canvas nicht leer)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(800);

    for (const id of ['preview-koenigstiger', 'preview-leopard']) {
      const isNotBlack = await page.evaluate((canvasId) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas || canvas.width === 0 || canvas.height === 0) return false;
        const tmp = document.createElement('canvas');
        tmp.width = canvas.width;
        tmp.height = canvas.height;
        const ctx = tmp.getContext('2d');
        ctx.drawImage(canvas, 0, 0);
        const px = ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
        return (px[0] + px[1] + px[2]) > 10;
      }, id);
      expect(isNotBlack, `${id} rendert nichts`).toBe(true);
    }
  });

  test('Auswahl Königstiger startet Spiel mit korrekten Werten (langsam, viel HP)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'koenigstiger');

    const selected = await page.evaluate(() => window.__testSelectedTank);
    const hp       = await page.evaluate(() => window.__testPlayerHP);
    const speed    = await page.evaluate(() => window.__testTankMaxSpeed);

    expect(selected).toBe('koenigstiger');
    expect(hp).toBe(140);
    expect(speed).toBeCloseTo(0.24, 2);

    await expect(page.locator('#tank-select-screen')).toBeHidden();
    await expect(page.locator('#tank-name')).toContainText('Königstiger');
  });

  test('Auswahl Leopard 2 A8 ist schneller aber hat weniger HP als Königstiger', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'leopard');

    const selected = await page.evaluate(() => window.__testSelectedTank);
    const hp       = await page.evaluate(() => window.__testPlayerHP);
    const speed    = await page.evaluate(() => window.__testTankMaxSpeed);

    expect(selected).toBe('leopard');
    expect(hp).toBe(95);
    expect(hp).toBeLessThan(140);
    expect(speed).toBeGreaterThan(0.30); // schneller als Basis-Höchstgeschwindigkeit
    await expect(page.locator('#tank-name')).toContainText('Leopard');
  });

});

test.describe('Phase 5 – Zielfernrohr-Zoom', () => {

  test('Scope-Button zoomt Kamera rein und zeigt Fadenkreuz/Vignette', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    await expect(page.locator('#scope')).toBeHidden();

    await page.click('#btn-scope');
    await page.waitForTimeout(200);

    await expect(page.locator('#scope')).toBeVisible();
    await expect(page.locator('#btn-scope')).toHaveClass(/active/);

    await page.click('#btn-scope');
    await page.waitForTimeout(200);
    await expect(page.locator('#scope')).toBeHidden();
  });

});

test.describe('Phase 5 – Waffen-Anzeige', () => {

  test('Kanonen-Slot zeigt Cooldown nach Schuss, andere Slots bleiben unberührt', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    await expect(page.locator('#weapon-slot-cannon')).toHaveClass(/ready/);

    await page.click('#shoot-btn');
    await page.waitForTimeout(150);

    await expect(page.locator('#weapon-slot-cannon')).toHaveClass(/cooldown/);
    await expect(page.locator('#weapon-slot-rocket')).toHaveClass(/ready/);
  });

  test('MG-Slot wird beim Halten der MG-Taste aktiv', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    await page.hover('#btn-mg');
    await page.mouse.down();
    await page.waitForTimeout(150);
    await expect(page.locator('#weapon-slot-mg')).toHaveClass(/active/);
    await page.mouse.up();
  });

});
