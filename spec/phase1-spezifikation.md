# 🎮 Panzerspiel – Phase 1 Spezifikation für Claude Code

## Ziel
Erstelle ein lauffähiges 3D-Browserspiel mit einem fahrbaren Panzer auf einer Karte –
inklusive vollständiger Deployment-Pipeline auf GitHub Pages.

---

## Projektstruktur

```
panzerspiel/
├── index.html
├── game.js
├── style.css
└── .github/
    └── workflows/
        ├── deploy-production.yml   ← main → GitHub Pages (Production)
        └── deploy-preview.yml      ← alle anderen Branches → Preview-URL
```

---

## Technologie

- **Three.js** via CDN: `https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.min.js`
- Kein Build-Tool, kein npm – nur plain HTML/CSS/JS
- Muss auf Smartphone und Tablet im Browser laufen

---

## Teil 1: Deployment Pipeline

### Branch-Strategie

```
main
  └── feature/phase-2-schiessen
  └── feature/phase-3-gegner
  └── fix/joystick-bug
  usw.
```

| Branch | Deployment-URL |
|---|---|
| `main` | `https://<USERNAME>.github.io/panzerspiel/` |
| `feature/phase-2-schiessen` | `https://<USERNAME>.github.io/panzerspiel/preview/feature-phase-2-schiessen/` |
| `fix/joystick-bug` | `https://<USERNAME>.github.io/panzerspiel/preview/fix-joystick-bug/` |

### GitHub Actions: Production (`deploy-production.yml`)

Wird ausgelöst bei jedem Push auf `main`.

```yaml
name: Deploy Production

on:
  push:
    branches:
      - main

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to GitHub Pages (root)
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
          destination_dir: .
          exclude_assets: '.github,*.md'
```

### GitHub Actions: Preview (`deploy-preview.yml`)

Wird ausgelöst bei jedem Push auf alle Branches **ausser** `main` und `gh-pages`.

```yaml
name: Deploy Preview

on:
  push:
    branches-ignore:
      - main
      - gh-pages

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Branch-Namen für URL aufbereiten
        id: branch
        run: |
          BRANCH="${GITHUB_REF_NAME}"
          SLUG=$(echo "$BRANCH" | sed 's|/|-|g' | tr '[:upper:]' '[:lower:]')
          echo "slug=$SLUG" >> $GITHUB_OUTPUT

      - name: Deploy Preview
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
          destination_dir: preview/${{ steps.branch.outputs.slug }}
          exclude_assets: '.github,*.md'
```

### GitHub Repository einrichten

Claude Code soll folgende Schritte ausführen:

1. `git init` (falls noch kein Repo)
2. `.gitignore` erstellen mit: `.DS_Store`, `node_modules/`, `*.log`
3. Ersten Commit erstellen: `"🎮 Initial commit: Phase 1 Panzerspiel"`
4. Remote hinzufügen: `git remote add origin https://github.com/<USERNAME>/panzerspiel.git`
5. Push auf `main`
6. In GitHub unter Settings → Pages → Source: `gh-pages` Branch, Root `/` einstellen

> ⚠️ **Hinweis für Claude Code:** Den GitHub-Username beim User erfragen, bevor du die Remote-URL setzt.

### Preview-URL im Spiel anzeigen

Füge in `index.html` einen kleinen Banner ein, der **nur in Preview-Deployments** sichtbar ist:

```html
<!-- Wird per GitHub Actions gesetzt -->
<div id="preview-banner" style="display:none">
  ⚠️ PREVIEW – Branch: <span id="branch-name"></span>
</div>
```

Setze den Branch-Namen via GitHub Actions als Umgebungsvariable in eine `version.js`:

```yaml
# Zusätzlicher Schritt im deploy-preview.yml:
- name: version.js erstellen
  run: |
    echo "window.BRANCH_NAME = '${{ steps.branch.outputs.slug }}';" > version.js
    echo "window.IS_PREVIEW = true;" >> version.js
```

In `game.js` am Anfang:
```javascript
if (window.IS_PREVIEW) {
  document.getElementById('preview-banner').style.display = 'block';
  document.getElementById('branch-name').textContent = window.BRANCH_NAME;
}
```

---

## Teil 2: Das Spiel (Phase 1)

### index.html

- Lädt `style.css`, `three.min.js` (CDN), `version.js` (mit `?v=1` cache-busting) und `game.js`
- Enthält einen `<canvas id="gameCanvas">`
- Enthält die Touch-UI (Joysticks und Buttons) als HTML-Elemente über dem Canvas
- Preview-Banner oben (siehe oben)

---

### style.css

- `body` und `canvas`: kein Margin, kein Scroll, volle Bildschirmgrösse (`100vw / 100vh`)
- Joystick-Basis: fixiert unten links/rechts, runde graue Fläche, halbtransparent
- Joystick-Knopf: kleinerer Kreis in der Mitte, weiss, halbtransparent
- Schiess-Button: unten rechts, roter runder Button, beschriftet "🔴 Kanone"
- HUD oben links: HP-Anzeige als roter Balken mit Text
- Preview-Banner: schmaler gelber Balken ganz oben, `position: fixed`, `z-index: 9999`

---

### game.js – Detaillierte Anforderungen

#### 1. Three.js Szene aufsetzen

- `THREE.Scene`, `THREE.WebGLRenderer` (Canvas fullscreen, `antialias: true`)
- Renderer passt sich bei `window resize` automatisch an
- Hintergrundfarbe: Himmelblau (`#87CEEB`)
- Nebel (`THREE.Fog`) für Tiefenwirkung: Farbe Himmelblau, near 100, far 400

#### 2. Kamera

- `THREE.PerspectiveCamera` (FOV 60, aspect auto)
- Folgt dem Panzer von hinten oben (Third-Person)
- Position relativ zum Panzer: ca. 15 Einheiten hinter, 8 Einheiten über dem Panzer
- Schaut immer auf den Panzer (camera.lookAt auf Panzer-Position)

#### 3. Beleuchtung

- `THREE.AmbientLight` (weiss, Intensität 0.6)
- `THREE.DirectionalLight` (weiss, Intensität 1.0), Position (50, 100, 50), wirft Schatten

#### 4. Boden

- `THREE.PlaneGeometry(500, 500)`, rotiert um -90° auf X-Achse (horizontal)
- Material: `MeshLambertMaterial`, Farbe Olivgrün (`#4a5e23`)
- Empfängt Schatten (`receiveShadow = true`)

#### 5. Häuser (10 Stück)

- Jedes Haus = `THREE.BoxGeometry`, zufällige Grösse: Breite/Tiefe 8–15, Höhe 8–20
- Material: `MeshLambertMaterial`, graue Farbe (`#888`)
- Zufällige Positionen auf der Karte, aber mindestens 30 Einheiten vom Startpunkt (0,0) entfernt
- Werfen und empfangen Schatten

#### 6. Bäume (15 Stück)

- Stamm: schmaler Zylinder, braun
- Krone: grüne Kugel (`SphereGeometry`) oben drauf
- Zufällig verteilt, nicht zu nah an Häusern

#### 7. Spieler-Panzer

Baue den Panzer aus einfachen Three.js Geometrien (kein externes 3D-Modell nötig):

**Panzerkorpus (`body`):**
- `BoxGeometry(4, 1.5, 6)`, Farbe Dunkelgrün (`#3a5a2a`)
- Position Y = 1.0 (leicht über Boden)

**Turm (`turret`):**
- `BoxGeometry(2.5, 1.2, 2.5)`, gleiche Farbe
- Auf den Korpus gesetzt (Y relativ: +1.3)
- Ist ein Kind (`add`) des Korpus

**Kanone (`cannon`):**
- `CylinderGeometry(0.15, 0.15, 4)`, rotiert 90° auf Z-Achse
- Vorne am Turm befestigt (Z relativ: +2.5)
- Kind des Turms

**Ketten (als flache Boxen links und rechts):**
- 2x `BoxGeometry(0.5, 0.8, 6.2)`, schwarz (`#222`)
- Links und rechts am Korpus

Alle Teile in einer `THREE.Group` namens `tank` zusammenfassen.
Startposition: `(0, 0, 0)`

#### 8. Fahren & Drehen

```javascript
// Pseudocode
speed = 0.15
turnSpeed = 0.03

tank.translateZ(-speed * joystickLeft.y)   // vorwärts/rückwärts
tank.rotateY(-turnSpeed * joystickLeft.x)  // links/rechts drehen
```

Panzer bleibt immer auf Y=0 (kein Fliegen).

#### 9. Turm-Steuerung (rechter Joystick)

- Rechter Joystick X-Achse dreht den Turm relativ zum Korpus
- `turret.rotateY(-turnSpeed * joystickRight.x)`

#### 10. Touch-Joystick Logik

```javascript
const joystickLeft  = { active: false, touchId: null, x: 0, y: 0, baseX: 0, baseY: 0 };
const joystickRight = { active: false, touchId: null, x: 0, y: 0, baseX: 0, baseY: 0 };
```

- `touchstart`: linke Bildschirmhälfte → linker Joystick, rechts → rechter
- `touchmove`: Differenz normieren auf -1..+1 (max. 50px Radius)
- `touchend` / `touchcancel`: Joystick zurücksetzen

Joystick-Knopf visuell: `transform: translate(x, y)` (max. 40px)

**Tastatur-Support (für Desktop-Tests):**
- W/S = vorwärts/rückwärts
- A/D = drehen
- Q/E = Turm drehen

#### 11. HUD

- HP-Anzeige oben links: roter Balken + Text "❤️ HP: 100 / 100"
- Panzer-Name: "🐯 Königstiger"

#### 12. Animationsschleife

```javascript
function animate() {
    requestAnimationFrame(animate);
    // 1. Eingabe verarbeiten
    // 2. Panzer bewegen
    // 3. Kamera nachführen
    // 4. renderer.render(scene, camera)
}
animate();
```

---

## Qualitätskriterien

**Spiel:**
- [ ] Öffnet sich ohne Fehler in der Browser-Konsole
- [ ] Panzer fährt vorwärts/rückwärts und dreht sich
- [ ] Turm dreht sich unabhängig vom Korpus
- [ ] Kamera folgt dem Panzer
- [ ] Touch-Joysticks funktionieren auf Smartphone
- [ ] Tastatur funktioniert auf Desktop (W/A/S/D)
- [ ] Häuser sichtbar auf der Karte
- [ ] Kein Absturz beim Resize

**Deployment:**
- [ ] Push auf `main` → Production URL ist erreichbar
- [ ] Push auf Feature-Branch → Preview-URL ist erreichbar
- [ ] Preview-Banner erscheint auf Preview-Deployments
- [ ] GitHub Actions laufen ohne Fehler durch

---

## Was Phase 1 noch NICHT enthält

- Schiessen / Granaten
- Gegner-Panzer
- HP-Schaden
- Sounds
- Panzerauswahl-Menü
- Kollisionserkennung mit Häusern
