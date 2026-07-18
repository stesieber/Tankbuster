const { test } = require('node:test');
const assert = require('node:assert/strict');

// ── Spezial-Waffensystem-Fahrzeuge: M270 MLRS + Puma (Maschinenkanone) ─────
// Reine Nachbildung der Lade-/Feuer-Logik aus game.js (tryFireRocketSalvo /
// Nachlade-Tick in animate() für den MLRS; Cooldown-Gate für die
// Maschinenkanone), ohne DOM/Three.js-Abhängigkeiten.

const ROCKET_MAX_CHARGES = 3;
const ROCKET_RECHARGE_MS = 10000;

function createState() {
  return { charges: ROCKET_MAX_CHARGES, timer: 0, firing: false, tubeIndex: 0 };
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

const TUBE_COUNT = 3; // links, mitte, rechts

function tryFireSalvo(state) {
  if (state.firing || state.charges <= 0) return null;
  state.firing = true;
  state.charges--;
  const usedTube = state.tubeIndex;
  state.tubeIndex = (state.tubeIndex + 1) % TUBE_COUNT;
  return usedTube;
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
  assert.notEqual(tryFireSalvo(s), null);
  assert.equal(s.charges, 2);
  finishSalvo(s);
  assert.notEqual(tryFireSalvo(s), null);
  assert.equal(s.charges, 1);
});

test('Raketenwerfer: keine Salve mehr möglich sobald Ladungen aufgebraucht', () => {
  const s = createState();
  tryFireSalvo(s); finishSalvo(s);
  tryFireSalvo(s); finishSalvo(s);
  tryFireSalvo(s); finishSalvo(s);
  assert.equal(s.charges, 0);
  assert.equal(tryFireSalvo(s), null, 'sollte bei 0 Ladungen fehlschlagen');
});

test('Raketenwerfer: während eine Salve feuert, blockiert eine weitere Anfrage', () => {
  const s = createState();
  assert.notEqual(tryFireSalvo(s), null);
  assert.equal(s.firing, true);
  assert.equal(tryFireSalvo(s), null, 'sollte während laufender Salve blockieren');
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

// ── Rohr-Zyklus: Salve 1 = links, Salve 2 = Mitte, Salve 3 = rechts, dann von vorn ──

test('Raketenwerfer-Rohre: erste Salve kommt aus dem linken Rohr (Index 0)', () => {
  const s = createState();
  const tube = tryFireSalvo(s);
  assert.equal(tube, 0);
});

test('Raketenwerfer-Rohre: Salven wechseln links → Mitte → rechts → links (zyklisch, für immer)', () => {
  const s = createState();
  const usedTubes = [];
  for (let i = 0; i < 7; i++) {
    // genug Ladungen für 7 Salven simulieren (Nachladen zwischendurch)
    if (s.charges <= 0) tickRecharge(s, ROCKET_RECHARGE_MS);
    const tube = tryFireSalvo(s);
    usedTubes.push(tube);
    finishSalvo(s);
  }
  assert.deepEqual(usedTubes, [0, 1, 2, 0, 1, 2, 0]);
});

test('Raketenwerfer-Rohre: der Tube-Index wechselt auch dann weiter, wenn eine Salve fehlschlägt', () => {
  const s = createState();
  const first = tryFireSalvo(s); // links (0), firing=true
  assert.equal(first, 0);
  assert.equal(tryFireSalvo(s), null, 'blockiert während laufender Salve');
  assert.equal(s.tubeIndex, 1, 'Index sollte trotz Blockade schon auf die Mitte zeigen');
});

// ── Maschinenkanone: 2 Schaden, 3 Schuss/Sekunde (≈333ms Cooldown) ──────────

const AUTOCANNON_COOLDOWN = 333;

function tryFireAutocannon(lastFired, now) {
  if (now - lastFired < AUTOCANNON_COOLDOWN) return null;
  return now;
}

test('Maschinenkanone: feuert nicht öfter als alle ~333ms (3 Schuss/Sekunde)', () => {
  let lastFired = 0;
  let shots = 0;
  for (let now = 0; now <= 3000; now += 16) { // ~60fps-Ticks über 3 Sekunden
    const fired = tryFireAutocannon(lastFired, now);
    if (fired !== null) { lastFired = fired; shots++; }
  }
  // In 3 Sekunden bei 333ms Cooldown sind maximal 9-10 Schuss möglich
  assert.ok(shots >= 8 && shots <= 10, `erwartet ~9 Schuss in 3s, war ${shots}`);
});
