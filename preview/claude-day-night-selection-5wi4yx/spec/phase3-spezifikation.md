# 🎮 Tankbuster – Phase 3 Spezifikation (As-Built)

> Dieses Dokument wurde nachträglich erstellt und beschreibt den tatsächlich
> implementierten Stand nach Phase 3. Es dient als Referenz für zukünftige
> Erweiterungen.

---

## Branch

```
claude/phase-3-gegner-3tHAq
```

---

## Übersicht implementierter Features

| Feature | Beschreibung |
|---|---|
| 🎯 Startscreen | Schwierigkeitsauswahl (Einfach / Normal / Schwer) vor Spielstart |
| 🤖 5 Gegner-Panzer | KI-gesteuerte Gegner mit eigenem Modell und HP |
| 🧠 Gegner-KI | Drehen + Vorwärtsfahren (kein Seitwärtsfahren), Umkreis-Verhalten |
| 💥 Gegner-Schuss | Shell entlang der echten Kanonenachse, mit Ungenauigkeitsfaktor |
| 🏆 Sieg/Niederlage | Overlay mit Titel, Meldung und „Nochmal spielen"-Button |
| 🗺️ Minimap | 120×120px Canvas, Spieler-Dreieck + farbige Gegner-Punkte |
| ❤️ Gegner-HP-Balken | DOM-Overlay, projiziert auf Gegner-Position |
| 🎯 Gegner-Zähler | HUD-Anzeige `X / 5` |
| 🌲 Fallende Bäume | Bäume kippen in Schussrichtung (Rodrigues-Rotation) |
| 🏚️ Häuser mit Details | Fenster (Rahmen + Glas), Tür, Dachüberstand |
| 💥 Explosion on Hit | Explosion + Krater beim Einschlag auf Boden oder Haus |
| 🚧 Haus-Durchbruch | 1× Rammen → Loch an Eintrittsstelle; 2× → Zerstörung |
| 🌿 Büsche | 50 Büsche, platten sich bei Beschuss oder Überfahren |
| 🏎️ Beschleunigung | Graduell, Höchstgeschwindigkeit 0.30 (2× bisherige) |
| 🔭 Zoom-Turm | Turm dreht sich im Scope-Modus 6.7× langsamer |

---

## Welt-Features

| Feature | Wert / Detail |
|---|---|
| Karten-Größe | 2000 × 2000 Einheiten (Nutzer-Feedback: Schlachtfeld verdoppelt, war 1000 × 1000) |
| Sichtweite (Fog) | Abhängig von Tageszeit/Wetter (Basis Tag/Klar: 300 – 1400) – volle 2×3-Matrix siehe Phase-6-Spezifikation, Abschnitt "Tag/Nacht-Auswahl" bzw. "Wetter-Auswahl" |
| Fluss | Z = −30, Breite 20 Einh., Blau `#1a5c8a`, mit Sandbänken |
| Brücken | 3 Stück bei X = −170 / +20 / +180, Betondecke + Geländer + Pfeiler |
| Straßennetz | 2 Hauptstraßen (Fluss-Parallel) + 3 N/S-Straßen + Haus-Zufahrten |
| Wälder (3 Ecken) | NW / NO / SO: je 110 Bäume, Radius 180 |
| Spawn-Sperrzone | Häuser/Bäume/Büsche/Gegner spawnen nicht im Flussbereich |

---

## Schwierigkeitsgrade

### Einfach
| # | Typ | HP | Schaden | Geschwindigkeit | Cooldown |
|---|-----|----|---------|-----------------|----------|
| 4× | leicht | 50 | 6 | 0.03 | 5.0 s |
| 1× | mittel | 80 | 12 | 0.05 | 3.5 s |

### Normal
| # | Typ | HP | Schaden | Geschwindigkeit | Cooldown |
|---|-----|----|---------|-----------------|----------|
| 2× | leicht | 50 | 8 | 0.04 | 4.0 s |
| 2× | mittel | 100 | 20 | 0.07 | 2.5 s |
| 1× | schwer | 150 | 35 | 0.10 | 1.5 s |

### Schwer
| # | Typ | HP | Schaden | Geschwindigkeit | Cooldown |
|---|-----|----|---------|-----------------|----------|
| 2× | mittel | 120 | 22 | 0.09 | 2.0 s |
| 3× | schwer | 200 | 42 | 0.12 | 1.2 s |

---

## Gegner-KI Zustandsmaschine

```
Start ──────────────────▶ angreifen (alle Gegner, sofort)
                              │
                         (kein Rückfall – Gegner verfolgen dauerhaft)

angreifen:
  - Körper dreht sich schrittweise zum Bewegungsziel (max 0.06 rad/Frame)
  - Bewegt sich mit translateZ(-speed × 2) vorwärts
  - dist > 200: direkte Annäherung ohne Seitwärts-Offset
  - dist 90–200: Annäherung mit leichtem seitlichem Versatz
  - dist 50–90: Umkreisen auf ~70 Einheiten (orbit-Winkel wechselt alle 3-5 s)
  - dist < 50: zurückfahren
  - Turm zielt unabhängig vom Körper auf Spieler (atan2(-dx,-dz))
  - Schießt aus der echten Kanonenrichtung (matrixWorld + transformDirection)
  - Winkelformel: atan2(-dx, -dz) damit translateZ(-speed) auf Spieler zeigt
```

---

## Objekt-Mengen (Spawn)

| Objekt | Anzahl | Min-Abstand Zentrum | Spawn-Radius |
|--------|--------|---------------------|--------------|
| Häuser | 20 | 30 | 760 |
| Bäume (verteilt) | 60 | 15 | 800 |
| Bäume (je Wald) | 110 | – | 180 (pro Ecke) |
| Büsche | 100 | 10 | 840 |
| Gegner | 5 | 200 (Spieler) / 30 (voneinander) | 800 |

Alle Werte mit dem Schlachtfeld verdoppelt (Nutzer-Feedback), Objekt-Anzahl
ebenfalls verdoppelt um die Kartendichte in etwa zu erhalten (bei 4×
Fläche also die Hälfte der ursprünglichen Dichte). Die Gegner-Anzahl pro
Schwierigkeitsgrad (siehe oben) bleibt unverändert.

---

## Test-Hooks (`window.__test*`)

| Hook | Typ | Beschreibung |
|------|-----|--------------|
| `__testEnemyCount` | number | Anzahl Gegner im `enemies[]`-Array |
| `__testPlayerHP` | number | Aktuelle Spieler-HP |
| `__testPlayerGetHit(dmg)` | function | Simuliert Spieler-Treffer |
| `__testTriggerGameOver(result)` | function | Löst Game-Over aus (`'gewonnen'`/`'verloren'`) |
| `__testCameraZ` | number | Z-Position der Kamera (für Bewegungs-Test) |
| `__testTankX/Z` | number | Panzer-Position |
| `__testTankWorldPos` | {x,y,z} | Panzer-Weltposition |
| `__testCannonWorldPos` | {x,y,z} | Kanonenmündung-Weltposition |
| `__testCannonDir` | {x,y,z} | Kanonenrichtung (normiert, `\|z\| > 0.9` = korrekt) |
| `__testJoystickLeft` | {active,x,y} | Linker Joystick-Zustand |

---

## Preview-Banner

Der Banner zeigt **Branch-Slug** und **Commit-Hash** (7 Zeichen) an:

```
⚠ PREVIEW – Branch: claude-phase-3-gegner-3thaq · Commit: a1b2c3d
```

`version.js` wird von `deploy-preview.yml` generiert:
```javascript
window.BRANCH_NAME = 'claude-phase-3-gegner-3thaq';
window.COMMIT_HASH  = 'a1b2c3d';
window.IS_PREVIEW   = true;
```

---

## Bekannte Einschränkungen / Offene Punkte

- Gegner weichen Häusern, Bäumen und dem Fluss nicht aus (keine Wegfindung)
- Spieler kann durch den Fluss fahren (kein Wasser-Physics)
- ~~Dummy-Ziele (rot, 3 Stück)~~ entfernt in Phase 3 Bugfix
- Kein Respawn-Mechanismus für Gegner
- Keine Munitions-Begrenzung
