const { test } = require('node:test');
const assert = require('node:assert/strict');

// ── Haus-Ramm-Logik ─────────────────────────────────────────────────────────

function simulateRam(house) {
    if (!house.beingRammed) {
        house.beingRammed = true;
        house.ramHits++;
        if (house.ramHits === 1) {
            house.damaged = true;
        } else {
            house.destroyed = true;
        }
    }
}

function simulateExit(house) { house.beingRammed = false; }

test('Haus: erster Durchbruch → beschädigt, nicht zerstört', () => {
    const h = { ramHits: 0, beingRammed: false, damaged: false, destroyed: false };
    simulateRam(h);
    assert.equal(h.ramHits, 1);
    assert.ok(h.damaged);
    assert.ok(!h.destroyed);
});

test('Haus: zweiter Durchbruch → zerstört', () => {
    const h = { ramHits: 0, beingRammed: false, damaged: false, destroyed: false };
    simulateRam(h); simulateExit(h);
    simulateRam(h);
    assert.equal(h.ramHits, 2);
    assert.ok(h.destroyed);
});

test('Haus: Zähler erhöht sich nicht solange Tank im Haus bleibt', () => {
    const h = { ramHits: 0, beingRammed: false, damaged: false, destroyed: false };
    simulateRam(h); simulateRam(h); simulateRam(h);
    assert.equal(h.ramHits, 1, 'ramHits darf nur beim Einfahren steigen, nicht bei Verbleib');
});

test('Haus: cannon hp=0 zerstört unabhängig von ramHits', () => {
    const h = { ramHits: 0, beingRammed: false, damaged: false, destroyed: false, hp: 1 };
    h.hp--;
    if (h.hp <= 0) h.destroyed = true;
    assert.ok(h.destroyed);
});

// ── Busch-Plattdrück-Animation ───────────────────────────────────────────────

function updateFlatteningBush(b, dt) {
    if (!b.flattening || b.flattened) return;
    b.flatProgress = Math.min(b.flatProgress + dt * 4.0, 1.0);
    b.scaleY  = 1.0 - 0.9 * b.flatProgress;
    b.scaleXZ = 1.0 + 0.4 * b.flatProgress;
    if (b.flatProgress >= 1.0) b.flattened = true;
}

test('Busch: keine Animation wenn flattening=false', () => {
    const b = { flattening: false, flattened: false, flatProgress: 0, scaleY: 1, scaleXZ: 1 };
    updateFlatteningBush(b, 0.1);
    assert.equal(b.flatProgress, 0);
});

test('Busch: flatProgress wächst wenn flattening=true', () => {
    const b = { flattening: true, flattened: false, flatProgress: 0, scaleY: 1, scaleXZ: 1 };
    updateFlatteningBush(b, 0.1);
    assert.ok(b.flatProgress > 0);
});

test('Busch: flatProgress übersteigt nie 1.0', () => {
    const b = { flattening: true, flattened: false, flatProgress: 0, scaleY: 1, scaleXZ: 1 };
    for (let i = 0; i < 200; i++) updateFlatteningBush(b, 0.1);
    assert.equal(b.flatProgress, 1.0);
    assert.ok(b.flattened);
});

test('Busch: scaleY endet bei 0.1, scaleXZ > 1.0', () => {
    const b = { flattening: true, flattened: false, flatProgress: 0, scaleY: 1, scaleXZ: 1 };
    for (let i = 0; i < 200; i++) updateFlatteningBush(b, 0.1);
    assert.ok(Math.abs(b.scaleY - 0.1) < 0.001, `scaleY=${b.scaleY}`);
    assert.ok(b.scaleXZ > 1.0, `scaleXZ=${b.scaleXZ}`);
});

test('Busch: flattened=true stoppt weitere Animation', () => {
    const b = { flattening: true, flattened: true, flatProgress: 0.5, scaleY: 0.55, scaleXZ: 1.2 };
    updateFlatteningBush(b, 0.1);
    assert.equal(b.flatProgress, 0.5);
});
