// Kleiner Regressionstest für die Deduplizierung doppelter Angebote
// (siehe scripts/dedupe.mjs).
//
// Aufruf: node scripts/test-dedupe.mjs

import { normalizeProductName, dedupeByName } from "./dedupe.mjs";

const products = [
  {
    id: "11348-3001",
    name: 'Lenovo LOQ 15AHP10 15.6" FHD R7-250 16GB/1TB SSD RTX 5060 Win11',
    price: 999
  },
  {
    id: "11348-3002",
    // Exakt derselbe Titel, aber andere ID/anderer Preis – wie vom Nutzer
    // gemeldet: gleiches Gerät, unterschiedlicher Tracking-Link.
    name: 'Lenovo LOQ 15AHP10 15.6" FHD R7-250 16GB/1TB SSD RTX 5060 Win11',
    price: 979
  },
  {
    id: "11657-4001",
    name: "ASUS Vivobook 15 OLED Intel Core i5, 16GB RAM, 512GB SSD",
    price: 699
  }
];

const deduped = dedupeByName(products);

const assertions = [
  [
    normalizeProductName("  Lenovo LOQ 15AHP10  15.6\" FHD ") ===
      normalizeProductName("lenovo loq 15ahp10 15.6 fhd"),
    "normalizeProductName sollte Groß-/Kleinschreibung, Sonderzeichen und Leerzeichen ignorieren"
  ],
  [deduped.length === 2, "Aus 3 Angeboten sollten nach Dedup 2 Geräte übrig bleiben"],
  [
    deduped.some((p) => p.id === "11348-3002" && p.price === 979),
    "Von den beiden LOQ-Duplikaten sollte das günstigere (979 €) behalten werden"
  ],
  [
    !deduped.some((p) => p.id === "11348-3001"),
    "Das teurere LOQ-Duplikat (999 €) sollte entfernt worden sein"
  ],
  [
    deduped.some((p) => p.id === "11657-4001"),
    "Das eindeutige ASUS-Angebot sollte unverändert erhalten bleiben"
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
