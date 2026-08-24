# PC-Finder – Computerwissen mit Chris

Ein geführter Fragebogen, der aus 6 Fragen ein Anforderungsprofil ableitet und
die passendsten Laptops/PCs empfiehlt – inklusive persönlicher Begründung und
Affiliate-Link.

## Status

- Fragebogen-Flow: fertig (`components/PcFinder.tsx`)
- Scoring-Logik: regelbasiert, fertig (`lib/scoring.ts`)
- Feed-Anbindung notebooksbilliger.de (Awin): fertig (`scripts/fetch-feed.mjs`
  + `scripts/mapping.mjs`), muss einmal lokal/per Action ausgeführt werden
- Ohne echten Feed laufen Platzhalter-Produkte (`lib/products.ts`) – die App
  ist damit sofort startklar, auch ohne API-Zugriff
- MediaMarkt/Tradedoubler: noch offen, siehe Abschnitt 5

## 1. Lokal starten

```bash
npm install
npm run dev
```

Danach unter `http://localhost:3000` öffnen. Ohne Feed siehst du oben einen
Hinweis, dass Platzhalterdaten angezeigt werden.

## 2. Echten notebooksbilliger.de-Feed laden

Das kann NICHT aus einer Sandbox/Cloud-Umgebung ohne freien Internetzugriff
laufen – dafür brauchst du deinen eigenen Rechner oder eine GitHub Action
(siehe Abschnitt 4).

1. `.env.example` zu `.env.local` kopieren.
2. Deine Awin-Feed-URL (aus dem Awin-Dashboard unter Tools → Datenfeeds →
   notebooksbilliger.de) als Wert von `AWIN_FEED_URL` eintragen.
   **Wichtig:** `.env.local` niemals committen (ist bereits in `.gitignore`) –
   die URL enthält deinen persönlichen API-Key.
3. Ausführen:

   ```bash
   npm run fetch-feed
   ```

4. Das Ergebnis landet in `data/products.generated.json`. Beim nächsten
   `npm run dev` / `npm run build` wird automatisch diese Datei statt der
   Platzhalter verwendet.

Der Feed liefert nur Rohdaten (Titel, Preis, Bild, Tracking-Link) – keine
strukturierten Spezifikationen. `scripts/mapping.mjs` leitet CPU-Klasse,
GPU-Vorhandensein, RAM, Speicher, Mobilität, Lebensdauer und Use-Cases per
Text-Heuristik aus Produktname/-beschreibung ab. Das ist ein erster
Automatisierungs-Wurf – wirf nach dem ersten Import einen Blick in
`data/products.generated.json`, ob die Zuordnungen plausibel aussehen, bevor
das Tool öffentlich verlinkt wird. Die Heuristiken lassen sich in
`scripts/mapping.mjs` gezielt nachschärfen.

## 3. Bei GitHub veröffentlichen

```bash
git init
git add .
git commit -m "Initial PC-Finder MVP"
git branch -M main
git remote add origin <URL deines leeren GitHub-Repos>
git push -u origin main
```

`data/products.generated.json` kann mit committet werden (dann ist die Seite
auch ohne Action sofort mit echten Daten live) – wird aber ohnehin durch die
tägliche GitHub Action überschrieben, siehe Abschnitt 4.

## 4. Automatische tägliche Aktualisierung (GitHub Action)

Die Datei `.github/workflows/update-feed.yml` ist bereits enthalten und läuft
täglich um 05:00 UTC, lädt den Feed neu und committet Änderungen automatisch
(was wiederum ein neues Vercel-Deployment auslöst).

Dafür einmalig in deinem GitHub-Repo unter **Settings → Secrets and
variables → Actions → New repository secret** ein Secret namens
`AWIN_FEED_URL` mit deiner Feed-URL anlegen. Manuell testen lässt sich der
Workflow über den Tab "Actions" → "Produktfeed aktualisieren" → "Run workflow".

## 5. Bei Vercel deployen

1. Auf vercel.com mit dem GitHub-Account einloggen (falls noch nicht geschehen).
2. "Add New Project" → das Repo auswählen.
3. Framework-Preset "Next.js" wird automatisch erkannt → "Deploy".
4. Nach ein paar Minuten ist das Tool unter einer `*.vercel.app`-URL live.
   Diese URL kannst du später per iframe in deine Wix-Seite einbetten, z. B.:

   ```html
   <iframe src="https://dein-projekt.vercel.app" width="100%" height="900" style="border:0;"></iframe>
   ```

Falls du `data/products.generated.json` nicht mit committen willst, kannst du
stattdessen `AWIN_FEED_URL` auch als Vercel-Umgebungsvariable hinterlegen und
den Fetch als zusätzlichen Build-Step einrichten (`"build": "node
scripts/fetch-feed.mjs && next build"` in `package.json`) – dann zieht sich
Vercel bei jedem Deployment automatisch aktuelle Daten.

## 6. MediaMarkt/Tradedoubler ergänzen (später)

Sobald die Freigabe bei Tradedoubler für das MediaMarkt-Partnerprogramm
vorliegt, wird eine zweite Produktquelle nach demselben Muster eingebunden
(eigenes Fetch-/Mapping-Script, gleiche interne Datenstruktur in
`lib/products.ts`, damit die Scoring-Logik unverändert über beide Quellen
hinweg funktioniert).

## 7. Mögliche nächste Ausbaustufen

- KI-gestützte Freitext-Eingabe ("Beschreib einfach, wofür du den PC
  brauchst") als Alternative zum Fragebogen, die intern in `Answers` übersetzt
  wird
- KI-generierte, noch individuellere Begründungstexte statt der aktuellen
  Regel-Textbausteine in `lib/scoring.ts`
- Manuelle Review-/Korrektur-Möglichkeit für einzelne Produkte, deren
  Heuristik-Mapping falsch liegt (z. B. eine kleine `data/overrides.json`)
- Speichern von Ergebnissen (z. B. per E-Mail-Versand "Deine Empfehlung")
- Tracking, welche Empfehlungen tatsächlich zu Klicks führen, um die
  Scoring-Gewichte zu verfeinern
