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

  // Diagnose: EAN/MPN-Füllgrad prüfen (Cross-Shop-Preisvergleich, Nutzerwunsch
  // 01.09.2026). Der Namens-basierte Preisvergleich (dedupeByName) fand in
  // einem ersten Testlauf 0 Treffer zwischen den Shops, weil notebooksbilliger.de
  // und Cyberport dieselben Geräte unterschiedlich betiteln (z.B. unterschiedliche
  // Kurz-/Langform, unterschiedliche Reihenfolge der Specs im Titel). EAN/MPN
  // wären ein shop-unabhängiger Schlüssel, laut Projekt-Doku aber "nicht
  // durchgängig befüllt" – hier einmalig verifizieren, WIE gut sie gefüllt sind,
  // bevor Aufwand in einen EAN/MPN-basierten Abgleich gesteckt wird.
  if (objects.length > 0) {
    console.log("Verfügbare Spalten im Feed:", Object.keys(objects[0]).join(", "));
    const withEan = objects.filter((o) => (o.ean || "").trim().length > 0).length;
    const withMpn = objects.filter((o) => (o.mpn || "").trim().length > 0).length;
    const withBrandName = objects.filter((o) => (o.brand_name || "").trim().length > 0).length;
    const withModelNumber = objects.filter((o) => (o.model_number || "").trim().length > 0).length;
    const withProductModel = objects.filter((o) => (o.product_model || "").trim().length > 0).length;
    console.log(
      `EAN gefüllt: ${withEan}/${objects.length} (${Math.round((withEan / objects.length) * 100)}%), ` +
        `MPN gefüllt: ${withMpn}/${objects.length} (${Math.round((withMpn / objects.length) * 100)}%), ` +
        `brand_name gefüllt: ${withBrandName}/${objects.length} (${Math.round((withBrandName / objects.length) * 100)}%), ` +
        `model_number gefüllt: ${withModelNumber}/${objects.length} (${Math.round((withModelNumber / objects.length) * 100)}%), ` +
        `product_model gefüllt: ${withProductModel}/${objects.length} (${Math.round((withProductModel / objects.length) * 100)}%)`
    );

    // Stichprobe: pro Shop je 5 Zeilen mit befülltem model_number/product_model
    // zeigen, um zu sehen, ob dieselben Geräte bei beiden Shops überhaupt
    // vergleichbare Werte tragen (z.B. exakt dieselbe Modellnummer) oder ob
    // auch das je Shop unterschiedlich formatiert ist.
    const byShopSample = new Map();
    for (const o of objects) {
      const key = o.merchant_name || "(unbekannt)";
      const modelValue = (o.model_number || o.product_model || "").trim();
      if (!modelValue) continue;
      if (!byShopSample.has(key)) byShopSample.set(key, []);
      const list = byShopSample.get(key);
      if (list.length < 5) list.push({ name: (o.product_name || "").trim(), model: modelValue });
    }
    console.log("Stichprobe model_number/product_model pro Shop:");
    for (const [shop, samples] of byShopSample.entries()) {
      console.log(`  ${shop}:`);
      samples.forEach((s) => console.log(`    "${s.model}" – ${s.name}`));
    }
  }

  // Diagnose: welche Kategorien liefert der Feed überhaupt (vor jedem
  // Mapping/Ausschluss)? Das reine Filtern über Namens-Stichwörter
  // (Zubehör, Tablets, ...) ist ein Fass ohne Boden – jede neue Serie/jeder
  // neue Zubehör-Typ rutscht erstmal durch. Kategorienamen sind der
  // Awin-Feed-Struktur nach viel eindeutiger (z.B. "Notebooks" vs.
  // "PC-Komponenten & Zubehör" vs. "Tablets"), deshalb loggen wir hier die
  // rohe Kategorie-Verteilung, um darauf ggf. eine Positivliste (nur
  // erlaubte Kategorien) statt einer Negativliste (Stichwörter) aufbauen
  // zu können.
  const categoryCounts = new Map();
  for (const o of objects) {
    const cat = (o.category_name || o.merchant_category || "(keine Kategorie)").trim();
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  }
  console.log("Kategorien im Rohfeed (vor Mapping/Ausschluss), absteigend nach Häufigkeit:");
  Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, n]) => console.log(`  ${n}x  ${cat}`));

  // Diagnose: "Computers" und "Laptops" (die einzigen beiden zugelassenen
  // Awin-Kategorien, siehe ALLOWED_CATEGORIES in mapping.mjs) enthalten laut
  // Stichprobe der günstigsten Produkte weiterhin viel Zubehör (Adapter,
  // Kabel, Docks, Stifte, Halterungen, Notebookständer, ...). Der Awin-
  // Feed liefert zusätzlich `merchant_category` (die ROHE, händlereigene
  // Kategorie, nicht die von Awin normalisierte `category_name`) – hier
  // loggen wir deren Verteilung NUR innerhalb von Computers/Laptops, um zu
  // sehen, ob sich darüber eine feinere, zuverlässigere Trennung zwischen
  // echten PCs und Zubehör bauen lässt als über Namens-Stichwörter.
  const merchantCategoryCounts = new Map();
  for (const o of objects) {
    const awinCat = (o.category_name || "").trim().toLowerCase();
    if (awinCat !== "computers" && awinCat !== "laptops") continue;
    const mcat = (o.merchant_category || "(keine Händler-Kategorie)").trim();
    merchantCategoryCounts.set(mcat, (merchantCategoryCounts.get(mcat) || 0) + 1);
  }
  console.log(
    "Händler-eigene Kategorien (merchant_category) INNERHALB von Awin-Kategorie Computers/Laptops, absteigend nach Häufigkeit:"
  );
  Array.from(merchantCategoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, n]) => console.log(`  ${n}x  ${cat}`));

  // Diagnose: die 150 günstigsten ROHEN Zeilen (nicht das Endergebnis)
  // innerhalb von Computers/Laptops, mit merchant_category, damit sich
  // Preis + Händler-Kategorie + Name gemeinsam anschauen lassen, um ein
  // Muster für verbliebenes Zubehör zu finden.
  const allowedRaw = objects.filter((o) => {
    const awinCat = (o.category_name || "").trim().toLowerCase();
    return awinCat === "computers" || awinCat === "laptops";
  });
  const cheapestRaw = [...allowedRaw]
    .map((o) => ({
      price: parseFloat(o.search_price || o.display_price || "0") || 0,
      merchantCategory: (o.merchant_category || "(keine)").trim(),
      name: (o.product_name || "").trim()
    }))
    .filter((o) => o.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, 150);
  console.log(
    `Die ${cheapestRaw.length} günstigsten ROH-Zeilen innerhalb Computers/Laptops (vor jedem weiteren Filter), mit merchant_category:`
  );
  cheapestRaw.forEach((o) => {
    console.log(`  ${o.price.toFixed(2)}€ | ${o.merchantCategory} | ${o.name}`);
  });

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

  // Diagnose: die 200 günstigsten Produkte im FINALEN Katalog loggen.
  // Zubehör/Ersatzteile, die durch die bisherigen Filter rutschen, sind so
  // gut wie immer sehr günstig – das ist die schnellste Art, verbliebenes
  // Zubehör konkret zu sehen (statt blind neue Stichwörter zu raten), ohne
  // den kompletten Katalog aus dem Build exportieren zu müssen.
  const cheapest = [...products].sort((a, b) => a.price - b.price).slice(0, 200);
  console.log(`Die ${cheapest.length} günstigsten Produkte im finalen Katalog (Zubehör-Kontrolle):`);
  cheapest.forEach((p) => {
    console.log(`  ${p.price.toFixed(2)}€ | ${p.shop} | ${p.name}`);
  });

  // Diagnose: Cross-Shop-Preisvergleich (Nutzerwunsch 01.09.2026). Zeigt, bei
  // wie vielen Produkten dedupeByName() ein günstigeres Angebot gegenüber
  // mindestens einem anderen Händler gefunden hat (alternativeOffers ist dann
  // gesetzt) – das ist die Datenbasis für die "Preisvergleich"-Anzeige im
  // Frontend. Plus eine Stichprobe, um die konkreten Preisdifferenzen auf
  // Plausibilität zu prüfen (z.B. keine absurd großen Differenzen, die auf
  // ein zu generisches Namens-Match hindeuten würden).
  const withAlternatives = products.filter(
    (p) => Array.isArray(p.alternativeOffers) && p.alternativeOffers.length > 0
  );
  console.log(
    `${withAlternatives.length} von ${products.length} Produkten sind bei mindestens einem weiteren Händler gelistet (Cross-Shop-Preisvergleich verfügbar).`
  );
  if (withAlternatives.length > 0) {
    console.log("Stichprobe der ersten 20 Preisvergleiche:");
    withAlternatives.slice(0, 20).forEach((p) => {
      const altText = p.alternativeOffers
        .map((a) => `${a.shop}: ${a.price.toFixed(2)}€`)
        .join(", ");
      console.log(`  "${p.name}" – hier ${p.shop}: ${p.price.toFixed(2)}€ | Alternativen: ${altText}`);
    });
  }

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
