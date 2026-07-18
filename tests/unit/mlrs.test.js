const { test } = require('node:test');
const assert = require('node:assert/strict');

// ── M270 MLRS: Salven-Raketenwerfer (Phase "Raketenwerfer-Fahrzeug") ────────
// Reine Nachbildung der Lade-/Feuer-Logik aus game.js (tryFireRocketSalvo /
// Nachlade-Tick in animate()), ohne DOM/Three.js-Abhängigkeiten.

const ROCKET_MAX_CHARGES = 3;
const ROCKET_RECHARGE_MS = 10000;

function createState() {
  return { charges: ROCKET_MAX_CHARGES, timer: 0, firing: false };
}

function tickRecharge(state, dtMs) {
  if (state.charges < ROCKET_MAX_CHARGES) {
    state.timer += dtMs;
    if (state.timer >= ROCKET_RECHARGE_MS) {
      state.timer -= ROCKET_RECHARGE_MS;
      state.charges++;
    }
  }
}

function tryFireSalvo(state) {
  if (state.firing || state.charges <= 0) return false;
  state.firing = true;
  state.charges--;
  return true;
}

function finishSalvo(state) {
  state.firing = false;
}

test('Raketenwerfer: startet mit vollen 3 Ladungen', () => {
  const s = createState();
  assert.equal(s.charges, 3);
});

test('Raketenwerfer: jede Salve verbraucht genau 1 Ladung', () => {
  const s = createState();
  assert.ok(tryFireSalvo(s));
  assert.equal(s.charges, 2);
  finishSalvo(s);
  assert.ok(tryFireSalvo(s));
  assert.equal(s.charges, 1);
});

test('Raketenwerfer: keine Salve mehr möglich sobald Ladungen aufgebraucht', () => {
  const s = createState();
  tryFireSalvo(s); finishSalvo(s);
  tryFireSalvo(s); finishSalvo(s);
  tryFireSalvo(s); finishSalvo(s);
  assert.equal(s.charges, 0);
  assert.equal(tryFireSalvo(s), false, 'sollte bei 0 Ladungen fehlschlagen');
});

test('Raketenwerfer: während eine Salve feuert, blockiert eine weitere Anfrage', () => {
  const s = createState();
  assert.ok(tryFireSalvo(s));
  assert.equal(s.firing, true);
  assert.equal(tryFireSalvo(s), false, 'sollte während laufender Salve blockieren');
  assert.equal(s.charges, 2, 'darf während Blockade keine zweite Ladung verbrauchen');
});

test('Raketenwerfer: eine Ladung lädt nach 10s nach', () => {
  const s = createState();
  tryFireSalvo(s); finishSalvo(s);
  assert.equal(s.charges, 2);

  tickRecharge(s, 9999);
  assert.equal(s.charges, 2, 'noch nicht nachgeladen kurz vor 10s');

  tickRecharge(s, 1);
  assert.equal(s.charges, 3, 'nach 10s ist die Ladung wieder da');
});

test('Raketenwerfer: Ladungen füllen sich nicht über das Maximum (3) hinaus', () => {
  const s = createState();
  tickRecharge(s, ROCKET_RECHARGE_MS * 5);
  assert.equal(s.charges, ROCKET_MAX_CHARGES);
});

test('Raketenwerfer: mehrere fehlende Ladungen laden nacheinander in 10s-Schritten nach', () => {
  const s = createState();
  tryFireSalvo(s); finishSalvo(s);
  tryFireSalvo(s); finishSalvo(s);
  assert.equal(s.charges, 1);

  tickRecharge(s, ROCKET_RECHARGE_MS); // +1
  assert.equal(s.charges, 2);
  tickRecharge(s, ROCKET_RECHARGE_MS); // +1
  assert.equal(s.charges, 3);
  tickRecharge(s, ROCKET_RECHARGE_MS); // bereits voll, keine Änderung
  assert.equal(s.charges, 3);
});
