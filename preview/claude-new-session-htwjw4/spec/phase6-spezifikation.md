# 🎮 Panzerspiel – Phase 6 Spezifikation für Claude Code

## Ziel
Die Karte wird **hügelig und lebendiger**, man kann jetzt auch **rauf und runter zielen**,
und es gibt **mehr Panzer zur Auswahl**.

> Aufbauend auf Phase 1–5 (Welt, Panzer, Schiessen, Gegner-KI, Zerstörung, Sound, Auswahl-Bildschirm, Zielfernrohr).
> Nichts davon kaputt machen.

---

## Teil 1: 🎯 Vertikales Zielen (rauf/runter)

Bis jetzt zielt die Kanone nur nach links/rechts. Jetzt soll man auch **hoch und runter** zielen können.

- Rechter Joystick / Zielsteuerung steuert zusätzlich den **Höhenwinkel** des Kanonenrohrs
- Rohr kann sich ungefähr **-5° (leicht runter) bis +20° (deutlich hoch)** neigen
- Gilt für **Kanone, MG und Raketenwerfer**
- Wichtig für Teil 2: Wenn Gegner auf einem Hügel stehen, muss man nach oben zielen können, um sie zu treffen

---

## Teil 2: ⛰️ Hügel-Landschaft

Die Karte ist bisher flach. Jetzt bekommt sie **Hügel**.

- Einige Bereiche der Karte werden zu **sanften Hügeln** angehoben (kein steiles Gebirge, eher wellig)
- Auf den Hügeln stehen **Häuser, Bäume und Sträucher** – genauso wie in der Ebene
- **Panzer fahren die Hügel hoch und runter**, die Fahrhöhe passt sich automatisch dem Untergrund an (der Panzer "klebt" quasi am Boden, auch wenn es bergauf/bergab geht)
- **Bäume und Sträucher sind reine Deko** – man kann einfach hindurchfahren, sie bremsen nicht und sind kein Hindernis (im Gegensatz zu Häusern, die weiterhin blockieren/zerstörbar sind)

**Technik-Hinweis:** Am einfachsten mit einer Höhenkarte (z. B. einfaches Perlin-/Simplex-Noise oder ein paar sanfte Sinus-Wellen) für die Boden-Geometrie. Für die Panzerhöhe: bei jedem Frame einen Strahl (Raycast) nach unten schicken und die Y-Position des Panzers auf die getroffene Bodenhöhe setzen.

---

## Teil 3: 🛡️ Weitere Panzertypen (spielbar)

Der Auswahl-Bildschirm aus Phase 5 bekommt **3 zusätzliche, spielbare Panzer** – zusätzlich zu Königstiger und Leopard 2 A8.

| Panzer | Land | Geschwindigkeit | Panzerung |
|---|---|---|---|
| Königstiger | Deutschland | Langsam | Stark |
| Leopard 2 A8 | Deutschland | Schnell | Moderat |
| **M1A2 Abrams** | USA | Mittel | Mittel (ausgewogen) |
| **T-90** | Russland | Langsam | Sehr stark |
| **Leclerc** | Frankreich | Sehr schnell | Moderat |

- Alle neuen Panzer haben Tarnmuster, Raketenwerfer-Rohr und funktionieren mit allen bisherigen Features (Schiessen, Zoom, Zerstörung, Sound)
- Der Panzerauswahl-Bildschirm zeigt jetzt **5 Panzer** statt 2 – bei Bedarf mit Pfeilen/Scrollen durchblätterbar, falls nicht alle nebeneinander Platz haben

---

## ✅ Qualitätskriterien

- [x] Kanone, MG und Rakete können nach oben (+20°) und leicht nach unten (-5°) zielen
- [x] Karte hat sanfte Hügel mit Häusern, Bäumen und Sträuchern darauf
- [x] Panzer folgt beim Fahren automatisch der Hügel-Höhe (kein Schweben, kein Versinken)
- [x] Bäume/Sträucher bremsen nicht und sind kein Hindernis
- [x] 3 neue Panzer (Abrams, T-90, Leclerc) sind im Auswahl-Bildschirm wählbar
- [x] Alle 5 Panzer funktionieren mit Schiessen, Zoom, Zerstörung und Sound
- [x] Gegner-KI kommt mit den Hügeln zurecht (bleibt nicht stecken)
- [x] Nichts aus Phase 1–5 ist kaputtgegangen
- [x] Keine Fehler in der Browser-Konsole (F12)

---

## ⚠️ Was Phase 6 noch NICHT enthält
- Unterschiedliche Waffen-Werte pro neuem Panzer (alle nutzen vorerst die gleiche Kanone/MG/Rakete)
- Steile Berge oder Klippen – nur sanfte Hügel

---

## Umsetzung (As-Built)

> Dieser Abschnitt wurde nach der Implementierung ergänzt (Pflicht laut `CLAUDE.md`)
> und beschreibt den tatsächlichen Stand.

### Vertikales Zielen

Statt Turm und Kanone starr zu koppeln, hängen Kanone, Mündungsbauteile
(Mündungsbremse/Wärmeschutzhülle, Mantlet/Wedge-Front) und der
Raketenwerfer jetzt an einer neuen Zwischengruppe `gunPivot` innerhalb von
`turretGroup` (siehe `buildTankMesh()` in `game.js`). `gunPivot.rotation.x`
steuert den Höhenwinkel (`GUN_PITCH_MIN = -5°`, `GUN_PITCH_MAX = +20°`);
da `gunPivot` an derselben Position wie `turretGroup` sitzt, brauchten die
bestehenden Kind-Koordinaten von Kanone/Mantlet/Mündungsbremse/Raketenrohr
keine Anpassung.

Da alle Schussrichtungen (`fireShell`, `fireMG`, `fireRocket`) bereits über
`cannon.matrixWorld` berechnet werden, wirkt sich der Höhenwinkel automatisch
auf alle drei Waffen aus (MG hat ohnehin kein eigenes Mesh und nutzt den
Kanonen-Mündungspunkt).

- Tastatur: **T** (hoch) / **G** (runter)
- Touch: rechter Joystick, Y-Achse (`pitchInput = -joystickRight.y`, gleiche
  Konvention wie `moveY`)
- Im Zielfernrohr-Modus wird der Höhenwinkel wie die Turmdrehung auf 4 %
  Geschwindigkeit gedrosselt (`scopeActive ? 0.04 : 1.0`)
- Gegner-Panzer (`buildEnemyTank`) bekommen **keinen** `gunPivot` – ihre Kanone
  bleibt starr, das war für Teil 2 (Spieler zielt auf Hügel-Gegner) nicht
  gefordert

Neuer Test-Hook: `window.__testGunPitch` (aktueller `gunPivot.rotation.x` in Radiant).

### Hügel-Landschaft

Statt Raycast (Technik-Hinweis) wird eine **analytische Höhenfunktion**
verwendet, die für Boden-Displacement UND Objekt-Platzierung dieselbe Quelle
ist – einfacher und günstiger als pro Frame gegen die Boden-Geometrie zu
raycasten:

- `baseHillHeight(x, z)`: drei überlagerte Sinuswellen unterschiedlicher
  Frequenz/Amplitude (max. Amplitude ca. 6,7 Einheiten – "sanft")
- `distanceToFlatZones(x, z)`: dämpft die Amplitude in einem Streifen um
  Fluss und alle Straßen (Haupt-Ost-West-Straßen, Nord-Süd-Verbindungen) mit
  `smoothstep`-Überblendung auf 0, damit Brücken/Straßen nicht im Gelände
  versinken oder schweben
- `getTerrainHeight(x, z) = baseHillHeight(x, z) * distanceToFlatZones(x, z)`
- Die Boden-`PlaneGeometry` bekommt 100×100 Segmente; `applyTerrainToGround()`
  verschiebt jeden Vertex per `getTerrainHeight()` und ruft
  `computeVertexNormals()` für korrekte Beleuchtung auf den Hügeln auf

**Y-Position folgt dem Gelände** (statt Raycast: direkte Auswertung derselben
Höhenfunktion, jeden Frame neu):
- Spieler-Panzer (`tank.position.y`) und Gegner-Panzer (`enemy.mesh.position.y`)
- Häuser, Bäume (einzeln + Wälder), Büsche bei der Platzierung
- Krater, Wracks, Explosions-Boden-Treffer (Schuss/Rakete), Haus-Trümmer/Staub

Bäume und Büsche bremsen weiterhin nicht (unverändert aus Phase 1–5) –
sie waren bereits reine Deko ohne Tank-Kollision.

**Bekannte Einschränkung:** Haus-Zufahrtsstraßen (`buildHouseRoads()`)
folgen dem Gelände nur an ihren beiden Endpunkten (Höhe = Mittelwert von
Start-/Ziel-Bodenhöhe), nicht als durchgehend gekrümmte Fläche – bei
Häusern auf einem Hang kann die Zufahrt daher leicht schräg in den Hang
einschneiden. Haupt-/Kreuzungsstraßen und Brücken liegen bewusst in den
flach gehaltenen Zonen und sind davon nicht betroffen.

### Weitere Panzertypen

Drei neue Einträge in `TANK_TYPES` (`abrams`, `t90`, `leclerc`), gebaut mit
demselben `buildTankMesh()`-Baukasten wie Königstiger/Leopard – Tarnmuster,
Raketenwerfer und Höhenwinkel-Pivot funktionieren dadurch automatisch mit.

| Panzer | Geschwindigkeit (Faktor) | Max-Speed | Max-HP |
|---|---|---|---|
| Königstiger | 0.8× | 0.24 | 140 |
| Leopard 2 A8 | 1.35× | 0.405 | 95 |
| M1A2 Abrams | 1.05× | 0.315 | 115 |
| T-90 | 0.75× | 0.225 | 160 |
| Leclerc | 1.55× | 0.465 | 90 |

Wie in Phase 5 wird Panzerung ausschließlich als Max-HP abgebildet, kein
separater Schadensreduktionsfaktor. Waffen-Werte (Schaden/Cooldown von
Kanone/MG/Rakete) sind für alle 5 Panzer identisch – wie in den
Qualitätskriterien für Phase 6 vorgesehen.

`TANK_SELECT_ORDER = ['koenigstiger', 'leopard', 'abrams', 't90', 'leclerc']`
steuert sowohl die Vorschau-Erzeugung als auch die Button-Verknüpfung im
Auswahl-Bildschirm zentral, damit neue Panzer an einer Stelle ergänzt werden
können. Die 5 Karten laufen im bestehenden Flex-Wrap-Layout
(`#tank-select-cards`) um und werden bei Bedarf über das bereits vorhandene
`overflow-y: auto` auf `#tank-select-screen` gescrollt (kein zusätzlicher
Pfeil-Scroller nötig).

### Neue `window.__test*`-Hooks

| Hook | Typ | Beschreibung |
|------|-----|--------------|
| `__testGunPitch` | number | Aktueller Höhenwinkel `gunPivot.rotation.x` in Radiant |
| `__testTerrainHeight` | function(x, z) → number | Bodenhöhe an Weltkoordinate (x, z) |

### Bekannte Einschränkungen / Offene Punkte

- Haus-Zufahrtsstraßen folgen dem Gelände nur an den Endpunkten (siehe oben)
- Gegner-Panzer neigen ihre Kanone nicht (kein `gunPivot`) – nur relevant für
  die visuelle Kanonenausrichtung, die Ziel-Trefferlogik der Gegner-KI war
  davon nicht betroffen
- Alle 5 Panzer teilen weiterhin identische Waffen-Werte (siehe "Was Phase 6
  noch NICHT enthält")

---

## Starte so
Führe diesen Prompt in Claude Code aus:

> „Lies die Datei `phase6-spezifikation.md` und erweitere das bestehende Panzerspiel exakt gemäss der Spezifikation. Ändere nichts an den funktionierenden Teilen aus Phase 1–5. Starte danach den lokalen Webserver, damit ich es testen kann."
