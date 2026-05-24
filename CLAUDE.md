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

### 1. Spezifikation hochgeladen?
→ Datei unter `spec/<phase>-spezifikation.md` ablegen.

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

### 5. Nach Abschluss der Arbeit
Immer die GitHub Pages Links ausgeben:
- **Preview** (aktueller Branch): `https://stesieber.github.io/Tankbuster/preview/<branch-slug>/`
- **Production** (nach Merge auf main): https://stesieber.github.io/Tankbuster/

---

## Bekannte Eigenheiten

- `version.js` wird von GitHub Actions für Preview-Deployments überschrieben. Die committed Version enthält `IS_PREVIEW=false` als Stub – das ist korrekt.
- Touch-Events müssen auf `document` (nicht `canvas`) registriert werden, weil die Joystick-Divs über dem Canvas liegen und sonst die Events abfangen.
- `preserveDrawingBuffer: true` auf dem WebGLRenderer ist nötig damit Playwright Canvas-Pixel lesen kann.
- `ignoreHTTPSErrors: true` in `playwright.config.js` weil CDN-Zertifikate in der Remote-Execution-Umgebung nicht validiert werden können.
