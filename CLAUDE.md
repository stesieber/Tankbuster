# Tankbuster – Claude Code Hinweise

## Vor dem Abschluss der Arbeit: Smoke-Tests ausführen

**Immer** vor dem finalen Commit und Push die lokalen Playwright-Tests laufen lassen:

```bash
cd /home/user/Tankbuster
npm test
```

Tests prüfen:
- Keine JS-Fehler beim Laden
- Three.js (`THREE`) ist global verfügbar
- Canvas rendert etwas (kein schwarzer Bildschirm)
- HUD-Elemente sichtbar (HP, Joysticks, Schiess-Button)
- Preview-Banner lokal ausgeblendet
- Tank reagiert auf Tastatur (W)

Ein Screenshot wird gespeichert unter `tests/screenshot.png` – bei Fehlern dort nachschauen.

Falls Tests rot sind: Bug fixen, dann erneut testen – erst dann pushen.

---

## Nach Abschluss der Arbeit: GitHub Pages Links ausgeben

Nach jedem abgeschlossenen Task immer die relevanten GitHub Pages Links ausgeben:

- **Production** (Branch `main`): https://stesieber.github.io/Tankbuster/
- **Preview** (aktueller Feature-Branch): `https://stesieber.github.io/Tankbuster/preview/<branch-slug>/`

Den Branch-Slug aus dem aktuellen Branch-Namen ableiten: `/` durch `-` ersetzen, alles lowercase.
