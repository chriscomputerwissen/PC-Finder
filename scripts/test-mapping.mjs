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
  [products.length === 7, "Es sollten 7 Produkte gemappt werden"],
  [products[0].deviceType === "laptop", "Zeile 1 sollte ein Laptop sein"],
  [products[0].cpuClass === "mittel", "i5 sollte als 'mittel' erkannt werden"],
  [products[0].ramGB === 16, "16GB RAM sollte erkannt werden"],
  [products[0].os === "windows", "Windows 11 im Text sollte os='windows' ergeben"],
  [products[0].shop === "notebooksbilliger.de", "Zeile 1 sollte shop='notebooksbilliger.de' bekommen"],
  [products[1].hasGPU === true, "RTX 4060 sollte hasGPU=true ergeben"],
  [products[1].useCases.includes("gaming"), "Gaming-Notebook sollte useCase 'gaming' bekommen"],
  [products[2].deviceType === "desktop", "Buero Desktop-PC sollte als 'desktop' erkannt werden"],
  [products[2].cpuClass === "einsteiger", "i3 sollte als 'einsteiger' erkannt werden"],
  [products[3].cpuClass === "mittel", "Apple M3 (Basis) sollte als 'mittel' erkannt werden"],
  [products[3].mobility === 5, "13 Zoll MacBook sollte hohe Mobilitaet (5) bekommen"],
  [products[3].os === "macos", "Apple MacBook sollte os='macos' bekommen"],
  [products[4].deviceType === "desktop", "Intel NUC Mini PC sollte als 'desktop' erkannt werden"],
  [products[5].deviceType === "desktop", "Barebone Gaming-PC sollte als 'desktop' erkannt werden"],
  [products[5].os === "ohne", "'ohne Betriebssystem' im Text sollte os='ohne' ergeben"],
  [products[6].shop === "Cyberport", "Zeile 7 (Cyberport-Feed) sollte shop='Cyberport' bekommen"],
  [products[6].brand === "Cyberport", "Ohne erkannte Hersteller-Marke sollte brand auf den Händlernamen zurückfallen"],
  [products[6].id === "11657-2001", "Bei kombiniertem Multi-Händler-Feed sollte die ID mit merchant_id geprefixt werden"],
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
