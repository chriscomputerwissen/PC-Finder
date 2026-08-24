// Kleiner Regressionstest ohne externe Test-Runner-Abhängigkeit:
// prüft, dass CSV-Parsing + Mapping auf einem Beispiel im echten
// Awin-Spaltenformat plausible Ergebnisse liefert.
//
// Aufruf: node scripts/test-mapping.mjs

import { readFileSync } from "node:fs";
import { parseCSV, rowsToObjects } from "./csv.mjs";
import { mapFeedRow } from "./mapping.mjs";

const csvText = readFileSync(
  new URL("./__fixtures__/sample-feed.csv", import.meta.url),
  "utf-8"
);

const rows = parseCSV(csvText);
const objects = rowsToObjects(rows);
const products = objects.map(mapFeedRow).filter(Boolean);

console.log(`${objects.length} Testzeilen, ${products.length} gemappte Produkte:\n`);
console.log(JSON.stringify(products, null, 2));

const assertions = [
  [products.length === 4, "Es sollten 4 Produkte gemappt werden"],
  [products[0].deviceType === "laptop", "Zeile 1 sollte ein Laptop sein"],
  [products[0].cpuClass === "mittel", "i5 sollte als 'mittel' erkannt werden"],
  [products[0].ramGB === 16, "16GB RAM sollte erkannt werden"],
  [products[1].hasGPU === true, "RTX 4060 sollte hasGPU=true ergeben"],
  [products[1].useCases.includes("gaming"), "Gaming-Notebook sollte useCase 'gaming' bekommen"],
  [products[2].deviceType === "desktop", "Buero Desktop-PC sollte als 'desktop' erkannt werden"],
  [products[2].cpuClass === "einsteiger", "i3 sollte als 'einsteiger' erkannt werden"],
  [products[3].cpuClass === "mittel", "Apple M3 (Basis) sollte als 'mittel' erkannt werden"],
  [products[3].mobility === 5, "13 Zoll MacBook sollte hohe Mobilitaet (5) bekommen"],
  [products.every((p) => p.affiliateUrl.startsWith("https://www.awin1.com")), "affiliateUrl sollte der Awin-Tracking-Link sein"]
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
