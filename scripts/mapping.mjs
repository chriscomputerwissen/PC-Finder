// Übersetzt eine rohe Feed-Zeile (Awin-Produktdatenfeed, Spalten wie in
// scripts/fetch-feed.mjs definiert) in unser internes Produktschema
// (siehe lib/products.ts). Der Awin-Feed liefert keine strukturierten
// Spezifikationen (CPU, RAM, GPU ...), deshalb werden diese per
// Text-Heuristik aus product_name + description abgeleitet.
//
// WICHTIG: Das ist ein erster Automatisierungs-Wurf, kein Ersatz für eine
// stichprobenartige manuelle Kontrolle, bevor die Daten live gehen –
// insbesondere useCases/cpuClass sind Heuristiken, keine Garantie.

const KNOWN_BRANDS = [
  "Lenovo", "HP", "Dell", "Acer", "ASUS", "Asus", "MSI", "Apple", "Microsoft",
  "Samsung", "Huawei", "Medion", "Fujitsu", "Toshiba", "Razer", "Gigabyte",
  "LG", "Xiaomi", "Sony"
];

function detectBrand(name, fallbackShop) {
  const found = KNOWN_BRANDS.find((b) => name.toLowerCase().startsWith(b.toLowerCase()));
  // Wenn keine bekannte Hersteller-Marke im Titel erkannt wird (z.B. bei
  // individuell konfigurierten Systemen), zeigen wir stattdessen den Händler
  // an, von dem das Angebot stammt (früher hart auf "notebooksbilliger.de"
  // codiert – das stimmt seit mehreren Händlern im Feed nicht mehr).
  return found ? (found === "Asus" ? "ASUS" : found) : fallbackShop;
}

function detectDeviceType(text, categoryName) {
  const desktopHints = [
    "desktop-pc", "desktop pc", "komplett-pc", "tower", "mini-pc", "mini pc",
    "minipc", "micro-pc", "microtower", "micro tower", "sff", "nuc",
    "stick-pc", "stick pc", "barebone", "thinkcentre", "elitedesk",
    "prodesk", "optiplex", "mac mini", "mac studio", "all-in-one",
    "pc-system", "gaming-pc", "workstation-pc"
  ];
  const haystack = `${text} ${categoryName || ""}`.toLowerCase();
  return desktopHints.some((h) => haystack.includes(h)) ? "desktop" : "laptop";
}

function detectOS(text, brand) {
  const t = text.toLowerCase();
  if (brand === "Apple" || /mac ?os|macbook|imac|mac mini|mac studio/.test(t)) return "macos";
  if (/ohne betriebssystem|ohne os\b|no os\b|freedos|free ?dos/.test(t)) return "ohne";
  return "windows";
}

function detectCpuClass(text) {
  const t = text.toLowerCase();
  if (/\bi9\b|ryzen 9|m3 pro|m3 max|m2 pro|m2 max|m1 pro|m1 max/.test(t)) return "premium";
  if (/\bi7\b|ryzen 7/.test(t)) return "leistung";
  if (/\bi5\b|ryzen 5|\bm1\b|\bm2\b|\bm3\b|\bm4\b/.test(t)) return "mittel";
  if (/\bi3\b|ryzen 3|pentium|celeron|athlon/.test(t)) return "einsteiger";
  return "mittel"; // konservativer Default, falls nichts erkannt wird
}

function detectGPU(text) {
  return /rtx ?\d{3,4}|gtx ?\d{3,4}|radeon rx ?\d{3,4}|arc a\d{3}/i.test(text);
}

function detectRamAndStorage(text) {
  const storageMatch = text.match(/(\d{2,4})\s?(gb|tb)\s*(ssd|nvme|hdd|festplatte)/i);
  let storageGB = 512;
  let remaining = text;
  if (storageMatch) {
    const value = parseInt(storageMatch[1], 10);
    storageGB = /tb/i.test(storageMatch[2]) ? value * 1000 : value;
    remaining = text.replace(storageMatch[0], "");
  }

  const ramMatch = remaining.match(/(\d{1,3})\s?gb\s*(ram|arbeitsspeicher)?\b/i);
  const ramGB = ramMatch ? parseInt(ramMatch[1], 10) : 8;

  return { ramGB, storageGB };
}

function detectMobility(deviceType, text) {
  if (deviceType === "desktop") return 1;
  const sizeMatch = text.match(/(\d{2})[.,]?\d?\s?(zoll|")/i);
  if (!sizeMatch) return 4;
  const size = parseInt(sizeMatch[1], 10);
  if (size <= 14) return 5;
  if (size <= 15) return 4;
  if (size <= 16) return 3;
  return 2;
}

function detectLifespan(cpuClass, ramGB) {
  if ((cpuClass === "premium" || cpuClass === "leistung") && ramGB >= 16) return 5;
  if (cpuClass === "mittel" && ramGB >= 16) return 4;
  if (cpuClass === "einsteiger" || ramGB < 8) return 2;
  return 3;
}

function detectUseCases({ text, hasGPU, cpuClass, ramGB, price }) {
  const useCases = new Set(["office"]);
  if (hasGPU || /gaming/i.test(text)) useCases.add("gaming");
  if (/creator|creative|video|foto|design|workstation/i.test(text)) useCases.add("creative");
  if (ramGB >= 16 && !hasGPU) useCases.add("coding");
  if (price > 0 && price < 600) useCases.add("school");
  if ((cpuClass === "premium" || cpuClass === "leistung") && ramGB >= 16) useCases.add("creative");
  return Array.from(useCases);
}

function shortPitch({ deviceType, cpuClass, hasGPU, useCases }) {
  if (hasGPU) return "Eigene Grafikkarte an Bord – geeignet für Gaming oder kreative Anwendungen.";
  if (useCases.includes("creative")) return "Genug Leistung für anspruchsvollere Anwendungen und Multitasking.";
  if (cpuClass === "einsteiger") return "Günstiger Einstieg für Alltagsaufgaben.";
  if (deviceType === "desktop") return "Gutes Preis-Leistungs-Verhältnis für den festen Arbeitsplatz.";
  return "Solider Allrounder für Alltag, Büro und unterwegs.";
}

export function mapFeedRow(row) {
  const name = (row.product_name || "").trim();
  const description = (row.description || "").trim();
  const text = `${name} ${description}`;
  const categoryName = row.category_name || row.merchant_category || "";
  const shop = (row.merchant_name || "").trim() || "notebooksbilliger.de";

  const price = parseFloat(row.search_price || row.display_price || "0") || 0;
  const brand = detectBrand(name, shop);
  const deviceType = detectDeviceType(text, categoryName);
  const cpuClass = detectCpuClass(text);
  const hasGPU = detectGPU(text);
  const { ramGB, storageGB } = detectRamAndStorage(text);
  const mobility = detectMobility(deviceType, text);
  const lifespanYears = detectLifespan(cpuClass, ramGB);
  const useCases = detectUseCases({ text, hasGPU, cpuClass, ramGB, price });
  const os = detectOS(text, brand);

  const rawId = row.aw_product_id || row.merchant_product_id || row.data_feed_id;
  // Merchant-ID als Präfix: aw_product_id sollte pro Awin-Feed bereits
  // eindeutig sein, aber sobald mehrere Händler-Feeds kombiniert werden
  // (siehe fetch-feed.mjs), schützt der Präfix zuverlässig vor einer
  // zufälligen ID-Kollision zwischen zwei verschiedenen Händlern.
  const id = row.merchant_id && rawId ? `${row.merchant_id}-${rawId}` : rawId;
  const affiliateUrl = row.aw_deep_link || row.merchant_deep_link || "";
  const imageUrl = row.aw_image_url || row.merchant_image_url || "";

  if (!id || !name || !price || !affiliateUrl) return null;

  return {
    id: String(id),
    name,
    brand,
    shop,
    deviceType,
    price: Math.round(price * 100) / 100,
    cpuClass,
    hasGPU,
    ramGB,
    storageGB,
    mobility,
    lifespanYears,
    useCases,
    os,
    imageUrl,
    affiliateUrl,
    shortPitch: shortPitch({ deviceType, cpuClass, hasGPU, useCases })
  };
}
