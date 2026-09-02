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
  // ChromeOS-Geraete (Chromebooks) muessen VOR der generischen Windows-
  // Erkennung geprueft werden, sonst fallen sie faelschlich unter "windows"
  // (siehe Nutzer-Feedback 28.08.2026: Chromebooks sollen nur auftauchen,
  // wenn beim Betriebssystem "Egal" gewaehlt wurde, nicht bei "Windows").
  if (/chromebook|chrome ?os/.test(t)) return "chromeos";
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

// Der kombinierte Awin-Datenfeed nutzt Awins EIGENE, händlerübergreifende
// Kategorien (gesteuert über die "cid"-Parameter in der Feed-URL) – nicht die
// Kategorien der einzelnen Shops. Eine Auswertung des Rohfeeds (28.08.2026)
// zeigt genau 4 Kategorien: "Laptops" (11052), "Monitors" (4021), "Hardware"
// (1898), "Computers" (1513). Eine Stichprobe der günstigsten Katalog-Einträge
// zeigte: "Monitors" enthält (wie der Name sagt) Bildschirme statt PCs, und
// "Hardware" ist ein Sammelbecken für Zubehör (Kabel, Adapter, Gehäuse,
// Netzteile, Notebookständer, Blickschutzfilter, Geschenkkarten, digitale
// Spielecodes, Garantieverlängerungen etc.) – keine eigenständigen PCs.
// Statt jeden einzelnen Zubehör-/Gutschein-/Kabel-Typ per Stichwort zu jagen
// (nie vollständig, siehe Nutzer-Feedback), lassen wir grundsätzlich NUR
// Zeilen aus "Laptops" und "Computers" in den Katalog – das ist robuster als
// jede Namens-Denyliste. Die Namens-/Technik-Filter weiter unten bleiben
// zusätzlich bestehen, weil auch innerhalb dieser beiden Kategorien
// vereinzelt Tablets/Zubehör falsch einsortiert sein können.
const ALLOWED_CATEGORIES = ["laptops", "computers"];

function isAllowedCategory(categoryName) {
  const cat = (categoryName || "").trim().toLowerCase();
  return ALLOWED_CATEGORIES.includes(cat);
}

// Selbst innerhalb von "Computers"/"Laptops" steckte noch jede Menge
// Zubehör (Adapter, Docks, Ladegeräte, Stifte, Notebookständer, ...). Eine
// Auswertung der 150 günstigsten Roh-Zeilen zeigte: die Awin-Kategorie
// verrät das nicht, aber die HÄNDLEREIGENE Kategorie (`merchant_category`,
// z.B. bei Cyberport) schon – ausnahmslos ALLE günstigen Zubehör-Treffer
// trugen den Wert "Zub. Notebooks Win". Die restlichen, im Feed
// vorkommenden Werte sind allesamt echte PC-Kategorien: "Notebooks
// Windows", "Apple-Notebooks", "Notebooks", "PC", "Apple-Desktops". Auch
// hier wieder bewusst eine Positivliste statt "alles außer Zub.*"
// auszuschließen: taucht künftig eine neue, unbekannte merchant_category
// auf, fällt sie erstmal raus statt ungeprüft durchzurutschen – sichtbar
// bleibt das über die Kategorie-Diagnose-Logs in fetch-feed.mjs.
const ALLOWED_MERCHANT_CATEGORIES = [
  "notebooks windows",
  "apple-notebooks",
  "notebooks",
  "pc",
  "apple-desktops"
];

// Manche Zeilen (insbesondere von notebooksbilliger.de) liefern gar keine
// merchant_category – dort verlassen wir uns weiter auf die Awin-Kategorie
// (Laptops/Computers) allein, statt echte Angebote ohne erkennbaren Grund
// auszuschließen.
function isAllowedMerchantCategory(merchantCategory) {
  const cat = (merchantCategory || "").trim().toLowerCase();
  if (!cat) return true;
  return ALLOWED_MERCHANT_CATEGORIES.includes(cat);
}

// Der Awin-Feed (insbesondere Cyberport) enthält in den genutzten Kategorien
// auch Tablets, E-Reader & Co. mit – das sind keine "PCs" im Sinne dieses
// Tools und sollen nicht als Empfehlung auftauchen (z.B. "Amazon Fire HD 8
// Kids Tablet" wurde fälschlich als Laptop einsortiert, weil kein
// Desktop-Formfaktor-Begriff erkannt wurde). Statt die Geräteart zu raten,
// schließen wir solche Zeilen komplett aus dem Katalog aus.
const EXCLUDED_HINTS = [
  "tablet",
  "tablet-pc",
  "ipad",
  "galaxy tab",
  "matepad",
  "lenovo tab",
  "idea tab",
  "ideatab",
  "yoga tab",
  "yogatab",
  "smart tab",
  "smarttab",
  "iconia",
  "fire hd",
  "fire max",
  "fire 7",
  "kindle",
  "surface go",
  "mediapad",
  "tab a8",
  "tab s9",
  "tab s8",
  "e-reader",
  "ereader",
  "smartphone",
  "handy"
];

function isExcludedProduct(text, categoryName) {
  const haystack = `${text} ${categoryName || ""}`.toLowerCase();
  return EXCLUDED_HINTS.some((h) => haystack.includes(h));
}

// Zubehör/Ersatz-/Aufrüstteile (z.B. "Lenovo ThinkCentre M.2 SSD Kit III -
// Speicher-Installationskit") sind keine eigenständigen PCs und sollen nicht
// als Empfehlung auftauchen. Bewusst NUR gegen Titel + Kategorie geprüft
// (nicht gegen die Beschreibung wie EXCLUDED_HINTS oben) – Beschreibungen
// echter PCs erwähnen Begriffe wie "Netzteil" oder "Arbeitsspeicher" oft
// beiläufig als Spezifikation, das würde sonst wieder zu Fehlausschlüssen
// echter Geräte führen (siehe Regression bei EXCLUDED_HINTS).
const ACCESSORY_HINTS = [
  "ssd kit",
  "installationskit",
  "speicher-installationskit",
  "speicherkit",
  "aufrüstkit",
  "aufrüst-kit",
  "arbeitsspeicher-kit",
  "ram-kit",
  "speichermodul",
  "arbeitsspeichermodul",
  "erweiterungskit",
  "upgrade-kit",
  "upgrade kit",
  "dockingstation",
  "docking station",
  "usb-hub",
  "netzteil",
  "ladegerät",
  "ersatzakku",
  "akku-pack",
  "laptoptasche",
  "notebooktasche",
  "schutzhülle",
  "displayschutz",
  "tastatur",
  "headset",
  "kopfhörer"
];

function isAccessoryProduct(name, categoryName) {
  const haystack = `${name} ${categoryName || ""}`.toLowerCase();
  return ACCESSORY_HINTS.some((h) => haystack.includes(h));
}

// Statt jede einzelne Tablet-Produktlinie beim Namen zu kennen (siehe
// Iconia/IdeaTab-Nachtrag oben – nie vollständig, jede neue Serie rutscht
// erstmal durch), erkennen wir Tablets zusätzlich technisch: Android als
// Betriebssystem, ARM-Tablet-Chips und mobile GPUs kommen in echten
// Windows-/Mac-PCs praktisch nie vor. Diese Begriffe sind viel eindeutiger
// als generische Wörter wie "Tablet" und lösen keine Fehlausschlüsse bei
// echten PCs aus – deshalb wird hier bewusst der breitere detectionText
// (inkl. specifications/short description) genutzt statt der engeren
// exclusionText, die für die generischen Namens-Stichwörter oben aus gutem
// Grund enger gefasst ist (siehe Regression bei EXCLUDED_HINTS).
const TABLET_OS_HINTS = ["android"];

// Snapdragon wird bewusst NICHT hier gelistet: es gibt inzwischen auch
// "Windows on ARM"-Laptops (Copilot+ PCs) mit Snapdragon-Chips, die aber als
// Betriebssystem "Windows" führen – die Android-Prüfung oben schützt schon
// vor den eigentlichen Tablets/Smartphones mit Snapdragon.
const TABLET_CHIP_HINTS = ["mediatek", "helio g", "helio p", "helio a", "dimensity", "unisoc", "exynos"];

const TABLET_GPU_HINTS = ["mali-400", "mali-g", "mali g", "adreno", "powervr"];

function isTabletLikeByTech(detectionText) {
  const t = detectionText.toLowerCase();
  return (
    TABLET_OS_HINTS.some((h) => t.includes(h)) ||
    TABLET_CHIP_HINTS.some((h) => t.includes(h)) ||
    TABLET_GPU_HINTS.some((h) => t.includes(h))
  );
}

// Nutzer-Feedback (28.08.2026): Refurbished/generalueberholte und gebrauchte
// Geraete sollen nicht mehr im Katalog auftauchen (neue Geraete, z.B. auch
// ein neues MS Surface, bleiben davon unberuehrt). Bewusst NUR gegen Titel +
// Beschreibung geprueft (exclusionText), nicht gegen die technischen
// Spezifikations-Spalten, um keine echten Neugeraete faelschlich
// auszuschliessen.
const REFURBISHED_HINTS = [
  "refurbished",
  "generalüberholt",
  "generalueberholt",
  "gebraucht",
  "b-ware",
  "b ware",
  "second hand",
  "secondhand",
  "wiederaufbereitet",
  "renewed",
  "vorbenutzt",
  "gebrauchtgerät",
  "gebrauchtgeraet"
];

function isRefurbishedProduct(text) {
  const haystack = text.toLowerCase();
  return REFURBISHED_HINTS.some((h) => haystack.includes(h));
}

// Eine Preisuntergrenze (z.B. "unter 350 € = kein PC") wurde bewusst NICHT
// eingebaut: ein Testlauf mit einer kombinierten Regel ("Preis < 350 € UND
// keine erkennbare PC-CPU-Bezeichnung im Text") ließ den Katalog von ca.
// 8.700 auf ca. 6.100 Produkte einbrechen (-30%) – deutlich mehr als die
// erwartete zusätzliche Tablet-Reduktion. Grund: viele echte günstige
// Einsteiger-PCs/Business-Desktops nennen ihre CPU im Feed-Text nicht immer
// so präzise (z.B. nur "Intel Core Prozessor" ohne i3/i5-Zusatz, oder AMD-
// Bezeichnungen außerhalb des erkannten Musters). Eine reine Preisgrenze
// hätte also reihenweise echte günstige PCs mit-ausgeschlossen. Die
// technische Erkennung oben (Android/ARM-Chips/mobile GPUs) bleibt
// stattdessen der einzige zusätzliche Signal-Typ, weil sie sehr präzise ist
// und nicht auf den Preis angewiesen ist.

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

// Bildschirm-Kriterium (Nutzerwunsch 02.09.2026): Größe UND Auflösung sollen
// als eigenes Bewertungs-Kriterium einfließen, weil für Kreativarbeit,
// Programmieren und Gaming ein größeres, hochauflösenderes Display spürbar
// von Vorteil ist. Bewusst eine EIGENE, dezimalgenaue Größen-Erkennung statt
// die vorhandene (auf ganze Zoll gerundete) Logik in detectMobility()
// wiederzuverwenden – ein Umbau von detectMobility() hätte sonst unbemerkt
// bestehende Mobilitäts-Bewertungen für x,6-Zoll-Geräte verschoben (z.B.
// "15.6 Zoll" fiele dann in eine andere Rundungs-Stufe), was hier nicht
// verlangt wurde.
function detectScreenSizeInches(text) {
  const match = text.match(/(\d{2}(?:[.,]\d)?)\s?(zoll|")/i);
  if (!match) return undefined;
  return parseFloat(match[1].replace(",", "."));
}

// Reihenfolge wichtig: zuerst UHD/QHD prüfen, dann erst das generische "hd"
// (steht sonst für das ältere, niedrig auflösende "HD ready"/1366x768 statt
// "Full HD" – "FHD"/"UHD"/"QHD" enthalten zwar den Teilstring "HD", aber
// \bhd\b matched dort NICHT, weil kein Wortübergang vor dem "h" liegt).
function detectScreenResolution(text) {
  const t = text.toLowerCase();
  if (/\buhd\b|\b4k\b|3840\s?x\s?2160/.test(t)) return "uhd";
  if (/\bqhd\b|\bwqhd\b|\b2k\b|2560\s?x\s?1440|2880\s?x\s?1800|2560\s?x\s?1600/.test(t)) return "qhd";
  if (/\bfhd\b|full\s?hd|1920\s?x\s?1080|1920\s?x\s?1200/.test(t)) return "fhd";
  if (/\bhd\b/.test(t)) return "hd";
  return undefined;
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
  // Bisher wurden CPU/RAM/Speicher/GPU/OS ausschliesslich per Text-Heuristik
  // aus Titel + Beschreibung erkannt. Der Awin-Feed liefert bei manchen
  // Produkten zusaetzlich strukturiertere Spalten (`specifications`,
  // `product_short_description`), die dieselben Angaben oft nochmal
  // separat/vollstaendiger enthalten (z.B. wenn der Titel selbst gekuerzt
  // ist). Diese Spalten fliessen NUR in die Hardware-Erkennung (CPU/RAM/
  // Speicher/GPU/OS) mit ein, NICHT in die Tablet/Smartphone-Ausschluss-
  // Pruefung weiter unten: `specifications` enthaelt bei PCs/Laptops oft
  // generische Kompatibilitaets-Floskeln ("auch mit Tablet/Smartphone
  // nutzbar" o.ae.), die sonst reihenweise echte PCs faelschlich
  // ausgeschlossen haetten. Die Ausschluss-Pruefung bleibt daher bewusst
  // auf Titel + Beschreibung + Kategorie beschraenkt (siehe exclusionText).
  const specifications = (row.specifications || "").trim();
  const shortDescription = (row.product_short_description || "").trim();
  const detectionText = `${name} ${description} ${specifications} ${shortDescription}`;
  const exclusionText = `${name} ${description}`;
  const categoryName = row.category_name || row.merchant_category || "";
  const merchantCategory = row.merchant_category || "";
  const shop = (row.merchant_name || "").trim() || "notebooksbilliger.de";

  const price = parseFloat(row.search_price || row.display_price || "0") || 0;

  // Nur Awin-Kategorien "Laptops"/"Computers" zulassen (siehe Kommentar bei
  // ALLOWED_CATEGORIES oben) – filtert Monitore und die "Hardware"-Sammel-
  // kategorie (Zubehör, Gutscheine, Spielecodes, ...) komplett heraus.
  if (!isAllowedCategory(categoryName)) return null;

  // Zusätzlich die händlereigene Kategorie prüfen (siehe
  // ALLOWED_MERCHANT_CATEGORIES oben) – filtert das verbliebene
  // Notebook-Zubehör (Adapter, Docks, Ladegeräte, Stifte, ...) heraus, das
  // innerhalb von "Laptops"/"Computers" weiterhin unter "Zub. Notebooks
  // Win" o.ä. läuft.
  if (!isAllowedMerchantCategory(merchantCategory)) return null;

  // Tablets, E-Reader, Smartphones etc. sind keine PCs/Laptops und werden
  // komplett aus dem Katalog ausgeschlossen, statt sie (falsch) als Laptop
  // oder Desktop einzusortieren.
  if (isExcludedProduct(exclusionText, categoryName)) return null;
  if (isAccessoryProduct(name, categoryName)) return null;
  if (isTabletLikeByTech(detectionText)) return null;
  if (isRefurbishedProduct(exclusionText)) return null;

  const brand = detectBrand(name, shop);
  const deviceType = detectDeviceType(detectionText, categoryName);
  const cpuClass = detectCpuClass(detectionText);
  const hasGPU = detectGPU(detectionText);
  const { ramGB, storageGB } = detectRamAndStorage(detectionText);
  const mobility = detectMobility(deviceType, detectionText);
  const lifespanYears = detectLifespan(cpuClass, ramGB);
  const useCases = detectUseCases({ text: detectionText, hasGPU, cpuClass, ramGB, price });
  const os = detectOS(detectionText, brand);

  // Nur bei Laptops erkennen/befüllen – bei Desktop-PCs liefert der Feed
  // keinen Monitor mit, ein "Bildschirm"-Kriterium ergäbe dort keinen Sinn
  // (siehe auch lib/scoring.ts, wo das Kriterium nur für Laptops gescort wird).
  const screenSizeInches = deviceType === "laptop" ? detectScreenSizeInches(detectionText) : undefined;
  const screenResolution = deviceType === "laptop" ? detectScreenResolution(detectionText) : undefined;

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
    screenSizeInches,
    screenResolution,
    imageUrl,
    affiliateUrl,
    shortPitch: shortPitch({ deviceType, cpuClass, hasGPU, useCases })
  };
}
