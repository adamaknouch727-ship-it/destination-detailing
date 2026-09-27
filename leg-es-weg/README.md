# Leg es weg.

Das 30-Tage-System gegen Handysucht und nächtliches Scrollen – PDF für Gumroad (Deutsch).

## Chno kayn hna

| Fichier | Chno howa |
|---|---|
| `output/Leg-es-weg.pdf` | LPDF l2asasi: 27 page, A4, b l'alemaniya |
| `output/bonus/Sperrbildschirm-1…5.png` | 5 wallpapers dyal lock screen (bonus m3a lPDF) |
| `src/guide.html` + `src/guide.css` | Lcontenu w design dyal lPDF |
| `src/wallpapers.html` | Design dyal les wallpapers |
| `scripts/` | Scripts li kaysaybo lPDF w les images |

## Lmanhaj (mn fichier "50 Digital Product Ideas")

- **Big market:** Handysucht / Bildschirmzeit f lalman
- **Specific audience:** nass li kay-scrolliw f lil w ma kay9edrouch y7ebsou
- **Purchase trigger:** l'rapport dyal Bildschirmzeit kol simana, w 1 dyal lil f srir
- **Machi ebook:** system dyal 30 youm b 3 modes (7 / 14 / 30), réglages dyal telephone, missions dyal kol nhar, tracker, cartes, contrat, w 5 wallpapers bonus
- **Halal:** bla music, bla tsawer dyal bnadem wla l7ayawanat, w bla ay 7aja katkhalef ddin

## F Gumroad

Tele3 **2 dyal les fichiers**: `Leg-es-weg.pdf` + ZIP fih les 5 wallpapers (`output/bonus/`).

## Bach t3awd tsayb lPDF (ila beddelti chi 7aja)

```bash
node scripts/build-bonus.mjs      # les wallpapers
node scripts/build-pdf.mjs        # lPDF  (--preview kaysayb tsawer dyal kol page f output/preview/)
```

Khass Node w Playwright (Chromium).

## Sources li f lPDF

- Bitkom (2026): smartphone 180 d9i9a f nhar, 216 d9i9a 3nd 16–29 3am
- DAK-Mediensuchtstudie (2026): 1 mn 4 dyal drari 10–17 3am kaysta3mlou social media b tari9a khatira
- Castelo et al., PNAS Nexus (2025): 2 simanat bla mobile internet → 91 % t7essnou f 7aja wa7da 3al a9al
- Gollwitzer & Sheeran (2006): Wenn-dann-Pläne (implementation intentions)
