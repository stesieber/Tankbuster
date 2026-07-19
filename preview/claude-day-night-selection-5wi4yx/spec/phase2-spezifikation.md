# 🎮 Panzerspiel – Phase 2 Spezifikation für Claude Code

## Ziel
Schiessen! Der Spieler kann mit Kanone und Maschinengewehr feuern.
Granaten fliegen, treffen Ziele, machen Schaden – und hinterlassen Krater.
Dazu kommen Sounds und das Zielfernrohr.

---

## Branch

```bash
git checkout -b feature/phase-2-schiessen
```

Nach Abschluss: Pull Request auf `main` → automatisches Deployment.

---

## Übersicht neue Features

| Feature | Beschreibung |
|---|---|
| 💥 Kanone | Granate fliegt, trifft, explodiert |
| 🔫 Maschinengewehr | Schnellfeuer, kleine Kugeln |
| 🎯 Trefferberechnung | Winkel bestimmt Schaden oder Abpraller |
| ❤️ HP-Schaden | Treffer reduzieren HP (Dummy-Ziele in Phase 2) |
| 🕳️ Krater | Einschlag hinterlässt Loch im Boden |
| 🔊 Sounds | Schuss, Abpraller, Explosion (Web Audio API) |
| 🔭 Zielfernrohr | Zoom-Modus mit rechtem Button |
| 🏚️ Häuser zerstören | Treffer beschädigt und zerstört Häuser |

---

## Teil 1: Projektstruktur

Keine neuen Dateien nötig – alles kommt in die bestehenden Dateien.
Neue Hilfsdatei:

```
panzerspiel/
├── index.html       ← Buttons für MG + Zielfernrohr ergänzen
├── game.js          ← Hauptteil der neuen Logik
├── style.css        ← Zielfernrohr-Overlay, MG-Button
└── sounds.js        ← NEU: Alle Sound-Funktionen
```

---

## Teil 2: Waffen

### 2.1 Kanone

**Abfeuern:**
- Button "🔴 Kanone" (bereits in Phase 1 vorhanden) oder Leertaste
- Cooldown: 3 Sekunden zwischen Schüssen (realistisch für Panzerkanone)
- Während Cooldown: Button ausgegraut

**Granate (Projektil):**
```javascript
const shell = {
    mesh: null,          // THREE.Mesh – kleine Kugel, dunkelgrau
    velocity: THREE.Vector3,  // Richtung × Geschwindigkeit
    alive: true,
    distanceTravelled: 0,
    maxDistance: 400     // Reichweite in Einheiten
};
```

- Geometrie: `SphereGeometry(0.2, 6, 6)`, Farbe `#333`
- Startposition: Kanonenspitze (Weltkoordinate berechnen via `getWorldPosition`)
- Richtung: Blickrichtung der Kanone
- Geschwindigkeit: 3 Einheiten pro Frame
- Gravitation: `velocity.y -= 0.005` pro Frame (leichter Bogen)
- Wird entfernt wenn: `distanceTravelled > maxDistance` oder Treffer

**Mündungsfeuer:**
- Kurzes gelbes Licht (`THREE.PointLight`, Intensität 5, Dauer 80ms) an der Kanonenspitze
- Kleiner gelber Partikel-Burst (5–8 einfache Boxen, die kurz wegfliegen und verblassen)

### 2.2 Maschinengewehr (MG)

**Abfeuern:**
- Neuer Button "🔫 MG" unten rechts neben Kanonen-Button
- Taste: F
- Feuert solange Button gedrückt, Cooldown: 150ms pro Schuss

**MG-Kugel:**
- Geometrie: `SphereGeometry(0.08, 4, 4)`, Farbe `#FFD700` (goldgelb, Leuchtspur)
- Geschwindigkeit: 6 Einheiten pro Frame (doppelt so schnell wie Granate)
- Keine Gravitation
- Maximale Reichweite: 150 Einheiten
- Schaden: 5 HP pro Treffer

---

## Teil 3: Trefferberechnung

### 3.1 Kollisionserkennung

Verwende einfache **Bounding-Box-Kollision** (kein aufwändiges Raytracing):

```javascript
function checkCollision(projectile, target) {
    const box = new THREE.Box3().setFromObject(target.mesh);
    return box.containsPoint(projectile.mesh.position);
}
```

Prüfe in jedem Frame für jedes Projektil gegen:
- Alle Dummy-Ziele (Phase 2)
- Alle Häuser
- Den Boden (`position.y <= 0`)

### 3.2 Winkel-basierter Schaden

Das ist der spannende Teil! Der Aufprallwinkel bestimmt ob ein Treffer Schaden macht:

```javascript
function calculateDamage(projectileVelocity, targetNormal, baseDamage) {
    // Winkel zwischen Flugrichtung und Zieloberfläche berechnen
    const angle = projectileVelocity.angleTo(targetNormal);
    // angle ist in Radians: 0 = parallel, PI/2 = senkrecht

    // Unter 20° Aufprallwinkel → Abpraller
    if (angle < 0.35) {  // ~20 Grad
        return 0;  // kein Schaden
    }

    // Schaden skaliert mit Winkel (senkrechter Treffer = voll, flach = wenig)
    const factor = Math.sin(angle);
    return Math.round(baseDamage * factor);
}
```

**Panzerstärke nach Seite (für Panzer-Ziele in Phase 3, hier vorbereiten):**

```javascript
const armorFactor = {
    front: 1.0,   // Volle Panzerung vorne
    side:  1.5,   // Seitenrüstung schwächer
    rear:  2.0,   // Hinten am verwundbarsten
    top:   3.0    // Oben kaum Panzerung
};
// finalDamage = baseDamage * armorFactor[hitSide]
```

Diese Logik schon implementieren (wird in Phase 3 für Gegner-Panzer genutzt).

### 3.3 Abpraller-Effekt

Bei `damage === 0`:
- Sound: Ricochet (siehe Sounds)
- Visuell: 3–5 kleine Funken-Partikel die wegspringen
- Projektil wird zerstört (kein Durchdringen)

---

## Teil 4: Dummy-Ziele

Da es in Phase 2 noch keine Gegner-Panzer gibt, brauchen wir Testziele:

**3 Dummy-Panzer auf der Karte:**
```javascript
const dummyTargets = [
    { position: new THREE.Vector3(50, 0, 50),  hp: 100, maxHp: 100 },
    { position: new THREE.Vector3(-60, 0, 80), hp: 100, maxHp: 100 },
    { position: new THREE.Vector3(30, 0, -70), hp: 100, maxHp: 100 },
];
```

- Gleiche Geometrie wie Spieler-Panzer, aber Farbe Dunkelrot (`#8b0000`)
- Stehen still (keine KI in Phase 2)
- HP-Balken schwebt über jedem Ziel (Billboard – schaut immer zur Kamera)
- Bei HP = 0: Explosion + Wrack (siehe Teil 6)

**HP-Balken über Dummy:**
```javascript
// Als HTML-Element das per CSS über dem Canvas liegt, positioniert via
// THREE.Vector3.project(camera) → screen coordinates
```

---

## Teil 5: Krater

Bei jedem Granaten-Einschlag auf dem Boden:

```javascript
function createCrater(position) {
    // Dunkler Kreis auf dem Boden
    const geo = new THREE.CircleGeometry(2.5, 16);
    const mat = new THREE.MeshLambertMaterial({ color: '#2a1a0a' });
    const crater = new THREE.Mesh(geo, mat);
    crater.rotation.x = -Math.PI / 2;
    crater.position.set(position.x, 0.05, position.z); // knapp über Boden
    scene.add(crater);
}
```

- Maximale Anzahl Krater: 50 (ältester wird entfernt wenn voll)
- Kein 3D-Loch im Boden (zu komplex) – realistischer flacher dunkler Kreis genügt

---

## Teil 6: Zerstörung

### Häuser

- Jedes Haus hat HP: `houseHp = 3` Granaten-Treffer
- Bei HP = 0: Haus-Mesh wird entfernt, Trümmer erscheinen
- **Trümmer:** 5–8 zufällige kleine Boxen (`BoxGeometry(1-3, 1-3, 1-3)`) werden an der Position platziert, grau

### Panzer-Wrack (Dummy-Ziele)

Bei HP = 0:
1. Explosion abspielen (Sound + Visuell)
2. Panzer-Mesh: Farbe zu schwarz/dunkelgrau, leicht schief drehen (`rotation.z += 0.3`)
3. Rauch-Partikel: 10 graue Kugeln die langsam aufsteigen und verblassen (über 3 Sekunden)
4. Wrack bleibt dauerhaft auf der Karte

**Explosions-Visuell:**
```javascript
function createExplosion(position) {
    // 1. Heller Blitz: PointLight Intensität 20, Farbe orange, Dauer 100ms
    // 2. Feuer-Partikel: 15 orange/rote Kugeln, fliegen auseinander, verblassen in 1s
    // 3. Rauch: 8 graue Kugeln, steigen langsam auf, verblassen in 3s
}
```

---

## Teil 7: Sounds (Web Audio API)

Keine externen Audio-Dateien! Alle Sounds werden **synthetisch** mit der Web Audio API erzeugt.
Das ist wie Töne mit Code "malen".

Neue Datei `sounds.js`:

```javascript
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playCannonShot() {
    // Tiefer Knall: Oscillator (Sawtooth, 80Hz) + schneller Lautstärke-Abfall
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(1.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
}

function playRicochet() {
    // Hoher metallischer Ping: Oscillator (sine, 800Hz → 400Hz), kurz
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function playExplosion() {
    // Rauschen + tiefer Boom
    const bufferSize = audioCtx.sampleRate * 1.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(3.0, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
}

function playMGShot() {
    // Kurzes scharfes Knacken
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
}
```

> ⚠️ AudioContext darf erst nach einem User-Interaction gestartet werden (Browser-Regel).
> Starte `audioCtx.resume()` beim ersten Touch/Klick.

---

## Teil 8: Zielfernrohr

**Button:** "🔭" unten rechts (Toggle)
**Taste:** Z

**Zoom-Modus EIN:**
```javascript
camera.fov = 20;  // von 60 auf 20 zoomen
camera.updateProjectionMatrix();
// Zielfernrohr-Overlay einblenden (HTML-Element)
```

**Zielfernrohr-Overlay (CSS + HTML):**
```html
<div id="scope" style="display:none">
  <!-- Zwei schwarze Balken oben/unten + Kreuz in der Mitte -->
</div>
```

```css
#scope {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 100;
}
#scope::before {  /* horizontale Linie */
    content: '';
    position: absolute;
    top: 50%; left: 0; right: 0;
    height: 1px;
    background: rgba(255,50,50,0.8);
}
#scope::after {   /* vertikale Linie */
    content: '';
    position: absolute;
    left: 50%; top: 0; bottom: 0;
    width: 1px;
    background: rgba(255,50,50,0.8);
}
```

**Zoom-Modus AUS:**
```javascript
camera.fov = 60;
camera.updateProjectionMatrix();
// Overlay ausblenden
```

---

## Teil 9: UI-Ergänzungen

### Neue Buttons

```html
<!-- Neben dem bestehenden Kanonen-Button -->
<button id="btn-mg">🔫 MG</button>
<button id="btn-scope">🔭 Zoom</button>
```

### Cooldown-Anzeige Kanone

- Kanonen-Button zeigt Cooldown als Kreis-Animation (CSS `conic-gradient`)
- Text wechselt zu "⏳ 3s" während Cooldown

### Schuss-Zähler HUD

Oben rechts: `💥 Schüsse: 0` – zählt abgefeuerte Granaten (für Spass)

---

## Qualitätskriterien

**Schiessen:**
- [ ] Kanone feuert mit 3s Cooldown
- [ ] Granate fliegt mit leichtem Bogen
- [ ] MG feuert Dauerfeuer solange Button gedrückt
- [ ] Mündungsfeuer-Effekt sichtbar

**Treffer:**
- [ ] Granate trifft Dummy → HP sinkt, Balken aktualisiert sich
- [ ] Flacher Winkel → Abpraller-Sound, kein Schaden
- [ ] Dummy bei HP=0 → Explosion + Wrack

**Umgebung:**
- [ ] Granate auf Boden → Krater erscheint
- [ ] Haus bei 3 Treffern → zerstört, Trümmer sichtbar

**Sounds:**
- [ ] Kanonenschuss hörbar
- [ ] Abpraller hörbar
- [ ] Explosion hörbar
- [ ] MG-Feuer hörbar

**Zielfernrohr:**
- [ ] Zoom togglet korrekt
- [ ] Fadenkreuz sichtbar im Zoom-Modus

---

## Was Phase 2 noch NICHT enthält

- Gegner-KI (kommen in Phase 3)
- Motorgeräusch (Phase 5)
- Panzerauswahl (Phase 5)
- Minimap (Phase 5)

---

## Prompt für Claude Code

```
Lies die Datei phase2-spezifikation.md und implementiere alle neuen Features.
Wir arbeiten auf dem Branch feature/phase-2-schiessen.

Reihenfolge:
1. sounds.js erstellen und in index.html einbinden
2. Kanone implementieren (Projektil, Mündungsfeuer, Cooldown)
3. Trefferberechnung mit Winkel-Logik
4. Dummy-Ziele mit HP-Balken
5. Krater und Zerstörung
6. MG implementieren
7. Zielfernrohr
8. UI-Ergänzungen (MG-Button, Zoom-Button, Schuss-Zähler)

Starte danach den lokalen Webserver zum Testen.
```
