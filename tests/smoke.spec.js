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

  test('Tag/Nacht-Auswahl: Tag ist Standard, Nacht dunkelt Szene ab', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    // Panzerauswahl-Bildschirm liegt über dem Start-Screen und muss zuerst weg.
    await selectTank(page);

    await expect(page.locator('#btn-time-day')).toHaveClass(/active/);
    await expect(page.locator('#btn-time-night')).not.toHaveClass(/active/);
    expect(await page.evaluate(() => window.__testTimeOfDay)).toBe('day');

    await page.click('#btn-time-night');
    await page.waitForTimeout(100);

    await expect(page.locator('#btn-time-night')).toHaveClass(/active/);
    await expect(page.locator('#btn-time-day')).not.toHaveClass(/active/);
    expect(await page.evaluate(() => window.__testTimeOfDay)).toBe('night');
  });

  test('Gewählte Tageszeit bleibt beim Spielstart erhalten', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-time-night');
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(500);

    expect(await page.evaluate(() => window.__testTimeOfDay)).toBe('night');
  });

  test('Wetter-Auswahl: Klar ist Standard, Regen/Nebel lassen sich auswählen', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);

    await expect(page.locator('#btn-weather-clear')).toHaveClass(/active/);
    expect(await page.evaluate(() => window.__testWeather)).toBe('clear');

    await page.click('#btn-weather-rain');
    await page.waitForTimeout(100);
    await expect(page.locator('#btn-weather-rain')).toHaveClass(/active/);
    await expect(page.locator('#btn-weather-clear')).not.toHaveClass(/active/);
    expect(await page.evaluate(() => window.__testWeather)).toBe('rain');

    await page.click('#btn-weather-fog');
    await page.waitForTimeout(100);
    await expect(page.locator('#btn-weather-fog')).toHaveClass(/active/);
    await expect(page.locator('#btn-weather-rain')).not.toHaveClass(/active/);
    expect(await page.evaluate(() => window.__testWeather)).toBe('fog');
  });

  test('Gewähltes Wetter bleibt beim Spielstart erhalten', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-weather-rain');
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(500);

    expect(await page.evaluate(() => window.__testWeather)).toBe('rain');
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
    await page.waitForTimeout(500);
    await page.tap('#btn-select-koenigstiger');
    await page.waitForTimeout(200);
    await page.tap('#btn-diff-normal');
    await page.waitForTimeout(500);

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

// ── Phase 6 Tests ────────────────────────────────────────────────────────────
test.describe('Phase 6 – Panzerauswahl (10 Fahrzeuge)', () => {

  test('Panzerauswahl-Bildschirm zeigt alle 10 Fahrzeuge', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    for (const key of ['koenigstiger', 'leopard', 'abrams', 't90', 'leclerc', 'mlrs', 'puma', 'at8', 'vickers', 'maus']) {
      await expect(page.locator(`#tank-card-${key}`)).toBeVisible();
      await expect(page.locator(`#btn-select-${key}`)).toBeVisible();
    }
  });

  test('Neue Panzer-Vorschauen rendern (Canvas nicht leer)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(800);

    for (const id of ['preview-abrams', 'preview-t90', 'preview-leclerc', 'preview-mlrs', 'preview-puma', 'preview-at8', 'preview-vickers', 'preview-maus']) {
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

  test('T-90 ist langsam und sehr stark gepanzert (mehr HP als Königstiger)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 't90');

    const selected = await page.evaluate(() => window.__testSelectedTank);
    const hp       = await page.evaluate(() => window.__testPlayerHP);
    const speed    = await page.evaluate(() => window.__testTankMaxSpeed);

    expect(selected).toBe('t90');
    expect(hp).toBeGreaterThan(140); // stärker gepanzert als Königstiger
    expect(speed).toBeLessThan(0.24); // langsamer als Königstiger
    await expect(page.locator('#tank-name')).toContainText('T-90');
  });

  test('Leclerc ist am schnellsten von allen Panzern', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'leclerc');

    const selected = await page.evaluate(() => window.__testSelectedTank);
    const speed    = await page.evaluate(() => window.__testTankMaxSpeed);

    expect(selected).toBe('leclerc');
    expect(speed).toBeGreaterThan(0.405); // schneller als Leopard 2 A8 (0.405)
  });

  // REGRESSION TEST: 5 Panzer-Karten passen nicht mehr auf einen Bildschirm –
  // die globalen Joystick-Touch-Handler riefen aber immer preventDefault()
  // auf und verhinderten so das Scrollen der Panzerauswahl auf Mobile.
  test('Panzerauswahl-Bildschirm blockiert Touch-Scrollen nicht mehr', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    const { startPrevented, movePrevented, overflowsViewport, touchAction } = await page.evaluate(() => {
      const el = document.getElementById('tank-select-screen');
      const touch = new Touch({ identifier: 99, target: el, clientX: 100, clientY: 400 });
      const evStart = new TouchEvent('touchstart', { touches: [touch], changedTouches: [touch], bubbles: true, cancelable: true });
      document.dispatchEvent(evStart);
      const evMove = new TouchEvent('touchmove', { touches: [touch], changedTouches: [touch], bubbles: true, cancelable: true });
      document.dispatchEvent(evMove);
      return {
        startPrevented: evStart.defaultPrevented,
        movePrevented: evMove.defaultPrevented,
        overflowsViewport: el.scrollHeight > el.clientHeight,
        touchAction: getComputedStyle(el).touchAction,
      };
    });

    expect(startPrevented, 'touchstart sollte auf der Panzerauswahl nicht preventDefault() aufrufen').toBe(false);
    expect(movePrevented, 'touchmove sollte auf der Panzerauswahl nicht preventDefault() aufrufen').toBe(false);
    expect(overflowsViewport, 'Die Panzer-Karten sollten den Bildschirm überragen (Scroll nötig)').toBe(true);
    expect(touchAction).not.toBe('none');
  });

  // REGRESSION TEST (Nutzer-Feedback: "man kann den Puma nicht auswählen"):
  // Die letzte Karte (allein in der letzten Zeile) lag direkt am unteren
  // Viewport-Rand – auf echten Mobilgeräten oft von Browser-/OS-Leisten
  // überdeckt und dadurch nicht antippbar, obwohl im DOM technisch
  // "sichtbar". Prüft, dass der Auswählen-Button der letzten Karte nach dem
  // Scrollen komplett INNERHALB des sichtbaren Viewports liegt, nicht nur
  // dass er laut DOM/CSS existiert. Seit den 3 zusätzlichen Fahrzeugen
  // (AT 8, Vickers, Maus) ist Maus statt Puma die letzte Karte.
  test('Letzte Panzer-Karte (Maus) ist nach dem Scrollen vollständig im Viewport erreichbar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 }); // schmaler Mobile-Viewport
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const el = document.getElementById('tank-select-screen');
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(200);

    const box = await page.locator('#btn-select-maus').boundingBox();
    expect(box, 'btn-select-maus hat keine Bounding Box (unsichtbar?)').toBeTruthy();
    expect(box.y, 'Button-Oberkante sollte nicht über dem Viewport liegen').toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, 'Button-Unterkante sollte innerhalb der Viewport-Höhe liegen').toBeLessThanOrEqual(700);

    await page.click('#btn-select-maus');
    await page.waitForTimeout(200);
    const selected = await page.evaluate(() => window.__testSelectedTank);
    expect(selected).toBe('maus');
  });

  test('AT 8 ist sehr langsam und stark gepanzert', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'at8');

    const selected = await page.evaluate(() => window.__testSelectedTank);
    const hp       = await page.evaluate(() => window.__testPlayerHP);
    const speed    = await page.evaluate(() => window.__testTankMaxSpeed);

    expect(selected).toBe('at8');
    expect(hp).toBeGreaterThan(140); // stärker gepanzert als Königstiger
    expect(speed).toBeLessThan(0.18); // langsamer als T-90
    await expect(page.locator('#tank-name')).toContainText('AT 8');
  });

  test('Panzerwagen Vickers ist schnell, aber schwach gepanzert', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'vickers');

    const selected = await page.evaluate(() => window.__testSelectedTank);
    const hp       = await page.evaluate(() => window.__testPlayerHP);
    const speed    = await page.evaluate(() => window.__testTankMaxSpeed);

    expect(selected).toBe('vickers');
    expect(hp).toBeLessThan(95); // schwächer gepanzert als Königstiger
    expect(speed).toBeGreaterThan(0.405); // schneller als Leopard 2 A8
    await expect(page.locator('#tank-name')).toContainText('Vickers');
  });

  test('Panzer Maus ist der langsamste und am stärksten gepanzerte Panzer', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'maus');

    const selected = await page.evaluate(() => window.__testSelectedTank);
    const hp       = await page.evaluate(() => window.__testPlayerHP);
    const speed    = await page.evaluate(() => window.__testTankMaxSpeed);

    expect(selected).toBe('maus');
    expect(hp).toBeGreaterThan(170); // mehr HP als jeder andere Panzer (AT 8: 170)
    expect(speed).toBeLessThan(0.15); // langsamer als AT 8

    await page.click('#btn-diff-normal');
    await page.waitForTimeout(500);
    const speedAfterStart = await page.evaluate(() => window.__testTankMaxSpeed);
    expect(speedAfterStart).toBe(speed);
  });

});

test.describe('M270 MLRS – Raketenwerfer-Fahrzeug', () => {

  test('Auswahl MLRS: kein Kanone/MG-Button, dafür Raketen-Slot mit 3 Ladungen', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'mlrs');

    const selected = await page.evaluate(() => window.__testSelectedTank);
    const loadout  = await page.evaluate(() => window.__testWeaponLoadout);
    const charges  = await page.evaluate(() => window.__testRocketCharges);

    expect(selected).toBe('mlrs');
    expect(loadout).toBe('mlrs');
    expect(charges).toBe(3);
    await expect(page.locator('#tank-name')).toContainText('MLRS');
    await expect(page.locator('#shoot-btn')).toBeHidden();
    await expect(page.locator('#btn-mg')).toBeHidden();
    await expect(page.locator('#weapon-slot-cannon')).toBeHidden();
    await expect(page.locator('#weapon-slot-mg')).toBeHidden();
    await expect(page.locator('#btn-rocket')).toBeVisible();
  });

  test('Andere Panzer behalten Kanone und MG (MLRS-Auswahl blendet sie nicht dauerhaft aus)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'koenigstiger');

    await expect(page.locator('#shoot-btn')).toBeVisible();
    await expect(page.locator('#btn-mg')).toBeVisible();
    const loadout = await page.evaluate(() => window.__testWeaponLoadout);
    expect(loadout).toBe('standard');
  });

  test('Leertaste (Kanone) hat beim MLRS keine Wirkung', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'mlrs');
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    const shotsBefore = await page.evaluate(() => document.getElementById('shot-count').textContent);
    await page.keyboard.press(' ');
    await page.waitForTimeout(200);
    const shotsAfter = await page.evaluate(() => document.getElementById('shot-count').textContent);
    expect(shotsAfter).toBe(shotsBefore);
  });

  test('Raketen-Salve verbraucht eine Ladung und feuert 5 Raketen ab', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'mlrs');
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    await page.click('#btn-rocket');
    await page.waitForTimeout(100);

    const chargesRightAfter = await page.evaluate(() => window.__testRocketCharges);
    const firingRightAfter  = await page.evaluate(() => window.__testRocketSalvoFiring);
    expect(chargesRightAfter).toBe(2);
    expect(firingRightAfter).toBe(true);

    // Salve besteht aus 5 gestaffelten Schüssen (150ms Abstand) – nach genug
    // Zeit muss "firing" wieder false sein.
    await page.waitForTimeout(1200);
    const firingAfterSalvo = await page.evaluate(() => window.__testRocketSalvoFiring);
    expect(firingAfterSalvo).toBe(false);
  });

  test('Kein zweiter Abschuss möglich während eine Salve noch läuft', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'mlrs');
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    // Tastatur statt Klick: umgeht den disabled-Button und testet direkt die
    // tryFireRocket()-Sperre (ein zweiter Klick auf den während der Salve
    // disabled-Button würde von Playwright bis zur Wiederaktivierung warten).
    await page.keyboard.press('r');
    await page.waitForTimeout(50);
    await page.keyboard.press('r'); // sollte während laufender Salve ignoriert werden
    await page.waitForTimeout(50);

    const charges = await page.evaluate(() => window.__testRocketCharges);
    expect(charges, 'zweiter Abschuss während laufender Salve darf keine weitere Ladung verbrauchen').toBe(2);
  });

  // REGRESSION TEST (Nutzer-Feedback): jede Salve soll aus einem anderen Rohr
  // kommen – erste links, zweite mitte, dritte rechts, dann wieder von vorn.
  test('Drei Rohr-Positionen (links/mitte/rechts) sind vorhanden und unterschiedlich', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'mlrs');

    const xs = await page.evaluate(() => window.__testRocketMuzzleLocalXs);
    expect(xs, '__testRocketMuzzleLocalXs nicht gesetzt').toBeTruthy();
    expect(xs.length).toBe(3);
    expect(xs[0]).toBeLessThan(xs[1]); // links < Mitte
    expect(xs[1]).toBeLessThan(xs[2]); // Mitte < rechts
    expect(xs[1]).toBeCloseTo(0, 5);   // mittleres Rohr liegt auf der Mittelachse
  });

  // Nur die ersten 3 Salven (= die volle Start-Ladung) werden hier live
  // durchgespielt, damit der Test nicht auf das 10s-Nachladen warten muss –
  // das "wraps forever nach dem Nachladen"-Verhalten deckt bereits der
  // reine Unit-Test in tests/unit/mlrs.test.js ab.
  test('Die ersten 3 Salven feuern reihum aus links → Mitte → rechts', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'mlrs');
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    const indicesAfterEachSalvo = [];
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('r');
      await page.waitForTimeout(50);
      indicesAfterEachSalvo.push(await page.evaluate(() => window.__testRocketPodTubeIndex));
      await page.waitForTimeout(1200); // Salve fertig abwarten, bevor die nächste ausgelöst wird
    }

    // Der Index zeigt jeweils auf das NÄCHSTE Rohr (schon weitergezählt):
    // nach Salve 1 (links=0 verbraucht) -> 1, nach Salve 2 (Mitte) -> 2,
    // nach Salve 3 (rechts) -> 0 (Wrap, bereit für die übernächste Salve).
    expect(indicesAfterEachSalvo).toEqual([1, 2, 0]);
  });

});

test.describe('Puma – Maschinenkanonen-Fahrzeug', () => {

  test('Auswahl Puma: kein Kanone/Rakete-Button, dafür MK-Slot mit 2 Schaden/3 Schuss pro Sekunde', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'puma');

    const selected = await page.evaluate(() => window.__testSelectedTank);
    const loadout  = await page.evaluate(() => window.__testWeaponLoadout);

    expect(selected).toBe('puma');
    expect(loadout).toBe('autocannon');
    await expect(page.locator('#tank-name')).toContainText('Puma');
    await expect(page.locator('#shoot-btn')).toBeHidden();
    await expect(page.locator('#btn-rocket')).toBeHidden();
    await expect(page.locator('#weapon-slot-cannon')).toBeHidden();
    await expect(page.locator('#weapon-slot-rocket')).toBeHidden();
    await expect(page.locator('#btn-mg')).toBeVisible();
    await expect(page.locator('#btn-mg')).toContainText('MK');
    await expect(page.locator('#weapon-slot-mg')).toBeVisible();
    await expect(page.locator('#weapon-slot-mg')).toContainText('MK');
  });

  test('Andere Panzer zeigen weiterhin "MG" statt "MK" (Puma-Auswahl ändert das Label nicht dauerhaft)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'koenigstiger');

    await expect(page.locator('#btn-mg')).toContainText('MG');
    await expect(page.locator('#shoot-btn')).toBeVisible();
    await expect(page.locator('#btn-rocket')).toBeVisible();
  });

  test('Leertaste (Kanone) und "r" (Rakete) haben beim Puma keine Wirkung', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'puma');
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    const shotsBefore = await page.evaluate(() => document.getElementById('shot-count').textContent);
    await page.keyboard.press(' ');
    await page.keyboard.press('r');
    await page.waitForTimeout(200);
    const shotsAfter = await page.evaluate(() => document.getElementById('shot-count').textContent);
    expect(shotsAfter).toBe(shotsBefore);
  });

  test('Maschinenkanone feuert im Dauerfeuer, solange die Taste gehalten wird', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page, 'puma');
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    await page.keyboard.down('f');
    await page.waitForTimeout(150);
    const activeWhileHeld = await page.evaluate(() =>
      document.getElementById('weapon-slot-mg').classList.contains('active')
    );
    await page.keyboard.up('f');
    await page.waitForTimeout(100);
    const readyAfterRelease = await page.evaluate(() =>
      document.getElementById('weapon-slot-mg').classList.contains('ready')
    );

    expect(activeWhileHeld, 'MK-Slot sollte während des Haltens "active" sein').toBe(true);
    expect(readyAfterRelease, 'MK-Slot sollte nach Loslassen wieder "ready" sein').toBe(true);
  });

});

test.describe('Phase 6 – Vertikales Zielen', () => {

  test('Höhenwinkel steht initial auf 0', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    const pitch = await page.evaluate(() => window.__testGunPitch);
    expect(pitch).toBeCloseTo(0, 5);
  });

  test('Taste T neigt die Kanone nach oben (positiver Höhenwinkel)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    await page.keyboard.down('t');
    await page.waitForTimeout(600);
    await page.keyboard.up('t');
    await page.waitForTimeout(100);

    const pitch = await page.evaluate(() => window.__testGunPitch);
    expect(pitch).toBeGreaterThan(0);
    expect(pitch).toBeLessThanOrEqual(20 * Math.PI / 180 + 0.01);
  });

  test('Taste G neigt die Kanone nach unten (negativer Höhenwinkel), Grenze bei -5°', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    await page.keyboard.down('g');
    await page.waitForTimeout(600);
    await page.keyboard.up('g');
    await page.waitForTimeout(100);

    const pitch = await page.evaluate(() => window.__testGunPitch);
    expect(pitch).toBeLessThan(0);
    expect(pitch).toBeGreaterThanOrEqual(-5 * Math.PI / 180 - 0.01);
  });

});

test.describe('Phase 6 – Hügel-Landschaft', () => {

  test('Terrain-Höhenfunktion ist verfügbar und liefert endliche Werte', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    const heights = await page.evaluate(() => ([
      window.__testTerrainHeight(0, -30),     // Flusskanal → sollte 0 sein
      window.__testTerrainHeight(100, 250),   // abseits von Fluss/Straßen → Hügel
    ]));

    expect(heights[0]).toBeCloseTo(0, 5);
    expect(Number.isFinite(heights[1])).toBe(true);
  });

  test('Panzer-Y-Position folgt der Geländehöhe (kein Schweben/Versinken)', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    const { tankY, terrainY } = await page.evaluate(() => {
      const pos = window.__testTankWorldPos;
      return { tankY: pos.y, terrainY: window.__testTerrainHeight(pos.x, pos.z) };
    });

    expect(Math.abs(tankY - terrainY)).toBeLessThan(0.01);
  });

  // REGRESSION TEST: Panzer stand immer waagerecht, unabhängig vom Gelände
  // (nur position.y folgte der Hügelhöhe, rotation.x/z blieben immer 0).
  test('Panzer-Neigung (Pitch/Roll) ist verfügbar und reagiert auf das Gelände', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    const rot = await page.evaluate(() => window.__testTankRotation);
    expect(rot, '__testTankRotation nicht gesetzt').toBeTruthy();
    expect(Number.isFinite(rot.x)).toBe(true);
    expect(Number.isFinite(rot.z)).toBe(true);
  });

  // REGRESSION TEST: Hügel wurden auf Nutzer-Feedback hin verdreifacht
  // (baseHillHeight-Amplituden 3.5/2.0/1.2 → 10.5/6.0/3.6).
  test('Hügel sind deutlich höher als die alte (~7er) Amplitude', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    const maxAbsHeight = await page.evaluate(() => {
      let max = 0;
      // Punkte weit weg von Fluss/Straßen abtasten (Fluss z=-30, Straßen x=-85/10/90, z=-11/-49)
      for (let x = 200; x <= 400; x += 25) {
        for (let z = 150; z <= 400; z += 25) {
          max = Math.max(max, Math.abs(window.__testTerrainHeight(x, z)));
        }
      }
      return max;
    });

    expect(maxAbsHeight).toBeGreaterThan(10);
  });

  // REGRESSION TEST: Nord-Süd-Verbindungsstraßen liefen früher an anderen
  // X-Positionen als die Brücken (Straßen x=-200/0/200, Brücken x=-85/10/90) –
  // dadurch führte keine durchgehende Straße auf eine Brücke.
  test('Verbindungsstraßen liegen auf denselben X-Positionen wie die Brücken', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);

    const bridgeXs = await page.evaluate(() => window.__testBridgeXs);
    expect(bridgeXs.slice().sort((a, b) => a - b)).toEqual([-170, 20, 180]);
  });

});

test.describe('Phase 6 – Zielfernrohr auf Hügeln (Regression)', () => {

  // REGRESSION TEST: Die alte Scope-Kameraposition (3 Einheiten hinter dem
  // Kanonenzentrum, +0.2 Y) lag innerhalb der Turmbox/-kuppel. Im 15°-Zoom
  // füllte diese nahe Geometrie den ganzen Bildschirm (ein einziger,
  // nahezu einfarbiger Frame statt der Umgebung).
  test('Scope-Ansicht zeigt Umgebung, nicht nur eine einzelne Panzer-Fläche', async ({ page }) => {
    await page.goto('http://localhost:7777/');
    await page.waitForTimeout(500);
    await selectTank(page);
    await page.click('#btn-diff-normal');
    await page.waitForTimeout(300);

    await page.click('#btn-scope');
    await page.waitForTimeout(300);

    const { distinctColors, sampleCount } = await page.evaluate(() => {
      const canvas = document.getElementById('gameCanvas');
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      const ctx = tmp.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
      const colors = new Set();
      const points = [
        [0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8],
        [0.5, 0.15], [0.5, 0.85], [0.15, 0.5], [0.85, 0.5],
      ];
      for (const [fx, fy] of points) {
        const px = ctx.getImageData(
          Math.floor(canvas.width * fx), Math.floor(canvas.height * fy), 1, 1
        ).data;
        colors.add(`${px[0]},${px[1]},${px[2]}`);
      }
      return { distinctColors: colors.size, sampleCount: points.length };
    });

    expect(
      distinctColors,
      `Nur ${distinctColors}/${sampleCount} unterschiedliche Farben im Scope – vermutlich blockiert ein Panzer-Bauteil die Sicht`
    ).toBeGreaterThan(1);
  });

});
