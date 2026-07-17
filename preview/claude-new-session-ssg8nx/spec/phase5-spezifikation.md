# 🎮 Panzerspiel – Phase 5 Spezifikation für Claude Code

## Ziel
Der **letzte Schliff**: Ein Panzerauswahl-Bildschirm zum Start, ein richtiges Zielfernrohr zum Reinzoomen,
und überall dort, wo es noch ruckelig oder unfertig wirkt, wird es aufgeräumt.

> Aufbauend auf Phase 1–4 (Welt, Panzer, Schiessen, Gegner-KI, Zerstörung, Sounds, Raketenwerfer, Tarnmuster).
> Nichts davon kaputt machen.

---

## Teil 1: 🚦 Panzerauswahl-Bildschirm

Bevor das Spiel startet, erscheint ein **Auswahl-Bildschirm**:

- Zeigt beide Panzer nebeneinander: **Königstiger** und **Leopard 2 A8**
- Jeder Panzer dreht sich langsam (3D-Vorschau), damit man ihn von allen Seiten sieht – inklusive **Tarnmuster** und **Raketenwerfer-Rohr**
- Kurzer Vergleich als Tabelle oder Balken:

| Panzer | Geschwindigkeit | Panzerung |
|---|---|---|
| Königstiger | Langsam | Stark |
| Leopard 2 A8 | Schnell | Moderat |

- Grosser **„Auswählen"-Knopf** unter jedem Panzer
- Nach der Auswahl startet das Spiel mit dem gewählten Panzer

**Technik-Hinweis:** Der Bildschirm kann eine einfache HTML/CSS-Overlay-Seite über dem Three.js-Canvas sein, die beim Klick auf „Auswählen" ausgeblendet wird und das Spiel startet.

---

## Teil 2: 🔭 Zielfernrohr-Zoom

Beim Drücken des Zielfernrohr-Buttons zoomt die Kamera näher ran, um genauer zielen zu können.

- Kamera-Zoom rein/raus per Knopf (an/aus)
- Im Zoom-Modus: **Fadenkreuz** in der Bildschirmmitte
- Leichte **Vignette** (abgedunkelte Ränder) für den „Durch-das-Zielfernrohr"-Effekt
- Die in Phase 4 bereits verlangsamte Turmdrehung im Zoom bleibt so wie sie ist – passt gut zum genauen Zielen

---

## Teil 3: ✨ Feinschliff Steuerung & Optik

Kleinere Verbesserungen, die das Spiel runder wirken lassen:

- **Joysticks:** weicher/direkter reagieren, kein Ruckeln bei schnellen Richtungswechseln
- **HUD:** HP-Balken, Minimap und Waffen-Anzeige (Kanone/MG/Rakete) übersichtlich anordnen, gut lesbar auf kleinen Handy-Bildschirmen
- **Beleuchtung:** Schatten und Licht auf der Karte etwas natürlicher wirken lassen
- **Waffen-Wechsel:** deutlich sichtbar machen, welche der drei Waffen (Kanone / MG / Rakete) gerade aktiv ist

---

## ✅ Qualitätskriterien

- [x] Panzerauswahl-Bildschirm zeigt beide Panzer drehend mit Tarnmuster und Raketenwerfer
- [x] Auswahl startet das Spiel korrekt mit dem gewählten Panzer (Werte für Speed/Panzerung stimmen)
- [x] Zielfernrohr zoomt rein/raus mit Fadenkreuz und Vignette
- [x] Joysticks fühlen sich weich und ruckelfrei an
- [x] HUD ist übersichtlich und auf dem Handy gut lesbar
- [x] Aktive Waffe (Kanone/MG/Rakete) ist klar erkennbar
- [x] Nichts aus Phase 1–4 ist kaputtgegangen
- [x] Keine Fehler in der Browser-Konsole (F12)

---

## Umsetzung (As-Built)

> Dieser Abschnitt wurde nach der Implementierung ergänzt (Pflicht laut `CLAUDE.md`)
> und beschreibt den tatsächlichen Stand.

### Panzer-Typen

Panzer werden über einen gemeinsamen Baukasten (`buildTankMesh(cfg)` in `game.js`)
erzeugt – derselbe Code baut sowohl den Spieler-Panzer als auch die zwei
rotierenden Vorschau-Modelle im Auswahl-Bildschirm.

| Panzer | Geschwindigkeit (Faktor) | Max-Speed | Max-HP | Farbe |
|---|---|---|---|---|
| Königstiger | 0.8× | 0.24 | 140 | Dunkelgrün-Tarnmuster |
| Leopard 2 A8 | 1.35× | 0.405 | 95 | Grau-Grün-Tarnmuster |

Basiswerte (Referenz Phase 3/4): `BASE_TANK_MAX_SPEED = 0.30`,
`BASE_TANK_ACCEL = 0.010`, `BASE_TANK_DECEL = 0.015`. Vor der Panzerauswahl
gelten diese Basiswerte plus 100/100 HP unverändert (Rückwärtskompatibilität
mit Tests, die ohne Panzerauswahl direkt Werte prüfen).

### Realistischere Panzer-Silhouette

Auf Wunsch nach dem ersten Durchlauf wurde der Panzer-Baukasten (`buildTankMesh`)
um Detail-Bauteile erweitert, die auch der Gegner-Panzer-Baukasten
(`buildEnemyTank`) über dieselben Hilfsfunktionen nutzt – statt reiner Box-Optik:

| Bauteil | Funktion | Beschreibung |
|---|---|---|
| Laufrollen | `addRoadWheels()` | Verzweigt je `cfg.wheelStyle` in `addRoadWheelsModern()` oder `addRoadWheelsOverlapping()` |
| Geneigte Wannenfront | `addGlacisPlate()` | Schräge Frontplatte statt Steilwand |
| Triebwerksdeck | `addEngineDeckDetail()` | Dunkle Gitter-Andeutung auf dem Heck |
| Antenne | `addAntenna()` | Dünner Stab am Heck |
| Turmfront | `addTurretMantlet()` / `addWedgeTurretFront()` | Verzweigt je `cfg.turretStyle` |
| Kommandantenkuppel + Luke | `addCommanderCupola()` | Zylinder + flache Luke auf dem Turmdach |
| Mündungsbauteil | `addMuzzleDetails()` | Verzweigt je `cfg.muzzleStyle` in `addDoubleBaffleMuzzleBrake()` oder `addThermalSleeve()` |

Nach der ersten (generischen) Detail-Runde wurden Königstiger und Leopard 2 A8
zusätzlich historisch differenziert – über drei Konfig-Felder pro Typ:

| Feld | Königstiger | Leopard 2 A8 |
|---|---|---|
| `wheelStyle` | `'overlapping'` – Schachtellaufwerk: 5 große Laufrollen außen + 4 versetzte innen je Seite, überlappen sich sichtbar (historisches Markenzeichen des Tiger II) | `'modern'` – 6 gleichmäßig verteilte Einzelrollen, kein Überlapp |
| `turretStyle` | `'roundedMantlet'` – gerundete Kanonenblende (`addTurretMantlet`) | `'wedge'` – flache, geneigte Verbundpanzerung-Module + seitliche Schrägkanten (`addWedgeTurretFront`), passend zur modernen Leopard-2A5+-Turmform |
| `muzzleStyle` | `'doubleBaffle'` – zweistufige Mündungsbremse der 8.8cm KwK 43 | `'sleeve'` – schlankes Glattrohr ohne Bremse, nur helle Wärmeschutzhülle-Ringe |

`buildEnemyTank()` nutzt weiterhin den generischen/modernen Satz
(`'modern'` / `'roundedMantlet'` / `'doubleBaffle'`), da Gegner nicht Teil der
Panzerauswahl sind.

Panzerung wird als effektive Max-HP abgebildet (kein zusätzlicher
Rüstungs-Multiplikator auf den Schaden) – Königstiger hält mehr Treffer aus,
Leopard 2 A8 ist dafür deutlich schneller.

### Panzerauswahl-Bildschirm

- `#tank-select-screen` liegt über dem bisherigen Schwierigkeits-Startscreen
  (z-index 950 vs. 900) und blockiert Eingaben bis ein Panzer gewählt wurde.
- Jede Karte enthält eine eigene kleine Three.js-Szene/Renderer
  (`buildTankPreview()`), die den Panzer über `tank.rotation.y` kontinuierlich
  dreht. Die Preview-Renderer laufen in einer eigenen `requestAnimationFrame`-
  Schleife und werden nach Auswahl gestoppt (`stopTankPreviews()`), um GPU-Last
  im laufenden Spiel zu sparen.
- **Wichtig:** Preview-Renderer brauchen `preserveDrawingBuffer: true`,
  sonst liefert `drawImage()`/`getImageData()` (z. B. in Tests) nur
  schwarze Pixel – siehe bekannte Eigenheit in `CLAUDE.md`.

### Zielfernrohr-Zoom

War bereits aus Phase 4 vorhanden (FOV-Zoom auf 15°, `#scope`-Overlay mit
Fadenkreuz + Vignette, 6.7× langsamere Turmdrehung) und erfüllt die
Phase-5-Kriterien unverändert. Keine Änderung nötig, nur verifiziert.

### Feinschliff Steuerung & Optik

- **Joystick-Deadzone** (`JOYSTICK_DEADZONE = 0.08`, `applyDeadzone()`):
  filtert Finger-Zittern nahe der Mitte.
- **Eingabe-Glättung** (`smoothRotY`/`smoothTurretY`, `INPUT_SMOOTH_RATE = 18`):
  Dreh- und Turmrichtung werden pro Frame per Lerp geglättet
  (`Math.min(1, INPUT_SMOOTH_RATE * dt)`), dadurch kein abruptes Ruckeln
  mehr bei schnellen Richtungswechseln.
- **Beleuchtung:** `HemisphereLight` (Himmel/Boden) ergänzt das bisherige
  Ambient-/Directional-Licht für natürlichere Schattierung; Schatten-Kamera
  des Directional Lights ist jetzt explizit auf ±120 Einheiten / 2048px
  Shadow-Map konfiguriert (vorher Three.js-Default, sehr kleiner Frustum).
- **Waffen-Anzeige** (`#weapon-hud`, oben mittig, z-index 150 – bleibt auch
  im Zielfernrohr-Modus lesbar): drei Slots (Kanone/MG/Rakete) mit Zuständen
  `ready` / `active` / `cooldown`, gesteuert über `setWeaponSlotState(name, state)`.

### Neue `window.__test*`-Hooks

| Hook | Typ | Beschreibung |
|------|-----|--------------|
| `__testSelectedTank` | string | Gewählter Panzer-Typ (`'koenigstiger'` / `'leopard'`) |
| `__testTankMaxSpeed` | number | Aktuelle `TANK_MAX_SPEED` nach Panzerauswahl |

### Bekannte Einschränkungen / Offene Punkte

- Panzerung ist nur als Max-HP abgebildet, nicht als zusätzlicher
  Schadens-Reduktionsfaktor pro Treffer.
- Panzerauswahl gilt nur für den aktuellen Durchlauf; nach „Nochmal spielen“
  (Seiten-Reload) muss erneut gewählt werden (wie bisher bei der
  Schwierigkeitsauswahl).
- Zielfernrohr-Zoom-Übergang (FOV 60→15) ist ein harter Schnitt, kein
  weicher Übergang.

---

## Starte so
Führe diesen Prompt in Claude Code aus:

> „Lies die Datei `phase5-spezifikation.md` und erweitere das bestehende Panzerspiel exakt gemäss der Spezifikation. Ändere nichts an den funktionierenden Teilen aus Phase 1–4. Starte danach den lokalen Webserver, damit ich es testen kann."
