// Kleiner Regressionstest für die Deduplizierung doppelter Angebote
// (siehe scripts/dedupe.mjs).
//
// Aufruf: node scripts/test-dedupe.mjs

import { normalizeProductName, dedupeByName } from "./dedupe.mjs";

const products = [
  {
    id: "11348-3001",
    name: 'Lenovo LOQ 15AHP10 15.6" FHD R7-250 16GB/1TB SSD RTX 5060 Win11',
    price: 999,
    shop: "notebooksbilliger.de"
  },
  {
    id: "11348-3002",
    // Exakt derselbe Titel, aber andere ID/anderer Preis – wie vom Nutzer
    // gemeldet: gleiches Gerät, unterschiedlicher Tracking-Link, SELBER Shop.
    name: 'Lenovo LOQ 15AHP10 15.6" FHD R7-250 16GB/1TB SSD RTX 5060 Win11',
    price: 979,
    shop: "notebooksbilliger.de"
  },
  {
    id: "11657-4001",
    name: "ASUS Vivobook 15 OLED Intel Core i5, 16GB RAM, 512GB SSD",
    price: 699,
    shop: "notebooksbilliger.de"
  },
  // Cross-Shop-Preisvergleich (Nutzerwunsch 01.09.2026): dasselbe Gerät bei
  // ZWEI verschiedenen Händlern zu unterschiedlichen Preisen.
  {
    id: "11348-5001",
    name: "MSI Katana 15 15.6\" FHD 144Hz, AMD Ryzen 7, 16GB RAM, 1TB SSD, RTX 4060",
    price: 1399,
    shop: "notebooksbilliger.de"
  },
  {
    id: "11657-5001",
    name: "MSI Katana 15 15.6\" FHD 144Hz, AMD Ryzen 7, 16GB RAM, 1TB SSD, RTX 4060",
    price: 1449,
    shop: "Cyberport"
  }
];

const deduped = dedupeByName(products);

const assertions = [
  [
    normalizeProductName("  Lenovo LOQ 15AHP10  15.6\" FHD ") ===
      normalizeProductName("lenovo loq 15ahp10 15.6 fhd"),
    "normalizeProductName sollte Groß-/Kleinschreibung, Sonderzeichen und Leerzeichen ignorieren"
  ],
  [deduped.length === 3, "Aus 5 Angeboten sollten nach Dedup 3 Geräte übrig bleiben"],
  [
    deduped.some((p) => p.id === "11348-3002" && p.price === 979),
    "Von den beiden LOQ-Duplikaten (selber Shop) sollte das günstigere (979 €) behalten werden"
  ],
  [
    !deduped.some((p) => p.id === "11348-3001"),
    "Das teurere LOQ-Duplikat (999 €) sollte entfernt worden sein"
  ],
  [
    deduped.some((p) => p.id === "11657-4001"),
    "Das eindeutige ASUS-Angebot sollte unverändert erhalten bleiben"
  ],
  [
    !("alternativeOffers" in (deduped.find((p) => p.id === "11348-3002") || {})),
    "Bei einem reinen Selber-Shop-Duplikat sollte KEIN alternativeOffers gesetzt werden (kein anderer Shop im Spiel)"
  ],
  [
    !("alternativeOffers" in (deduped.find((p) => p.id === "11657-4001") || {})),
    "Ein Gerät ohne jedes Duplikat sollte KEIN alternativeOffers gesetzt bekommen"
  ],
  [
    (() => {
      const msi = deduped.find((p) => p.id === "11348-5001");
      return !!msi && msi.price === 1399 && msi.shop === "notebooksbilliger.de";
    })(),
    "Bei der MSI Katana (zwei Shops) sollte das günstigere Angebot (1399 € bei notebooksbilliger.de) behalten werden"
  ],
  [
    (() => {
      const msi = deduped.find((p) => p.id === "11348-5001");
      return (
        !!msi &&
        Array.isArray(msi.alternativeOffers) &&
        msi.alternativeOffers.length === 1 &&
        msi.alternativeOffers[0].shop === "Cyberport" &&
        msi.alternativeOffers[0].price === 1449
      );
    })(),
    "Die MSI Katana sollte alternativeOffers=[{shop:'Cyberport', price:1449}] fürs Preisvergleich-Feature bekommen"
  ]
];

let failed = 0;
for (const [ok, label] of assertions) {
  console.log(`${ok ? "OK  " : "FAIL"} - ${label}`);
  if (!ok) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} Assertion(s) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nAlle Assertions erfolgreich.");
