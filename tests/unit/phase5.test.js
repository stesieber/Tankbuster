const { test } = require('node:test');
const assert = require('node:assert/strict');

// ── Joystick-Deadzone (Phase 5: Feinschliff Steuerung) ──────────────────────
// Spiegelt applyDeadzone() aus game.js.

function applyDeadzone(value, deadzone) {
  return Math.abs(value) < deadzone ? 0 : value;
}

test('Deadzone: Werte unterhalb der Schwelle werden zu 0', () => {
  assert.equal(applyDeadzone(0.05, 0.08), 0);
  assert.equal(applyDeadzone(-0.07, 0.08), 0);
});

test('Deadzone: Werte oberhalb der Schwelle bleiben unverändert', () => {
  assert.equal(applyDeadzone(0.5, 0.08), 0.5);
  assert.equal(applyDeadzone(-1, 0.08), -1);
});

test('Deadzone: Wert genau auf der Schwelle zählt noch als Ausschlag (nicht 0)', () => {
  assert.equal(applyDeadzone(0.08, 0.08), 0.08);
});

// ── Eingabe-Glättung (Rotation/Turm) ─────────────────────────────────────────
// Spiegelt die Lerp-Glättung aus der Animation-Loop.

function smoothStep(current, target, ratePerSec, dt) {
  const factor = Math.min(1, ratePerSec * dt);
  return current + (target - current) * factor;
}

test('Glättung: nähert sich dem Zielwert schrittweise an', () => {
  let value = 0;
  value = smoothStep(value, 1, 18, 1 / 60);
  assert.ok(value > 0 && value < 1, `Erwartet 0 < value < 1, war ${value}`);
});

test('Glättung: konvergiert nach genügend Frames exakt zum Zielwert', () => {
  let value = 0;
  for (let i = 0; i < 300; i++) value = smoothStep(value, 1, 18, 1 / 60);
  assert.ok(Math.abs(value - 1) < 0.001, `value=${value}`);
});

test('Glättung: springt bei einem einzelnen Frame nie sofort auf das Ziel (kein Ruckeln)', () => {
  const value = smoothStep(0, 1, 18, 1 / 60);
  assert.notEqual(value, 1);
});

// ── Panzer-Typen: Geschwindigkeit & HP (Phase 5: Panzerauswahl) ─────────────
// Spiegelt applyTankType() aus game.js.

const BASE_TANK_MAX_SPEED = 0.30;

const TANK_TYPES = {
  koenigstiger: { speedFactor: 0.8, maxHP: 140 },
  leopard:      { speedFactor: 1.35, maxHP: 95 },
};

function computeTankStats(cfg) {
  return {
    maxSpeed: BASE_TANK_MAX_SPEED * cfg.speedFactor,
    maxHP: cfg.maxHP,
  };
}

test('Königstiger: langsamer als Basiswert, aber mehr HP als Leopard', () => {
  const stats = computeTankStats(TANK_TYPES.koenigstiger);
  assert.ok(stats.maxSpeed < BASE_TANK_MAX_SPEED);
  assert.ok(stats.maxHP > TANK_TYPES.leopard.maxHP);
});

test('Leopard 2 A8: schneller als Basiswert, aber weniger HP als Königstiger', () => {
  const stats = computeTankStats(TANK_TYPES.leopard);
  assert.ok(stats.maxSpeed > BASE_TANK_MAX_SPEED);
  assert.ok(stats.maxHP < TANK_TYPES.koenigstiger.maxHP);
});
