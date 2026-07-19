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
- Unterschiedliche Waffen-Werte pro neuem Panzer (alle nutzen vorerst die gleiche Kanone/MG/Rakete) –
  gilt weiterhin für Königstiger/Leopard/Abrams/T-90/Leclerc; der später ergänzte
  M270 MLRS (siehe Umsetzung/As-Built) ist bewusst die einzige Ausnahme (nur Raketen-Salven)
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

**Bugfix Zielfernrohr-Kamera (Nutzer-Feedback):** `updateScopeCamera()`
positionierte die Kamera nur 3 Einheiten hinter dem Kanonenzentrum und
0,2 Einheiten höher – das liegt **innerhalb** der Turmbox/-kuppel. Im
15°-Zoom füllte diese unmittelbar angrenzende Geometrie den kompletten
Bildschirm, man sah keine Umgebung mehr. Fix: Kamera jetzt 4,5 Einheiten
hinter dem Kanonenzentrum und 1,4 Einheiten höher (über der höchsten
Kommandantenkuppel, siehe `CLAUDE.md` → Zielfernrohr-Kamera).

### Hügel-Landschaft

Statt Raycast (Technik-Hinweis) wird eine **analytische Höhenfunktion**
verwendet, die für Boden-Displacement UND Objekt-Platzierung dieselbe Quelle
ist – einfacher und günstiger als pro Frame gegen die Boden-Geometrie zu
raycasten:

- `baseHillHeight(x, z)`: drei überlagerte Sinuswellen unterschiedlicher
  Frequenz/Amplitude (max. Amplitude ca. 20 Einheiten – nach Nutzer-Feedback
  auf das 3-Fache der ursprünglichen ~6,7 Einheiten angehoben)
- `distanceToFlatZones(x, z)`: dämpft die Amplitude in einem Streifen um
  Fluss und alle Straßen (Haupt-Ost-West-Straßen, Nord-Süd-Verbindungen) mit
  `smoothstep`-Überblendung auf 0, damit Brücken/Straßen nicht im Gelände
  versinken oder schweben
- `getTerrainHeight(x, z) = baseHillHeight(x, z) * distanceToFlatZones(x, z)`
- Die Boden-`PlaneGeometry` bekommt 100×100 Segmente; `applyTerrainToGround()`
  verschiebt jeden Vertex per `getTerrainHeight()` und ruft
  `computeVertexNormals()` für korrekte Beleuchtung auf den Hügeln auf

**Straßen führen jetzt tatsächlich über die Brücken** (Nutzer-Feedback):
Die Nord-Süd-Verbindungsstraßen liefen ursprünglich bei x=-200/0/200,
die drei Brücken aber bei x=-85/10/90 – wer der Straße folgte, landete nie
auf einer Brücke. Beide Positionslisten sind jetzt eine gemeinsame Konstante
(`BRIDGE_XS = [-85, 10, 90]`), sodass Brücken und Verbindungsstraßen exakt
übereinanderliegen.

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
| M270 MLRS | 1.2× | 0.36 | 65 |
| Puma | 1.35× | 0.405 | 85 |

Wie in Phase 5 wird Panzerung ausschließlich als Max-HP abgebildet, kein
separater Schadensreduktionsfaktor. Waffen-Werte (Schaden/Cooldown von
Kanone/MG/Rakete) sind für die 5 "normalen" Panzer identisch – wie in den
Qualitätskriterien für Phase 6 vorgesehen. M270 MLRS und Puma (siehe unten)
sind davon ausgenommen: beide haben nur jeweils eine einzige Spezialwaffe
(Raketen-Salven bzw. Maschinenkanone) statt Kanone+MG+Rakete.

`TANK_SELECT_ORDER = ['koenigstiger', 'leopard', 'abrams', 't90', 'leclerc', 'mlrs', 'puma']`
steuert sowohl die Vorschau-Erzeugung als auch die Button-Verknüpfung im
Auswahl-Bildschirm zentral, damit neue Panzer an einer Stelle ergänzt werden
können. Die 7 Karten laufen im bestehenden Flex-Wrap-Layout
(`#tank-select-cards`) um und werden bei Bedarf über das bereits vorhandene
`overflow-y: auto` auf `#tank-select-screen` gescrollt (kein zusätzlicher
Pfeil-Scroller nötig).

### M270 MLRS – reines Raketenwerfer-Fahrzeug (Nutzer-Feedback)

Sechster Fahrzeugtyp: **nur** Raketen, keine Kanone/kein MG.
Statt einer Einzelrakete pro Cooldown (wie bei den anderen 5 Fahrzeugen)
feuert er auf Knopfdruck eine **Salve von 5 Raketen** ab. Er hat **3
Ladungen** für je eine Salve; eine verbrauchte Ladung lädt nach 10 Sekunden
automatisch wieder nach (bis maximal 3), ähnlich einem Fähigkeiten-Cooldown
statt einem klassischen Nachladen.

**Voraussetzung – Panzer-Rebuild statt nur Umfärben:** Bisher baute
`buildTankMesh()` das Spieler-Mesh nur **einmal** beim Laden (für
Königstiger); `applyTankType()` beim Auswählen eines anderen Panzers hat nur
Farben/HP/Tempo umgestellt, nie die tatsächliche Geometrie (Laufwerk-Stil,
Turm-Form, Mündungsbremse blieben immer die des Königstigers). Für den MLRS
mit sichtbar anderem Waffenmodul (Raketen-Pod statt Kanone) reichte reines
Umfärben nicht mehr aus. Neue Funktion `rebuildPlayerTank(cfg)` entfernt das
alte Tank-Mesh aus der Szene, ruft `buildTankMesh(cfg)` neu auf und
aktualisiert alle modulweiten Referenzen (`tank`, `body`, `turret`,
`turretBox`, `gunPivot`, `cannon`, `rocketMuzzle` – dafür von `const` auf
`let` umgestellt). `selectTank()` ruft jetzt `rebuildPlayerTank(cfg)` vor
`applyTankType(cfg)` auf. Nebeneffekt: Abrams/T-90/Leclerc zeigen dadurch
jetzt auch wirklich ihre eigenen Laufwerk-/Turm-/Mündungsbremse-Stile aus
`TANK_TYPES` statt (unbemerkt) der Königstiger-Geometrie.

**Waffenmodul:** `buildTankMesh()` prüft `cfg.weaponLoadout === 'mlrs'`. Die
Kanonen-Mesh bleibt immer vorhanden (dient überall als Richtungs-/
Positions-Referenz für Schuss- und Zielfernrohr-Berechnungen über
`cannon.matrixWorld`), wird aber unsichtbar geschaltet. Sichtbar ist
stattdessen `addRocketPod()`: ein Rahmen mit einem 3×2-Bündel kurzer
Abschussrohre, am selben `gunPivot` befestigt wie die Kanone bei anderen
Panzern – neigt sich also genauso mit dem Höhenwinkel (-5°..+20°).

**Waffen-Freischaltung:** Neue globale `currentWeaponLoadout`, gesetzt in
`applyTankType()` (Werte siehe Puma-Abschnitt unten: mittlerweile
`'standard'` | `'mlrs'` | `'autocannon'`, ursprünglich beim MLRS nur die
ersten beiden). `tryFireCannon()` und `tryFireRocket()` brechen sofort ab,
wenn `currentWeaponLoadout !== 'standard'` (Kanone/Rakete existieren nur
bei Standard-Panzern). Der MG-Auto-Feuer-Block in `animate()` bricht dagegen
NICHT einfach ab, sondern verzweigt inzwischen dreiseitig zwischen `fireMG()`
und `fireAutocannon()` – Details dazu im Puma-Abschnitt unten, der den
aktuellen, generischen `hasCannon`/`hasRocket`/`hasMgSlot`-Ansatz beschreibt.

**Salven-/Ladungslogik** (`tryFireRocketSalvo()`, Nachlade-Tick in
`animate()`): `rocketCharges` (0–3) und `rocketSalvoFiring` steuern, ob
gefeuert werden darf; eine Salve feuert `fireRocket()` 5× mit 150ms Abstand
(`setTimeout`) und blockiert für die Dauer der Salve + Puffer weitere
Anfragen. Ein Timer (`rocketChargeTimer`, in `animate()` per `dt`
hochgezählt) füllt bei < 3 Ladungen alle 10000ms eine Ladung nach.
`tryFireRocket()` verzweigt anhand von `currentWeaponLoadout` zwischen dieser
Salven-Logik und der unveränderten Einzelraketen-Logik der anderen 5
Fahrzeuge.

Schaden/Explosionsradius pro Einzelrakete sind identisch zur bestehenden
Rakete (70 Schaden, Radius 8) – die Salve von 5 ist der Unterschied, nicht
die Werte pro Rakete.

**Rohr-Wechsel pro Salve (Nutzer-Feedback):** Der Raketen-Pod hat 3 Spalten
Abschussrohre (links/mitte/rechts, siehe `addRocketPod()`). `buildTankMesh()`
legt beim MLRS statt eines einzelnen Mündungspunkts drei an
(`rocketMuzzles: [links, mitte, rechts]`, exakt über den drei Rohr-Spalten
via geteilter Konstanten `ROCKET_POD_TUBE_SPACING_X`/`_MUZZLE_Z`/`_MUZZLE_Y`).
`tryFireRocketSalvo()` führt einen Zähler `rocketPodTubeIndex` (0/1/2), der
nach jeder Salve um 1 weiterzählt (mit Wrap `% 3`) – Salve 1 kommt komplett
aus dem linken Rohr, Salve 2 aus der Mitte, Salve 3 rechts, danach wieder
von vorn, für immer. `fireRocket()` akzeptiert dafür jetzt einen optionalen
`muzzleOverride`-Parameter statt hart auf die globale `rocketMuzzle`-Variable
zuzugreifen; ohne Override (Einzelraketen-Panzer) bleibt das Verhalten
unverändert.

### Puma – reines Maschinenkanonen-Fahrzeug (Nutzer-Feedback)

Siebter Fahrzeugtyp, nach demselben Muster wie der MLRS: **nur** eine Waffe,
diesmal eine Maschinenkanone mit **2 Schaden pro Treffer bei 3 Schuss/Sekunde**
(`AUTOCANNON_COOLDOWN = 333`ms). Kein Kanone, kein Rakete – nur die
Maschinenkanone, ausgelöst per Dauerfeuer wie das bestehende MG (Taste/Knopf
halten), nicht als einzelner Feuerstoß.

Statt eines eigenen vierten Waffen-Buttons wird das **bestehende MG-Bedien-
element wiederverwendet** (`btnMG`, Taste `F`, `weapon-slot-mg`) – neues
Label "MK" statt "MG" (`applyTankType()` schreibt Button-Text und
`.weapon-slot-label` abhängig vom Loadout um). `animate()`s Feuer-Block
verzweigt anhand von `currentWeaponLoadout` zwischen `fireMG()`
(`'standard'`, 150ms/2 Schaden) und der neuen `fireAutocannon()`
(`'autocannon'`, 333ms/2 Schaden, größeres orangenes statt gelbes Geschoss).
Kanone- und Raketen-Button/-Slots werden wie beim MLRS ausgeblendet.

Visuell bekommt der Puma über `addAutocannonBarrels()` ein kompaktes
Doppelrohr (zwei dünne parallele Rohre + Gehäuse) am `gunPivot` statt Kanone
oder Raketen-Pod – neigt sich ebenfalls mit dem Höhenwinkel.

`currentWeaponLoadout` kennt jetzt drei Werte: `'standard'`, `'mlrs'`,
`'autocannon'`. Alle Button-/Slot-Sichtbarkeits-Checks in `applyTankType()`
wurden entsprechend auf `hasCannon`/`hasRocket`/`hasMgSlot`-Flags umgestellt,
statt einzeln pro Loadout zu verzweigen.

**Bugfix Scrollen auf Mobile (Nutzer-Feedback):** Mit 5 Karten überragt
`#tank-select-screen` auf vielen Bildschirmen die Höhe – Scrollen ist also
nötig. Die globalen Touch-Handler für die Fahr-Joysticks (`document`-Listener
für `touchstart`/`touchmove`) riefen aber unbedingt `preventDefault()` auf
und kaperten jeden Touch außerhalb eines Buttons als Joystick-Eingabe, auch
während Start-/Panzerauswahl-Bildschirm sichtbar waren. Fix:
`isBlockingOverlayVisible()` lässt beide Handler früh zurückkehren, solange
`#tank-select-screen` oder `#start-screen` sichtbar ist; zusätzlich bekommt
`#tank-select-screen` `touch-action: pan-y`, da der globale `body`-Style
(`touch-action: none`, fürs Spiel-Canvas) sonst auch natives Scrollen
verhindert.

**Bugfix "Puma nicht auswählbar" (Nutzer-Feedback):** Mit 7 Karten ist Puma
die letzte, allein in ihrer Zeile – ihr Auswählen-Button lag direkt am
unteren Rand von `#tank-select-screen` (nur 16px Padding). Auf echten
Mobilgeräten überdeckt die Browser-/OS-Leiste (Adressleiste, Home-Indicator)
oft genau diesen Streifen, obwohl das Element laut DOM/CSS "sichtbar" ist –
der Button liess sich dadurch nicht antippen. In dieser Umgebung liess sich
das mit synthetischen Klicks/Touches nicht reproduzieren (keine echte
Browser-Chrome vorhanden), daher lässt sich die genaue Fehlerursache nicht
zu 100 % beweisen; die Diagnose passt aber zum gemeldeten Symptom. Fix:
`padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px))` auf
`#tank-select-screen`, damit auch die letzte Karte deutlich oberhalb jeder
möglichen Browser-Leiste landet.

| Hook | Typ | Beschreibung |
|------|-----|--------------|
| `__testGunPitch` | number | Aktueller Höhenwinkel `gunPivot.rotation.x` in Radiant |
| `__testTerrainHeight` | function(x, z) → number | Bodenhöhe an Weltkoordinate (x, z) |
| `__testBridgeXs` | number[] | X-Positionen der Brücken (= X-Positionen der Nord-Süd-Straßen) |
| `__testTankRotation` | {x,y,z} | Aktuelle Panzer-Rotation (Pitch/Gier/Roll) in Radiant |
| `__testWeaponLoadout` | 'standard' \| 'mlrs' \| 'autocannon' | Waffen-Ausstattung des gewählten Fahrzeugs |
| `__testRocketCharges` | number | Verbleibende Salven-Ladungen des MLRS (0–3) |
| `__testRocketSalvoFiring` | boolean | Ob gerade eine 5er-Salve läuft (Feuersperre) |
| `__testRocketPodTubeIndex` | number | Index (0/1/2) des Rohrs, aus dem die NÄCHSTE Salve kommt |
| `__testRocketMuzzleLocalXs` | number[] \| null | Lokale X-Positionen der 3 Rohr-Mündungen (nur MLRS, sonst null) |

### Bugfix Panzerketten (Nutzer-Feedback)

Die alte Seitenverkleidung war eine einzelne blickdichte Box, die nur von
y=0.45 bis 1.25 reichte – die untere Hälfte der Laufrollen (der Teil, der
den Bodenkontakt der Kette zeigen sollte) war unbedeckt, und die Räder
wirkten dadurch wie frei stehende Räder statt wie eine Kette. Fix:
`addTrackBands()` fügt stattdessen ein dünnes Band **oben** (Rücklauf der
Kette über den Laufrollen) und **unten** (Bodenkontakt, direkt am Boden)
hinzu, das die gesamte Laufrollen-Reihe umschließt; die Laufrollen selbst
bleiben dazwischen sichtbar – die klassische Panzerketten-Silhouette. Gilt
für Spieler- (`buildTankMesh`) und Gegner-Panzer (`buildEnemyTank`).

### Bugfix Panzer-Hangneigung (Nutzer-Feedback)

Panzer folgten mit `position.y` zwar der Geländehöhe, standen aber immer
exakt waagerecht (`rotation.x`/`rotation.z` blieben 0), unabhängig von der
Hangneigung darunter – sichtbar schwebend auf Hügeln. Neue Funktion
`applyTerrainTilt(mesh, yaw, halfLength, halfWidth)` tastet die
Geländehöhe vorne/hinten und links/rechts der Panzer-Grundfläche ab
(`halfLength=3`, `halfWidth=2`, passend zur Wannengröße 4×6) und setzt
Pitch (`rotation.x`) und Roll (`rotation.z`) direkt aus dem Höhenunterschied.

Da Yaw für den Spieler-Panzer bisher über `tank.rotateY()` (inkrementelle
Quaternion-Rotation) inkrementiert wurde, hätte das gleichzeitige Setzen von
Pitch/Roll über `rotation.x`/`rotation.z` zu Drift geführt (Rotationen um
verschiedene Achsen-Referenzsysteme vermischen sich sonst). Der Spieler-Yaw
wird jetzt in einer eigenen Zahl `tankYaw` mitgeführt und jeden Frame
zusammen mit Pitch/Roll über `tank.rotation.set(pitch, tankYaw, roll)`
atomar gesetzt. Gegner-Panzer setzten Yaw ohnehin schon per direkter
Zuweisung (`enemy.mesh.rotation.y = …`), dort war keine Umstellung nötig.

Gilt für Spieler- und Gegner-Panzer (nicht für Wracks/Trümmer).

### Bekannte Einschränkungen / Offene Punkte

- Haus-Zufahrtsstraßen folgen dem Gelände nur an den Endpunkten (siehe oben)
- Gegner-Panzer neigen ihre Kanone nicht (kein `gunPivot`) – nur relevant für
  die visuelle Kanonenausrichtung, die Ziel-Trefferlogik der Gegner-KI war
  davon nicht betroffen
- Die 5 Standard-Panzer (Königstiger/Leopard/Abrams/T-90/Leclerc) teilen
  weiterhin identische Kanone/MG/Rakete-Werte (siehe "Was Phase 6 noch NICHT
  enthält"); MLRS und Puma haben je eine eigene Spezialwaffe mit eigenen Werten

---

## Starte so
Führe diesen Prompt in Claude Code aus:

> „Lies die Datei `phase6-spezifikation.md` und erweitere das bestehende Panzerspiel exakt gemäss der Spezifikation. Ändere nichts an den funktionierenden Teilen aus Phase 1–5. Starte danach den lokalen Webserver, damit ich es testen kann."
