// Lädt den Awin-Produktfeed für notebooksbilliger.de, parst ihn und
// schreibt eine gemappte JSON-Datei nach data/products.generated.json.
//
// Aufruf:
//   node --env-file=.env.local scripts/fetch-feed.mjs
//
// Erwartet die Umgebungsvariable AWIN_FEED_URL (siehe .env.example).
// Läuft lokal, in einer GitHub Action oder als Vercel-Build-Step – NICHT
// aus dieser Sandbox heraus (kein Netzwerkzugriff auf productdata.awin.com).

import { gunzipSync } from "node:zlib";
import { writeFile, mkdir } from "node:fs/promises";
import { parseCSV, rowsToObjects } from "./csv.mjs";
import { mapFeedRow } from "./mapping.mjs";

const FEED_URL = process.env.AWIN_FEED_URL;

async function main() {
  if (!FEED_URL) {
    console.error(
      "Fehler: AWIN_FEED_URL ist nicht gesetzt. Lege eine .env.local an " +
        "(siehe .env.example) oder setze das Secret in GitHub/Vercel."
    );
    process.exit(1);
  }

  console.log("Lade Awin-Feed...");
  const res = await fetch(FEED_URL);
  if (!res.ok) {
    console.error(`Feed-Download fehlgeschlagen: HTTP ${res.status}`);
    process.exit(1);
  }

  const compressed = Buffer.from(await res.arrayBuffer());
  const csvText = gunzipSync(compressed).toString("utf-8");

  const rows = parseCSV(csvText);
  const objects = rowsToObjects(rows);
  console.log(`${objects.length} Zeilen im Feed gefunden.`);

  const mapped = objects
    .map(mapFeedRow)
    .filter((p) => p !== null);

  // Duplikate (gleiche id) entfernen, letzten Eintrag gewinnt
  const byId = new Map(mapped.map((p) => [p.id, p]));
  const products = Array.from(byId.values());

  console.log(`${products.length} Produkte erfolgreich gemappt.`);

  const output = {
    generatedAt: new Date().toISOString(),
    source: "awin-notebooksbilliger",
    count: products.length,
    products
  };

  await mkdir(new URL("../data", import.meta.url), { recursive: true });
  await writeFile(
    new URL("../data/products.generated.json", import.meta.url),
    JSON.stringify(output, null, 2)
  );

  console.log("Fertig: data/products.generated.json geschrieben.");
}

main().catch((err) => {
  console.error("Unerwarteter Fehler beim Feed-Import:", err);
  process.exit(1);
});
