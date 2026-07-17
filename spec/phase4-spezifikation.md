# 🎮 Panzerspiel – Phase 4 Spezifikation für Claude Code

## Ziel
Die Welt wird **zerstörbar** und richtig **wuchtig**:
Häuser gehen kaputt, zerstörte Panzer explodieren und hinterlassen Wracks –
und das alles soll mit **realistischen Sounds** für Schüsse und Explosionen klingen.

> Aufbauend auf Phase 1–3 (Welt, Panzer, Schiessen, Gegner-KI). Nichts davon kaputt machen.

---

## Teil 1: 🏠 Häuser zerstören

Bis jetzt kann man durch Häuser durchfahren. Jetzt sollen sie **kaputtgehen**.

- Jedes Haus bekommt eigene **HP** (z. B. 100).
- Schaden entsteht durch:
  - **Granaten-Treffer** (grosser Schaden)
  - **Hindurchfahren** mit dem Panzer (kleiner, langsamer Schaden)
- Wenn HP = 0 → Haus **bricht zusammen**:
  - Haus zerfällt in ein paar grosse Trümmer-Klötze
  - Trümmer fallen kurz nach unten und bleiben dann als **Schutthaufen** liegen
  - Kleine Staubwolke beim Einsturz

**Technik-Hinweis:** Kein echtes Physik-Plugin nötig. Es reicht, das Haus durch 3–6 kleinere Würfel zu ersetzen, die kurz nach unten fallen (einfache Schwerkraft: `y -= speed` pro Frame, bis Boden erreicht).

---

## Teil 2: 💥 Panzer-Zerstörung (Explosion + Wrack)

Wenn ein Panzer (Gegner **oder** Spieler) bei HP = 0 stirbt:

### Explosion
- Grosser **Feuerball** (orange/gelbe Kugel, die schnell wächst und verblasst)
- **Rauchwolke** (graue Partikel, steigen nach oben)
- Ein paar **Funken/Splitter**, die wegfliegen
- Dauer: ca. 1–1,5 Sekunden

### Wrack bleibt liegen
- Der Panzer wird zu einem **schwarzen, verkohlten Wrack**
- Turm sitzt schief / leicht verschoben
- Wrack bleibt **dauerhaft** auf der Karte liegen (verschwindet nicht)
- Man kann **nicht hindurchfahren** (bleibt ein Hindernis)

**Technik-Hinweis:** Für die Explosion reichen Three.js-Partikel (`Points`) oder ein paar kleine Kugeln, die grösser/durchsichtiger werden. Für das Wrack einfach das Panzer-Material auf dunkelgrau/schwarz umfärben.

---

## Teil 3: 🔊 Sounds realistischer machen

Bis jetzt klingen Schüsse und Explosionen einfach. Das soll besser werden.

### Echte Sound-Dateien verwenden
Statt künstlich erzeugter Töne nehmen wir **echte aufgenommene Sounds** (z. B. von [freesound.org](https://freesound.org), kostenlos, auf Lizenz achten).

Ordner anlegen:
```
panzerspiel/
└── sounds/
    ├── shot.mp3          ← Kanonenschuss
    ├── explosion.mp3     ← grosse Explosion
    ├── ricochet.mp3      ← Abpraller (Metall)
    └── mg.mp3            ← Maschinengewehr
```

### Tricks für mehr Realismus
- **Mehrere Schichten:** Eine Explosion klingt am besten aus einem tiefen "Bumm" + einem hellen "Krach" zusammen.
- **Leichte Tonhöhen-Variation:** Bei jedem Schuss `playbackRate` minimal zufällig ändern (z. B. 0.95–1.05), damit nicht jeder Schuss exakt gleich klingt.
- **Lautstärke nach Entfernung:** Explosionen weit weg → leiser. Nah → lauter.
- Three.js bietet dafür **`PositionalAudio`** – der Sound wird automatisch leiser, je weiter er weg ist. Das macht es viel echter.

| Ereignis | Sound | Besonderheit |
|---|---|---|
| Kanonenschuss | `shot.mp3` | tiefer Knall, leichte Tonhöhen-Variation |
| Maschinengewehr | `mg.mp3` | schnell hintereinander |
| Explosion | `explosion.mp3` | laut, Lautstärke je nach Entfernung |
| Abpraller | `ricochet.mp3` | heller Metall-Klang |

---

## ✅ Qualitätskriterien

- [ ] Häuser bekommen Schaden und brechen bei HP = 0 zusammen
- [ ] Trümmer bleiben als Schutthaufen liegen
- [ ] Zerstörte Panzer zeigen eine grosse Explosion (Feuer + Rauch)
- [ ] Wracks bleiben dauerhaft liegen und sind ein Hindernis
- [ ] Schuss- und Explosions-Sounds klingen mit echten Dateien deutlich realistischer
- [ ] Sounds werden je nach Entfernung leiser/lauter (`PositionalAudio`)
- [ ] Kein Ruckeln, auch wenn mehrere Explosionen gleichzeitig passieren
- [ ] Keine Fehler in der Browser-Konsole (F12)

---

## ⚠️ Was Phase 4 noch NICHT enthält
(kommt erst in **Phase 5 – Feinschliff**)

- Panzerauswahl-Menü (Königstiger / Leopard 2 A8)
- Zielfernrohr zum Zoomen
- Letzte Politur an Steuerung und Optik

---

## Starte so
Führe diesen Prompt in Claude Code aus:

> „Lies die Datei `phase4-spezifikation.md` und erweitere das bestehende Panzerspiel exakt gemäss der Spezifikation. Ändere nichts an den funktionierenden Teilen aus Phase 1–3. Starte danach den lokalen Webserver, damit ich es testen kann."
