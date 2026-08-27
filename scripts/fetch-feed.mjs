// Lädt den (ggf. kombinierten) Awin-Produktfeed – aktuell notebooksbilliger.de,
// Otto und Cyberport in einem einzigen, über Awins "Create a Datafeed"-Tool
// gebündelten Feed – parst ihn und schreibt eine gemappte JSON-Datei nach
// data/products.generated.json.
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
import { dedupeByName, groupByNormalizedName } from "./dedupe.mjs";

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
  const withUniqueIds = Array.from(byId.values());

  // WICHTIG für die Log-Interpretation: "Produkte erfolgreich gemappt"
  // weiter unten bezieht sich auf die Zahl NACH der Namens-Deduplizierung
  // (also die tatsächliche Katalogzahl, die im Frontend ankommt). Damit
  // klar bleibt, wie viel davon rein durchs Mapping vs. durch die Dedup
  // kam, loggen wir die Zwischenzahl hier separat.
  console.log(`${withUniqueIds.length} Zeilen nach Mapping/Ausschluss (vor Namens-Dedup).`);

  // Zusätzliche Deduplizierung über den Produktnamen: Dasselbe Gerät taucht
  // im Feed teils mehrfach mit unterschiedlicher aw_product_id/
  // merchant_product_id auf (unterschiedlicher Tracking-Link, aber
  // identische Konfiguration) – das ist über die reine ID-Dedup oben nicht
  // erkennbar. Siehe scripts/dedupe.mjs für die Erkennung im Detail.
  const products = dedupeByName(withUniqueIds);
  const duplicatesRemoved = withUniqueIds.length - products.length;

  console.log(`${products.length} Produkte erfolgreich gemappt (nach Namens-Dedup).`);
  if (duplicatesRemoved > 0) {
    console.log(
      `${duplicatesRemoved} doppelte Angebote für dasselbe Gerät (gleicher Produktname) entfernt, jeweils das günstigste Angebot behalten.`
    );
  }

  // Plausibilitäts-Check: ein echtes Duplikat-Cluster sollte klein sein
  // (im Regelfall 2-3 Angebote desselben Geräts). Eine ungewöhnlich große
  // Gruppe deutet eher auf ein zu generisches/leeres Namens-Match hin als
  // auf echte Duplikate – das würde sonst versehentlich viele
  // unterschiedliche Geräte auf ein einziges zusammenschrumpfen. Wir loggen
  // die größten Gruppen, damit sowas beim nächsten Deploy sofort aus den
  // Build-Logs auffällt, statt erst als "fehlendes Produkt" gemeldet zu
  // werden.
  const groups = groupByNormalizedName(withUniqueIds);
  const largestGroups = Array.from(groups.values())
    .filter((group) => group.length > 3)
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);
  if (largestGroups.length > 0) {
    console.log(
      "Achtung, ungewöhnlich große Duplikat-Gruppen gefunden (bitte Namens-Erkennung prüfen): " +
        largestGroups
          .map((group) => `"${group[0].name}" (${group.length}x)`)
          .join(", ")
    );
  }

  // Aufschlüsselung nach Händler loggen – nützlich, um nach einem Deploy
  // direkt in den Build-Logs zu sehen, ob z.B. Otto/Cyberport-Produkte
  // tatsächlich mit im kombinierten Feed ankommen, statt nur die
  // Gesamtzahl zu prüfen.
  const byShop = new Map();
  for (const p of products) {
    byShop.set(p.shop, (byShop.get(p.shop) || 0) + 1);
  }
  console.log(
    "Aufschlüsselung nach Händler: " +
      Array.from(byShop.entries())
        .map(([shop, n]) => `${shop}: ${n}`)
        .join(", ")
  );

  const output = {
    generatedAt: new Date().toISOString(),
    source: "awin-multi-shop",
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
  // Absichtlich NICHT process.exit(1): falls der Feed mal kurz nicht
  // erreichbar ist, soll der Build trotzdem mit den zuletzt bekannten
  // bzw. Platzhalter-Daten durchlaufen, statt die ganze Seite offline zu nehmen.
  console.error("Baue trotzdem mit vorhandenen/Platzhalter-Daten weiter.");
});
