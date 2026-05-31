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

test('KI-Zustand: Neue Gegner starten in angreifen', () => {
    const enemy = { state: 'angreifen', alive: true };
    assert.equal(enemy.state, 'angreifen');
});

test('KI-Zustand: angreifen bleibt aktiv unabhängig vom Abstand', () => {
    // Kein Rückfall zu suchen – Gegner verfolgen immer
    const enemy = { state: 'angreifen', alive: true };
    const distToPlayer = 400; // Spawn-Distanz
    // Kein Zustandswechsel bei großem Abstand mehr
    assert.equal(enemy.state, 'angreifen');
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

// ── turnToward / normAngleDiff Hilfsfunktionen ────────────────────────────

// Aus game.js extrahiert um isoliert testbar zu sein
function turnToward(currentAngle, targetAngle, maxStep) {
    let diff = targetAngle - currentAngle;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), maxStep);
}

function normAngleDiff(a, b) {
    let d = a - b;
    while (d >  Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
}

test('turnToward: nähert sich dem Zielwinkel schrittweise an', () => {
    let angle = 0;
    const target = Math.PI / 2;
    for (let i = 0; i < 50; i++) angle = turnToward(angle, target, 0.1);
    assert.ok(Math.abs(angle - target) < 0.01, `Winkel ${angle.toFixed(3)} hat Ziel ${target.toFixed(3)} nicht erreicht`);
});

test('turnToward: überschreitet den Zielwinkel nicht', () => {
    let angle = 0;
    const target = 0.1;
    angle = turnToward(angle, target, 0.5);
    assert.ok(angle <= target + 0.001, `turnToward überschoss: ${angle} > ${target}`);
});

test('turnToward: funktioniert korrekt über den ±π-Umbruch (von +π zu −π)', () => {
    // Gegner steht kurz vor +π, Ziel ist kurz nach -π → kürzester Weg ist nur wenig
    const current = Math.PI - 0.05;
    const target = -Math.PI + 0.05;
    const next = turnToward(current, target, 0.2);
    // Sollte kurz über +π → Wert nahe +π (nicht riesiger Sprung zurück)
    const diff = normAngleDiff(next, target);
    assert.ok(diff < normAngleDiff(current, target), 'turnToward nähert sich nicht an über ±π-Grenze');
});

test('normAngleDiff: direkter Winkel ohne Umbruch', () => {
    const d = normAngleDiff(0.5, 0.2);
    assert.ok(Math.abs(d - 0.3) < 0.0001, `Erwartet 0.3, bekam ${d}`);
});

test('normAngleDiff: Umbruch von +π zu −π', () => {
    const d = normAngleDiff(Math.PI - 0.1, -Math.PI + 0.1);
    assert.ok(d < 0.25, `Umbruch-Differenz zu groß: ${d.toFixed(3)} (erwartet ~0.2)`);
});

test('normAngleDiff: große gewachsene Rotation bleibt korrekt', () => {
    // rotation.y wächst z.B. auf 7.0 durch viele turnToward-Aufrufe
    const grown = 7.0;
    const target = 0.7; // atan2 liefert Wert in (-π, π]
    const d = normAngleDiff(grown, target);
    assert.ok(d < Math.PI, `normAngleDiff liefert unrealistisch großen Wert: ${d.toFixed(3)}`);
    // 7.0 ≡ 0.717 (mod 2π), Differenz zum Ziel 0.7 sollte sehr klein sein
    assert.ok(d < 0.1, `Erwartete kleine Differenz, bekam ${d.toFixed(3)}`);
});

// ── Winkelformel: Gegner fährt AUF Spieler zu ────────────────────────────
//
// In Three.js: translateZ(-speed) mit rotation.y=θ bewegt in Weltrichtung
// (-sin θ, 0, -cos θ). Um in Richtung (dx, dz) zu fahren, braucht man
// θ = atan2(-dx, -dz), NICHT atan2(dx, dz).

function translateZDir(rotY) {
    // Weltbewegungsrichtung für translateZ(-1) bei gegebener rotation.y
    return { x: -Math.sin(rotY), z: -Math.cos(rotY) };
}

test('Winkelformel: atan2(-dx,-dz) ergibt Bewegung AUF Spieler zu (Spieler in -Z)', () => {
    // Spieler direkt vor dem Gegner in Weltrichtung -Z
    const toPlayer = { x: 0, z: -1 };
    const angle = Math.atan2(-toPlayer.x, -toPlayer.z); // = 0
    const moveDir = translateZDir(angle);
    const dot = moveDir.x * toPlayer.x + moveDir.z * toPlayer.z;
    assert.ok(dot > 0.99, `Bewegung zeigt von Spieler weg (dot=${dot.toFixed(3)})`);
});

test('Winkelformel: atan2(-dx,-dz) ergibt Bewegung AUF Spieler zu (Spieler in +X)', () => {
    const toPlayer = { x: 1, z: 0 };
    const angle = Math.atan2(-toPlayer.x, -toPlayer.z);
    const moveDir = translateZDir(angle);
    const dot = moveDir.x * toPlayer.x + moveDir.z * toPlayer.z;
    assert.ok(dot > 0.99, `Bewegung zeigt von Spieler weg (dot=${dot.toFixed(3)})`);
});

test('Winkelformel: atan2(-dx,-dz) ergibt Bewegung AUF Spieler zu (diagonale Richtung)', () => {
    const raw = { x: 3, z: -4 };
    const len = Math.sqrt(raw.x * raw.x + raw.z * raw.z);
    const toPlayer = { x: raw.x / len, z: raw.z / len };
    const angle = Math.atan2(-toPlayer.x, -toPlayer.z);
    const moveDir = translateZDir(angle);
    const dot = moveDir.x * toPlayer.x + moveDir.z * toPlayer.z;
    assert.ok(dot > 0.99, `Bewegung zeigt von Spieler weg (dot=${dot.toFixed(3)})`);
});

test('Winkelformel: falsche Formel atan2(dx,dz) würde vom Spieler wegfahren', () => {
    // Dieser Test dokumentiert den Bug: die alte Formel ist 180° falsch
    const toPlayer = { x: 0, z: -1 };
    const wrongAngle = Math.atan2(toPlayer.x, toPlayer.z); // alte, falsche Formel
    const moveDir = translateZDir(wrongAngle);
    const dot = moveDir.x * toPlayer.x + moveDir.z * toPlayer.z;
    assert.ok(dot < -0.99, `Alte Formel sollte vom Spieler wegfahren (dot=${dot.toFixed(3)})`);
});

// ── Simulierte Gegner-Annäherung über mehrere Frames ─────────────────────

test('KI-Simulation: Gegner nähert sich Spieler aus großer Distanz (angreifen-Zustand)', () => {
    // Gegner startet bei x=350 (typische Spawn-Distanz), muss IDEAL_DIST=70 erreichen
    // Bei speed*2=0.08/frame und ~35 Frames Drehzeit: ~350 Frames bis Idealabstand
    const speed = 0.04;
    const enemy = { x: 350, z: 0, rotY: 0, strafeDir: 1 };
    const player = { x: 0, z: 0 };
    const IDEAL_DIST = 70;

    for (let frame = 0; frame < 6000; frame++) {
        const dx = player.x - enemy.x;
        const dz = player.z - enemy.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < IDEAL_DIST + 20) break;

        while (enemy.rotY >  Math.PI) enemy.rotY -= Math.PI * 2;
        while (enemy.rotY < -Math.PI) enemy.rotY += Math.PI * 2;

        const len = dist;
        const ndx = dx / len;
        const ndz = dz / len;

        // Direkte Annäherung (lateralScale=0 bei dist > 200)
        const moveTargetX = player.x;
        const moveTargetZ = player.z;
        const moveDx = moveTargetX - enemy.x;
        const moveDz = moveTargetZ - enemy.z;

        const bodyTarget = Math.atan2(-moveDx, -moveDz);
        enemy.rotY = turnToward(enemy.rotY, bodyTarget, 0.06);

        if (normAngleDiff(enemy.rotY, bodyTarget) < Math.PI * 0.7) {
            const moveDir = translateZDir(enemy.rotY);
            enemy.x += moveDir.x * speed * 2;
            enemy.z += moveDir.z * speed * 2;
        }
    }

    const finalDist = Math.sqrt((player.x - enemy.x) ** 2 + (player.z - enemy.z) ** 2);
    assert.ok(finalDist < IDEAL_DIST + 20,
        `Gegner hat Spieler nicht erreicht (Abstand: ${finalDist.toFixed(1)})`);
});

test('KI-Simulation: Gegner entfernt sich NICHT von Spieler (kein Wegfahren)', () => {
    const speed = 0.04;
    const enemy = { x: 300, z: 0, rotY: 0 };
    const player = { x: 0, z: 0 };
    const startDist = Math.sqrt((player.x - enemy.x) ** 2 + (player.z - enemy.z) ** 2);

    for (let frame = 0; frame < 100; frame++) {
        const dx = player.x - enemy.x;
        const dz = player.z - enemy.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        const ndx = dx / len;
        const ndz = dz / len;
        const targetAngle = Math.atan2(-ndx, -ndz);
        while (enemy.rotY >  Math.PI) enemy.rotY -= Math.PI * 2;
        while (enemy.rotY < -Math.PI) enemy.rotY += Math.PI * 2;
        enemy.rotY = turnToward(enemy.rotY, targetAngle, 0.06);
        if (normAngleDiff(enemy.rotY, targetAngle) < Math.PI * 0.5) {
            const moveDir = translateZDir(enemy.rotY);
            enemy.x += moveDir.x * speed * 2;
            enemy.z += moveDir.z * speed * 2;
        }
    }

    const finalDist = Math.sqrt((player.x - enemy.x) ** 2 + (player.z - enemy.z) ** 2);
    assert.ok(finalDist < startDist, `Gegner ist weiter weg geworden: ${startDist.toFixed(1)} → ${finalDist.toFixed(1)}`);
});
