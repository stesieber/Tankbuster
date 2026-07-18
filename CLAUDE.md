# Tankbuster – Claude Code Projektdokumentation

## Projektübersicht

3D-Panzer-Browserspiel, aufgebaut mit plain HTML/CSS/JS und Three.js (kein Build-Tool).
Läuft auf Desktop (Tastatur) und Mobile (Touch-Joysticks).
Deployed auf GitHub Pages via GitHub Actions.

**Repository:** `stesieber/Tankbuster`
**GitHub Pages Production:** https://stesieber.github.io/Tankbuster/
**GitHub Pages Preview:** `https://stesieber.github.io/Tankbuster/preview/<branch-slug>/`

---

## Tech-Stack

| Was | Wie |
|---|---|
| 3D-Rendering | Three.js r128 via CDN (`cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js`) |
| Kein Build-Tool | plain HTML/CSS/JS |
| Tests | Playwright (E2E) + Node.js Unit-Tests |
| CI/CD | GitHub Actions → GitHub Pages (`peaceiris/actions-gh-pages@v4`) |

**Wichtig:** Three.js >= r152 hat `build/three.min.js` entfernt → immer r128 (0.128.0) verwenden.

---

## Dateistruktur

```
Tankbuster/
├── index.html              # Spiel-HTML, Canvas, Joystick-Divs, HUD
├── game.js                 # Three.js Szene, Spiellogik, Input
├── style.css               # Layout, Joystick-Styling, HUD
├── version.js              # Stub (IS_PREVIEW=false); wird von CI für Preview überschrieben
├── package.json            # Dev-Dependencies (Playwright)
├── playwright.config.js    # Playwright-Konfiguration (Port 7777, python3 -m http.server)
├── spec/                   # Spezifikationen (eine Datei pro Phase)
│   └── phase1-spezifikation.md
├── tests/
│   ├── smoke.spec.js       # Playwright E2E Tests
│   └── unit/               # Node.js Unit-Tests (kein Browser nötig)
└── .github/workflows/
    ├── deploy-production.yml   # main → GitHub Pages root
    └── deploy-preview.yml      # andere Branches → /preview/<slug>/
```

---

## Spielsteuerung

| Aktion | Tastatur | Touch |
|---|---|---|
| Vorwärts/Rückwärts | W / S | Linker Joystick Y |
| Drehen | A / D | Linker Joystick X |
| Turm drehen | Q / E | Rechter Joystick X |
| Höhenwinkel (Kanone/MG/Rakete) | T / G | Rechter Joystick Y |

---

## Branch → Deployment URL

Branch-Slug = Branch-Name mit `/` → `-`, alles lowercase.

| Branch | URL |
|---|---|
| `main` | https://stesieber.github.io/Tankbuster/ |
| `feature/foo` | https://stesieber.github.io/Tankbuster/preview/feature-foo/ |

---

## Tests ausführen

```bash
npm test                        # alle Playwright Tests
npm test -- --grep "Joystick"   # einzelner Test
```

Unit-Tests (sobald vorhanden):
```bash
node --test tests/unit/*.test.js
```

---

## Entwicklungs-Workflow

### 1. Spezifikation vorhanden?
→ Datei unter `spec/<phase>-spezifikation.md` ablegen bzw. prüfen.

### 2. Vor jeder Implementierung: Tests schreiben
- **Nicht-triviale Logik** (Koordinaten-Normierung, Kollision, Schadens-Berechnung etc.) → Unit-Test in `tests/unit/`
- **Funktionalität im Browser** → Playwright E2E Test in `tests/smoke.spec.js`
- Playwright-Tests sind **nicht sinnvoll** für: Zufalls-Layouts (Häuser/Bäume-Positionen), rein visuelle Pixel-Qualität, WebGL-Shader-Output.

### 3. Bug gemeldet?
1. Zuerst einen Playwright-Test schreiben, der den Bug reproduziert (Test muss rot sein)
2. Dann den Bug fixen (Test wird grün)
3. Erst dann committen

### 4. Vor dem Push
```bash
npm test   # alle Tests müssen grün sein
```
Nie pushen wenn Tests rot sind. Bug zuerst fixen.

### 5. Spezifikation nachführen (PFLICHT)
Nach **jeder** inhaltlichen Änderung (neues Feature, Bugfix mit Verhaltensänderung,
Konfigurationsänderung) die betroffene Spec-Datei aktualisieren:
- Neue Features → als Zeile in der Feature-Tabelle ergänzen
- Geänderte Werte (Geschwindigkeit, Counts, KI-Parameter) → Tabellen anpassen
- Neue `window.__test*`-Hooks → in der Hooks-Tabelle ergänzen
- Neue Bekannte Einschränkungen / Offene Punkte → am Ende notieren

Gilt auch für As-Built-Dokumente wenn Spezifikation nachträglich erstellt wird.

### 6. Nach Abschluss der Arbeit
Immer die GitHub Pages Links **als klickbare Markdown-Links** ausgeben:
- **Preview** (aktueller Branch): `[Preview öffnen](https://stesieber.github.io/Tankbuster/preview/<branch-slug>/)`
- **Production** (nach Merge auf main): [Production öffnen](https://stesieber.github.io/Tankbuster/)

Beispiel für Branch `claude/phase-3-gegner-3tHAq` (Slug: `claude-phase-3-gegner-3thaq`):
- [Preview öffnen](https://stesieber.github.io/Tankbuster/preview/claude-phase-3-gegner-3thaq/)
- [Production öffnen](https://stesieber.github.io/Tankbuster/)

---

## Koordinatensystem & 3D-Ausrichtung

Three.js rechtshändiges System. Diese Konventionen gelten im gesamten Projekt:

| Achse | Bedeutung |
|---|---|
| **-Z** | Vorwärts (Panzer fährt in -Z mit `translateZ(-speed)`) |
| **+Z** | Rückwärts / Kamerarichtung (`behind = (0, 8, +15)` = hinter dem Panzer) |
| **+Y** | Oben |
| **+X** | Rechts |

### Kanone

- Geometrie: `CylinderGeometry` mit `rotation.x = PI/2` → Zylinderachse (lokale Y) zeigt im Elternraum auf **+Z**
- Position: `(0, 0, -2.5)` im Turret-Lokalraum = **Vorderseite** des Panzers
- Mündungsspitze in Weltkoordinaten: `cannon.getWorldPosition() + dir * 2`
- **Schussrichtung**: `new THREE.Vector3(0, -1, 0)` im Kanonenloklaraum  
  → `transformDirection(cannon.matrixWorld)` ergibt Welt-`(0, 0, -1)` = vorwärts
- `__testCannonDir` verwendet `(0, 1, 0)` → ergibt `(0, 0, +1)` (Zylinder-Längsachse, nicht Schussrichtung; Betrag `|z| > 0.9` korrekt)

### Zielfernrohr-Kamera

Im Scope-Modus überschreibt `updateScopeCamera()` die Third-Person-Kamera:
- Position: 4.5 Einheiten **hinter** dem Kanonenzentrum (entgegengesetzt zur
  Schussrichtung) plus 1.4 Einheiten nach oben. Der Y-Versatz muss über der
  höchsten Turmkuppel liegen (Turmhöhe/2 + Kuppel ≈ 0.96) und der Z-Versatz
  über der Turmbox-Tiefe (±1.25..1.35) hinausreichen – sonst steckt die
  Kamera in der Turm-Geometrie (im 15°-Zoom füllt naheliegende Geometrie
  dann den ganzen Bildschirm, man sieht keine Umgebung mehr).
- `camera.lookAt()` auf einen Punkt 300 Einheiten vor der Mündung

---

## Bekannte Eigenheiten

- `version.js` wird von GitHub Actions für Preview-Deployments überschrieben. Die committed Version enthält `IS_PREVIEW=false` als Stub – das ist korrekt.
- Touch-Events müssen auf `document` (nicht `canvas`) registriert werden, weil die Joystick-Divs über dem Canvas liegen und sonst die Events abfangen.
- `preserveDrawingBuffer: true` auf dem WebGLRenderer ist nötig damit Playwright Canvas-Pixel lesen kann.
- `ignoreHTTPSErrors: true` in `playwright.config.js` weil CDN-Zertifikate in der Remote-Execution-Umgebung nicht validiert werden können.
