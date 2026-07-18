const { test } = require('node:test');
const assert = require('node:assert/strict');

// ── Hügel-Höhenkarte (Phase 6) ───────────────────────────────────────────────
// Bewusst 1:1 aus game.js übernommene reine Funktionen (kein Three.js/DOM
// nötig), damit die Kernlogik ohne Browser getestet werden kann.

const RIVER_Z = -30;
const RIVER_HALF_W = 10;
const SOUTH_ROAD_Z = RIVER_Z + RIVER_HALF_W + 9; // -11
const NORTH_ROAD_Z = RIVER_Z - RIVER_HALF_W - 9; // -49
const VERTICAL_ROAD_XS = [-200, 0, 200];

function smoothFalloff(dist, blendWidth) {
    if (dist <= 0) return 0;
    if (dist >= blendWidth) return 1;
    const t = dist / blendWidth;
    return t * t * (3 - 2 * t);
}

function distanceToFlatZones(x, z) {
    let factor = 1;
    factor = Math.min(factor, smoothFalloff(Math.abs(z - RIVER_Z) - (RIVER_HALF_W + 6), 20));
    factor = Math.min(factor, smoothFalloff(Math.abs(z - SOUTH_ROAD_Z) - 6, 20));
    factor = Math.min(factor, smoothFalloff(Math.abs(z - NORTH_ROAD_Z) - 6, 20));
    for (const rx of VERTICAL_ROAD_XS) {
        factor = Math.min(factor, smoothFalloff(Math.abs(x - rx) - 6, 20));
    }
    return factor;
}

function baseHillHeight(x, z) {
    return 3.5 * Math.sin(x * 0.008 + 1.3) * Math.cos(z * 0.007 - 0.7)
         + 2.0 * Math.sin(x * 0.014 - z * 0.011)
         + 1.2 * Math.sin(z * 0.021 + x * 0.005);
}

function getTerrainHeight(x, z) {
    return baseHillHeight(x, z) * distanceToFlatZones(x, z);
}

test('smoothFalloff: 0 innerhalb des Radius, 1 jenseits der Blendbreite', () => {
    assert.equal(smoothFalloff(-5, 20), 0);
    assert.equal(smoothFalloff(0, 20), 0);
    assert.equal(smoothFalloff(20, 20), 1);
    assert.equal(smoothFalloff(50, 20), 1);
});

test('smoothFalloff: Übergang ist monoton steigend zwischen 0 und 1', () => {
    let prev = -1;
    for (let d = 0; d <= 20; d += 2) {
        const v = smoothFalloff(d, 20);
        assert.ok(v >= prev, `smoothFalloff(${d}) sollte nicht kleiner als vorheriger Wert sein`);
        assert.ok(v >= 0 && v <= 1);
        prev = v;
    }
});

// baseHillHeight * 0 kann -0 statt 0 ergeben (Vorzeichen der Sinuswellen) –
// -0 und 0 sind für die Spielwelt gleichbedeutend flach, daher Toleranzvergleich.
function assertFlat(h, label) {
    assert.ok(Math.abs(h) < 1e-9, `${label}: erwartet ~0, war ${h}`);
}

test('Terrain: Flusskanal bleibt flach (Höhe = 0)', () => {
    assertFlat(getTerrainHeight(0, RIVER_Z), 'Fluss x=0');
    assertFlat(getTerrainHeight(123, RIVER_Z), 'Fluss x=123');
});

test('Terrain: Hauptstraßen (Süd/Nord) bleiben flach', () => {
    assertFlat(getTerrainHeight(50, SOUTH_ROAD_Z), 'Südstraße');
    assertFlat(getTerrainHeight(-80, NORTH_ROAD_Z), 'Nordstraße');
});

test('Terrain: Nord-Süd-Verbindungsstraßen bleiben flach', () => {
    for (const rx of VERTICAL_ROAD_XS) {
        assertFlat(getTerrainHeight(rx, 200), `Straße x=${rx}`);
    }
});

test('Terrain: abseits von Fluss/Straßen entstehen sanfte Hügel ungleich 0', () => {
    // Punkt weit weg von allen Flach-Zonen (Fluss bei z=-30, Straßen bei
    // x=-200/0/200 und z=-11/-49)
    const h = getTerrainHeight(100, 250);
    assert.notEqual(h, 0);
    // "sanft" – Amplitude bleibt in einem moderaten Rahmen
    assert.ok(Math.abs(h) < 8, `Hügelhöhe zu extrem: ${h}`);
});

test('Terrain: Höhe ist deterministisch (gleiche Koordinate → gleiche Höhe)', () => {
    const a = getTerrainHeight(77, 313);
    const b = getTerrainHeight(77, 313);
    assert.equal(a, b);
});

// ── Kanonen-Höhenwinkel (vertikales Zielen) ─────────────────────────────────

const GUN_PITCH_MIN = -5 * Math.PI / 180;
const GUN_PITCH_MAX = 20 * Math.PI / 180;

function clampGunPitch(current, delta) {
    return Math.min(GUN_PITCH_MAX, Math.max(GUN_PITCH_MIN, current + delta));
}

test('Höhenwinkel: bleibt innerhalb von -5° bis +20°', () => {
    let pitch = 0;
    for (let i = 0; i < 500; i++) pitch = clampGunPitch(pitch, 0.05); // stark nach oben
    assert.ok(pitch <= GUN_PITCH_MAX + 1e-9);
    assert.ok(Math.abs(pitch - GUN_PITCH_MAX) < 1e-9, `pitch=${pitch}, erwartet ${GUN_PITCH_MAX}`);

    for (let i = 0; i < 500; i++) pitch = clampGunPitch(pitch, -0.05); // stark nach unten
    assert.ok(Math.abs(pitch - GUN_PITCH_MIN) < 1e-9, `pitch=${pitch}, erwartet ${GUN_PITCH_MIN}`);
});

test('Höhenwinkel: kleine Eingabe bewegt den Winkel innerhalb der Grenzen', () => {
    const pitch = clampGunPitch(0, 0.01);
    assert.ok(pitch > 0 && pitch < GUN_PITCH_MAX);
});
