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
  [
    objects.length === 20,
    "Es sollten 20 Testzeilen im CSV stehen (inkl. Tablet-, Zubehoer-, Monitor-, Chromebook-, Refurbished-, Under-Desk-PC-, DOS- und Grenzfall-Zeilen)"
  ],
  [
    products.length === 11,
    "Es sollten 11 Produkte gemappt werden (Tablets/Zubehoer/Monitore/Refurbished ausgeschlossen, guenstiger Celeron-PC, Chromebook, Under-Desk-PC und DOS-Notebook bleiben drin)"
  ],
  [
    products.every((p) => !/usb-c kabel/i.test(p.name)),
    "Zubehoer mit händlereigener Kategorie 'Zub. Notebooks Win' sollte auch INNERHALB der erlaubten Awin-Kategorie 'Computers' ausgeschlossen werden"
  ],
  [
    products.every((p) => p.name !== "Samsung Odyssey G7 32 Zoll Gaming-Monitor, WQHD, 240Hz"),
    "Monitore (Awin-Kategorie 'Monitors') sollten NICHT im gemappten Katalog auftauchen, auch ohne passendes Namens-Stichwort"
  ],
  [
    products.every((p) => !/xbox game pass/i.test(p.name)),
    "Zubehoer/Gutscheine/Digitalcodes aus der Awin-Kategorie 'Hardware' sollten NICHT im gemappten Katalog auftauchen"
  ],
  [
    !products.some((p) => /fire hd|tablet|iconia|idea ?tab/i.test(p.name)),
    "Tablets (z.B. 'Amazon Fire HD 8 Kids', 'Acer Iconia A10', 'Lenovo IdeaTab'), auch wenn sie faelschlich in 'Computers' einsortiert sind, sollten NICHT im gemappten Katalog auftauchen"
  ],
  [
    !products.some((p) => /no-name tab x200/i.test(p.name)),
    "Ein no-name Tablet ohne bekannten Produktnamen sollte über Android/MediaTek/Mali technisch erkannt und ausgeschlossen werden"
  ],
  [
    products.some((p) => /hp 15s/i.test(p.name)),
    "Ein echter guenstiger PC (329 EUR, Intel Celeron, Kategorie 'Laptops') sollte trotz Preis unter 350 EUR NICHT faelschlich ausgeschlossen werden"
  ],
  [
    !products.some((p) => /ssd kit|installationskit/i.test(p.name)),
    "Zubehoer/Aufruest-Kits (z.B. 'M.2 SSD Kit', Awin-Kategorie 'Hardware') sollten NICHT im gemappten Katalog auftauchen"
  ],
  [
    !products.some((p) => /generalüberholt|refurbished/i.test(p.name)),
    "Refurbished/generalueberholte Geraete sollten NICHT im gemappten Katalog auftauchen"
  ],
  [
    products.some((p) => /chromebook/i.test(p.name)),
    "Ein neues Chromebook sollte NICHT ausgeschlossen werden (nur bei explizit gewaehltem Windows/macOS unsichtbar, siehe scoring.ts)"
  ],
  [
    (products.find((p) => /chromebook/i.test(p.name)) || {}).os === "chromeos",
    "Ein Chromebook sollte als os='chromeos' erkannt werden, nicht faelschlich als 'windows'"
  ],
  [products[0].deviceType === "laptop", "Zeile 1 sollte ein Laptop sein"],
  [
    products[0].screenSizeInches === 15.6,
    "Zeile 1 (15.6\" FHD) sollte screenSizeInches=15.6 ergeben (dezimalgenau, nicht auf 15 abgerundet)"
  ],
  [
    products[0].screenResolution === "fhd",
    "Zeile 1 (15.6\" FHD) sollte screenResolution='fhd' ergeben"
  ],
  [
    products[2].screenSizeInches === undefined && products[2].screenResolution === undefined,
    "Bei einem Desktop-PC (Zeile 3) sollten screenSizeInches/screenResolution NICHT gesetzt werden"
  ],
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
  [products.every((p) => p.affiliateUrl.startsWith("https://www.awin1.com")), "affiliateUrl sollte der Awin-Tracking-Link sein"],
  [
    (products.find((p) => /under desk pc/i.test(p.name)) || {}).deviceType === "desktop",
    "Ein 'Under Desk PC' (ARCTIC Senza) sollte als deviceType='desktop' erkannt werden, NICHT faelschlich als Laptop (Nutzer-Feedback 02.09.2026)"
  ],
  [
    (products.find((p) => /under desk pc/i.test(p.name)) || {}).storageGB === 1000,
    "Eine einstellige TB-Angabe wie '1TB SSD' (ARCTIC Senza) sollte storageGB=1000 ergeben, NICHT faelschlich den Default-Wert 512GB (Nutzer-Feedback 02.09.2026)"
  ],
  [
    (products.find((p) => /v15 g5 irl/i.test(p.name)) || {}).os === "ohne",
    "'DOS' allein (ohne 'Free' davor, z.B. Lenovo V15 G5 IRL) sollte os='ohne' ergeben, NICHT faelschlich als 'windows' erkannt werden (Nutzer-Feedback 02.09.2026)"
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
