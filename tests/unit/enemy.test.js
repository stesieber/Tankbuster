const { test } = require('node:test');
const assert = require('node:assert/strict');

// ── Spawn-Position-Logik ──────────────────────────────────────────────────

function tooClose(pos, others, minDist) {
    for (const o of others) {
        const dx = pos.x - o.x;
        const dz = pos.z - o.z;
        if (Math.sqrt(dx * dx + dz * dz) < minDist) return true;
    }
    return false;
}

function generateEnemyPositions(count, minDistFromPlayer, minDistFromEach, range) {
    const positions = [];
    const player = { x: 0, z: 0 };
    let attempts = 0;
    while (positions.length < count && attempts < 10000) {
        attempts++;
        const x = -range + Math.random() * range * 2;
        const z = -range + Math.random() * range * 2;
        const distFromPlayer = Math.sqrt(x * x + z * z);
        if (distFromPlayer < minDistFromPlayer) continue;
        if (tooClose({ x, z }, positions, minDistFromEach)) continue;
        positions.push({ x, z });
    }
    return positions;
}

test('Gegner-Positionen: mindestens 100 Einheiten vom Spieler entfernt', () => {
    for (let run = 0; run < 5; run++) {
        const positions = generateEnemyPositions(5, 100, 30, 220);
        assert.equal(positions.length, 5, 'Müssen 5 Positionen generiert werden');
        for (const pos of positions) {
            const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
            assert.ok(dist >= 100, `Position (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}) ist ${dist.toFixed(1)} vom Spieler – zu nah`);
        }
    }
});

test('Gegner-Positionen: mindestens 30 Einheiten voneinander entfernt', () => {
    for (let run = 0; run < 5; run++) {
        const positions = generateEnemyPositions(5, 100, 30, 220);
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const dx = positions[i].x - positions[j].x;
                const dz = positions[i].z - positions[j].z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                assert.ok(dist >= 30, `Gegner ${i} und ${j} sind ${dist.toFixed(1)} auseinander – zu nah`);
            }
        }
    }
});

// ── Ungenauigkeits-Logik ──────────────────────────────────────────────────

function addInaccuracy(direction, accuracy) {
    const dir = { x: direction.x, y: direction.y, z: direction.z };
    dir.x += (Math.random() - 0.5) * accuracy;
    dir.z += (Math.random() - 0.5) * accuracy;
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    dir.x /= len;
    dir.y /= len;
    dir.z /= len;
    return dir;
}

test('Ungenauigkeit: accuracy=0 ändert die Richtung kaum', () => {
    const original = { x: 0, y: 0, z: -1 };
    let maxDeviation = 0;
    for (let i = 0; i < 50; i++) {
        const result = addInaccuracy(original, 0);
        const dot = result.x * original.x + result.y * original.y + result.z * original.z;
        maxDeviation = Math.max(maxDeviation, Math.abs(1 - dot));
    }
    assert.ok(maxDeviation < 0.001, `accuracy=0 erzeugt Abweichung von ${maxDeviation}`);
});

test('Ungenauigkeit: accuracy=1 erzeugt deutliche Streuung', () => {
    const original = { x: 0, y: 0, z: -1 };
    const results = [];
    for (let i = 0; i < 50; i++) {
        results.push(addInaccuracy(original, 1));
    }
    const uniqueX = new Set(results.map(r => r.x.toFixed(3)));
    assert.ok(uniqueX.size > 10, 'accuracy=1 erzeugt zu wenig Streuung');
});

test('Ungenauigkeit: Ergebnis ist immer normiert', () => {
    const original = { x: 0, y: 0, z: -1 };
    for (let i = 0; i < 50; i++) {
        const result = addInaccuracy(original, 0.7);
        const len = Math.sqrt(result.x * result.x + result.y * result.y + result.z * result.z);
        assert.ok(Math.abs(len - 1) < 0.0001, `Vektor nicht normiert: Länge ${len}`);
    }
});

// ── Gegner-KI Zustände ────────────────────────────────────────────────────

test('KI-Zustand: suchen → angreifen wenn Abstand < 120', () => {
    const enemy = { state: 'suchen', alive: true };
    const distToPlayer = 119;
    if (distToPlayer < 120 && enemy.state === 'suchen') {
        enemy.state = 'angreifen';
    }
    assert.equal(enemy.state, 'angreifen');
});

test('KI-Zustand: angreifen → suchen wenn Abstand > 150', () => {
    const enemy = { state: 'angreifen', alive: true };
    const distToPlayer = 151;
    const ATTACK_RANGE = 120;
    const DISENGAGE_RANGE = 150;
    if (distToPlayer > DISENGAGE_RANGE && enemy.state === 'angreifen') {
        enemy.state = 'suchen';
    }
    assert.equal(enemy.state, 'suchen');
});

test('KI-Zustand: tot → bleibt tot', () => {
    const enemy = { state: 'tot', alive: false, hp: 0 };
    if (enemy.hp <= 0) enemy.state = 'tot';
    assert.equal(enemy.state, 'tot');
});

// ── Cooldown pro Typ ──────────────────────────────────────────────────────

const SHOOT_COOLDOWN = { leicht: 4.0, mittel: 2.5, schwer: 1.5 };

test('Schuss-Cooldown: leicht = 4 Sekunden', () => {
    assert.equal(SHOOT_COOLDOWN.leicht, 4.0);
});

test('Schuss-Cooldown: mittel = 2.5 Sekunden', () => {
    assert.equal(SHOOT_COOLDOWN.mittel, 2.5);
});

test('Schuss-Cooldown: schwer = 1.5 Sekunden', () => {
    assert.equal(SHOOT_COOLDOWN.schwer, 1.5);
});

// ── Schaden-Berechnung ────────────────────────────────────────────────────

test('Spieler-Schaden: HP sinkt korrekt', () => {
    let playerHP = 100;
    function playerGetHit(damage) {
        playerHP -= damage;
        playerHP = Math.max(0, playerHP);
    }
    playerGetHit(20);
    assert.equal(playerHP, 80);
    playerGetHit(100);
    assert.equal(playerHP, 0);
});

test('Spieler-Schaden: HP kann nicht unter 0 fallen', () => {
    let playerHP = 10;
    function playerGetHit(damage) {
        playerHP -= damage;
        playerHP = Math.max(0, playerHP);
    }
    playerGetHit(50);
    assert.equal(playerHP, 0);
});

// ── HP-Balken-Farbe ───────────────────────────────────────────────────────

function hpBarColor(pct) {
    if (pct > 60) return 'green';
    if (pct > 30) return 'yellow';
    return 'red';
}

test('HP-Balken: grün bei >60%', () => {
    assert.equal(hpBarColor(100), 'green');
    assert.equal(hpBarColor(61), 'green');
});

test('HP-Balken: gelb bei 30-60%', () => {
    assert.equal(hpBarColor(60), 'yellow');
    assert.equal(hpBarColor(31), 'yellow');
});

test('HP-Balken: rot bei ≤30%', () => {
    assert.equal(hpBarColor(30), 'red');
    assert.equal(hpBarColor(0), 'red');
});

// ── Win-Condition ─────────────────────────────────────────────────────────

test('Sieg: erkannt wenn alle Gegner tot sind', () => {
    const enemies = [
        { alive: false },
        { alive: false },
        { alive: false },
        { alive: false },
        { alive: false },
    ];
    const allDead = enemies.every(e => !e.alive);
    assert.ok(allDead, 'Sieg-Bedingung nicht erkannt');
});

test('Sieg: nicht wenn noch ein Gegner lebt', () => {
    const enemies = [
        { alive: false },
        { alive: true },
        { alive: false },
    ];
    const allDead = enemies.every(e => !e.alive);
    assert.ok(!allDead, 'Sieg fälschlicherweise ausgelöst');
});
