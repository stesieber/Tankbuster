const { test } = require('node:test');
const assert = require('node:assert/strict');

// ── Baum-Umfall-Physik ──────────────────────────────────────────────────────

const MAX_FALL_ANGLE = Math.PI / 2;

function simulateFall(dt, steps) {
    let fallAngle = 0;
    let fallSpeed = 0.8;
    let fallen = false;
    for (let i = 0; i < steps; i++) {
        if (fallen) break;
        fallSpeed = Math.min(fallSpeed + dt * 2.5, 4.0);
        fallAngle += fallSpeed * dt;
        if (fallAngle >= MAX_FALL_ANGLE) {
            fallAngle = MAX_FALL_ANGLE;
            fallen = true;
        }
    }
    return { fallAngle, fallen };
}

test('Baum-Winkel: startet bei 0', () => {
    const { fallAngle } = simulateFall(1 / 60, 0);
    assert.equal(fallAngle, 0);
});

test('Baum-Winkel: steigt nach einem Frame', () => {
    const { fallAngle } = simulateFall(1 / 60, 1);
    assert.ok(fallAngle > 0, `Winkel sollte > 0 sein, ist ${fallAngle}`);
});

test('Baum-Winkel: überschreitet nie PI/2', () => {
    for (let frames = 1; frames <= 300; frames++) {
        const { fallAngle } = simulateFall(1 / 60, frames);
        assert.ok(fallAngle <= MAX_FALL_ANGLE + 0.0001, `Winkel ${fallAngle} überschreitet PI/2`);
    }
});

test('Baum-Winkel: erreicht PI/2 nach ~2 Sekunden', () => {
    const { fallen } = simulateFall(1 / 60, 120); // 2 Sekunden bei 60 FPS
    assert.ok(fallen, 'Baum sollte nach 2 Sekunden umgefallen sein');
});

test('Baum-Winkel: beschleunigt (Winkel nach 30 Frames > 30 × Startgeschwindigkeit × dt)', () => {
    const dt = 1 / 60;
    const { fallAngle: after30 } = simulateFall(dt, 30);
    const konstant = 0.8 * dt * 30; // würde ohne Beschleunigung ergeben
    assert.ok(after30 > konstant, `Kein Beschleunigen: ${after30} <= ${konstant}`);
});

// ── Rotationsachsen-Berechnung ──────────────────────────────────────────────

function computeFallAxis(vx, vz) {
    const vLen = Math.sqrt(vx * vx + vz * vz);
    let fx = 1, fz = 0;
    if (vLen > 0.001) { fx = vx / vLen; fz = vz / vLen; }
    // Axis: (fz, 0, -fx) – Kreuzprodukt von (0,1,0) mit Fallrichtung
    return { ax: fz, ay: 0, az: -fx };
}

function applyRotation(px, py, pz, ax, ay, az, angle) {
    // Rodrigues-Formel für Rotation um Einheitsachse
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const dot = ax * px + ay * py + az * pz;
    return {
        x: px * cosA + (ay * pz - az * py) * sinA + ax * dot * (1 - cosA),
        y: py * cosA + (az * px - ax * pz) * sinA + ay * dot * (1 - cosA),
        z: pz * cosA + (ax * py - ay * px) * sinA + az * dot * (1 - cosA),
    };
}

test('Rotationsachse: Baum fällt in Schussrichtung (+Z)', () => {
    const { ax, ay, az } = computeFallAxis(0, 1); // Schuss in +Z
    const treeTop = applyRotation(0, 5, 0, ax, ay, az, Math.PI / 2);
    // Baumspitze soll nach +Z fallen
    assert.ok(treeTop.z > 4, `Baumspitze nicht in +Z: z=${treeTop.z.toFixed(2)}`);
    assert.ok(Math.abs(treeTop.y) < 0.01, `Baumspitze nicht auf Boden: y=${treeTop.y.toFixed(2)}`);
});

test('Rotationsachse: Baum fällt in Schussrichtung (+X)', () => {
    const { ax, ay, az } = computeFallAxis(1, 0); // Schuss in +X
    const treeTop = applyRotation(0, 5, 0, ax, ay, az, Math.PI / 2);
    assert.ok(treeTop.x > 4, `Baumspitze nicht in +X: x=${treeTop.x.toFixed(2)}`);
    assert.ok(Math.abs(treeTop.y) < 0.01, `Baumspitze nicht auf Boden: y=${treeTop.y.toFixed(2)}`);
});

test('Rotationsachse: Baum fällt in diagonale Richtung', () => {
    const { ax, ay, az } = computeFallAxis(1, 1); // diagonal
    const treeTop = applyRotation(0, 5, 0, ax, ay, az, Math.PI / 2);
    assert.ok(treeTop.x > 2 && treeTop.z > 2, `Diagonale nicht korrekt: x=${treeTop.x.toFixed(2)}, z=${treeTop.z.toFixed(2)}`);
    assert.ok(Math.abs(treeTop.y) < 0.01, `Nicht auf Boden: y=${treeTop.y.toFixed(2)}`);
});
