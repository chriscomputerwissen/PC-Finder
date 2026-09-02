// Datenmodell für ein Produkt im PC-Finder.
//
// WICHTIG für später: Ein Affiliate-Feed (z.B. von Awin/notebooksbilliger.de)
// liefert nur Rohdaten wie Titel, Preis, Bild-URL und Produkt-URL.
// Die Felder useCase / cpuClass / hasGPU / ramGB / mobility / lifespanYears
// müssen aus dem Feed abgeleitet werden (z.B. per Titel-Parsing/Regeln oder
// einer kleinen Mapping-Tabelle pro Prozessor-Generation). Das ist der Schritt,
// den wir umsetzen, sobald der echte Feed vorliegt (siehe README).

export type UseCase = "office" | "gaming" | "creative" | "coding" | "school";
export type CpuClass = "einsteiger" | "mittel" | "leistung" | "premium";
export type DeviceType = "laptop" | "desktop";
export type OS = "windows" | "macos" | "ohne" | "chromeos";
// Grobe Auflösungsklassen, aus dem Feed-Text erkannt (siehe
// scripts/mapping.mjs, detectScreenResolution). "hd" meint das ältere
// 1366x768 ("HD ready"), NICHT "Full HD".
export type ScreenResolution = "hd" | "fhd" | "qhd" | "uhd";

export interface Product {
  id: string;
  name: string;
  brand: string;
  // Welcher Awin-Händler dieses Angebot liefert (notebooksbilliger.de, Otto,
  // Cyberport, ...). Aktuell nur zur Nachvollziehbarkeit/Diagnose genutzt;
  // eine "erhältlich bei X"-Anzeige im UI ist ein separater, späterer Schritt.
  shop: string;
  deviceType: DeviceType;
  price: number;
  cpuClass: CpuClass;
  hasGPU: boolean;
  ramGB: number;
  storageGB: number;
  mobility: 1 | 2 | 3 | 4 | 5; // 5 = sehr mobil / lange Akkulaufzeit
  lifespanYears: 2 | 3 | 4 | 5; // grobe Einschätzung, wie "zukunftssicher"
  useCases: UseCase[];
  os: OS;
  // Bildschirm-Kriterium (seit 02.09.2026): nur bei Laptops erkannt/befüllt
  // (siehe scripts/mapping.mjs) und nur bei Laptops in die Bewertung
  // aufgenommen (siehe lib/scoring.ts) – bei Desktop-PCs ist ein "Bildschirm"
  // kein sinnvolles Kriterium, weil im Feed kein Monitor mitgeliefert wird.
  // Optional, weil aus dem Feed-Text nicht immer eine Größe/Auflösung
  // erkennbar ist.
  screenSizeInches?: number;
  screenResolution?: ScreenResolution;
  imageUrl: string;
  // Sobald der Awin-Feed eingebunden ist, ersetzt affiliateUrl den Platzhalter
  // durch den echten Tracking-Link (Deeplink mit Publisher-ID).
  affiliateUrl: string;
  shortPitch: string; // ein Satz, der das Gerät auf den Punkt bringt
  // Cross-Shop-Preisvergleich (seit 01.09.2026): wird von
  // scripts/dedupe.mjs befüllt, wenn dasselbe Gerät (gleicher normalisierter
  // Name) auch bei anderen Händlern gelistet ist. Enthält jeweils nur das
  // günstigste Angebot PRO anderem Shop, aufsteigend nach Preis – das
  // Angebot in diesem Product-Objekt selbst ist immer das insgesamt
  // günstigste. Optional/leer, wenn kein anderer Shop dasselbe Gerät führt.
  alternativeOffers?: { shop: string; price: number }[];
}

// Platzhalter-Katalog. Wird ersetzt/ergänzt, sobald der echte NBB-Produktfeed
// via Awin eingebunden ist.
export const products: Product[] = [
  {
    id: "office-einsteiger-1",
    name: "Lenovo IdeaPad Slim 3",
    brand: "Lenovo",
    shop: "notebooksbilliger.de",
    deviceType: "laptop",
    price: 549,
    cpuClass: "einsteiger",
    hasGPU: false,
    ramGB: 8,
    storageGB: 512,
    mobility: 4,
    lifespanYears: 3,
    useCases: ["office", "school"],
    os: "windows",
    imageUrl: "https://placehold.co/400x300?text=IdeaPad+Slim+3",
    affiliateUrl: "https://www.notebooksbilliger.de/platzhalter-1",
    shortPitch: "Zuverlässiger Allrounder für Uni, Büro und den Alltag."
  },
  {
    id: "office-mittel-1",
    name: "ASUS Vivobook 15",
    brand: "ASUS",
    shop: "notebooksbilliger.de",
    deviceType: "laptop",
    price: 699,
    cpuClass: "mittel",
    hasGPU: false,
    ramGB: 16,
    storageGB: 512,
    mobility: 4,
    lifespanYears: 4,
    useCases: ["office", "school", "coding"],
    os: "windows",
    imageUrl: "https://placehold.co/400x300?text=Vivobook+15",
    affiliateUrl: "https://www.notebooksbilliger.de/platzhalter-2",
    shortPitch: "Mehr Reserven für mehrere offene Programme gleichzeitig."
  },
  {
    id: "creative-1",
    name: "Apple MacBook Air 13\" (M3)",
    brand: "Apple",
    shop: "notebooksbilliger.de",
    deviceType: "laptop",
    price: 1199,
    cpuClass: "leistung",
    hasGPU: false,
    ramGB: 16,
    storageGB: 512,
    mobility: 5,
    lifespanYears: 5,
    useCases: ["creative", "coding", "office"],
    os: "macos",
    imageUrl: "https://placehold.co/400x300?text=MacBook+Air+M3",
    affiliateUrl: "https://www.notebooksbilliger.de/platzhalter-3",
    shortPitch: "Extrem leise, sehr lange Akkulaufzeit, ideal für unterwegs."
  },
  {
    id: "coding-1",
    name: "Lenovo ThinkPad E14",
    brand: "Lenovo",
    shop: "notebooksbilliger.de",
    deviceType: "laptop",
    price: 899,
    cpuClass: "mittel",
    hasGPU: false,
    ramGB: 16,
    storageGB: 1000,
    mobility: 4,
    lifespanYears: 5,
    useCases: ["coding", "office"],
    os: "windows",
    imageUrl: "https://placehold.co/400x300?text=ThinkPad+E14",
    affiliateUrl: "https://www.notebooksbilliger.de/platzhalter-4",
    shortPitch: "Robust und langlebig, beliebt für Entwickler-Workflows."
  },
  {
    id: "gaming-einsteiger-1",
    name: "ASUS TUF Gaming A15",
    brand: "ASUS",
    shop: "notebooksbilliger.de",
    deviceType: "laptop",
    price: 999,
    cpuClass: "mittel",
    hasGPU: true,
    ramGB: 16,
    storageGB: 512,
    mobility: 2,
    lifespanYears: 3,
    useCases: ["gaming", "school"],
    os: "windows",
    imageUrl: "https://placehold.co/400x300?text=TUF+Gaming+A15",
    affiliateUrl: "https://www.notebooksbilliger.de/platzhalter-5",
    shortPitch: "Solide Einstiegsleistung für aktuelle Spiele in mittleren Details."
  },
  {
    id: "gaming-leistung-1",
    name: "MSI Katana 15",
    brand: "MSI",
    shop: "notebooksbilliger.de",
    deviceType: "laptop",
    price: 1399,
    cpuClass: "leistung",
    hasGPU: true,
    ramGB: 16,
    storageGB: 1000,
    mobility: 2,
    lifespanYears: 4,
    useCases: ["gaming", "creative"],
    os: "windows",
    imageUrl: "https://placehold.co/400x300?text=MSI+Katana+15",
    affiliateUrl: "https://www.notebooksbilliger.de/platzhalter-6",
    shortPitch: "Spielt aktuelle Titel flüssig in hohen Details."
  },
  {
    id: "gaming-desktop-1",
    name: "Gaming-PC Ryzen 5 / RTX 4060",
    brand: "NBB-Systeme",
    shop: "notebooksbilliger.de",
    deviceType: "desktop",
    price: 1099,
    cpuClass: "leistung",
    hasGPU: true,
    ramGB: 16,
    storageGB: 1000,
    mobility: 1,
    lifespanYears: 4,
    useCases: ["gaming", "creative"],
    os: "ohne",
    imageUrl: "https://placehold.co/400x300?text=Gaming+PC+RTX+4060",
    affiliateUrl: "https://www.notebooksbilliger.de/platzhalter-7",
    shortPitch: "Bestes Preis-Leistungs-Verhältnis, wenn Mobilität keine Rolle spielt."
  },
  {
    id: "premium-creative-1",
    name: "ASUS ProArt Studiobook",
    brand: "ASUS",
    shop: "notebooksbilliger.de",
    deviceType: "laptop",
    price: 1899,
    cpuClass: "premium",
    hasGPU: true,
    ramGB: 32,
    storageGB: 1000,
    mobility: 3,
    lifespanYears: 5,
    useCases: ["creative", "coding"],
    os: "windows",
    imageUrl: "https://placehold.co/400x300?text=ProArt+Studiobook",
    affiliateUrl: "https://www.notebooksbilliger.de/platzhalter-8",
    shortPitch: "Für anspruchsvolle Video-/3D-Bearbeitung mit Farbgenauigkeit."
  },
  {
    id: "budget-desktop-1",
    name: "Büro-Desktop-PC Einsteiger",
    brand: "NBB-Systeme",
    shop: "notebooksbilliger.de",
    deviceType: "desktop",
    price: 449,
    cpuClass: "einsteiger",
    hasGPU: false,
    ramGB: 8,
    storageGB: 512,
    mobility: 1,
    lifespanYears: 3,
    useCases: ["office"],
    os: "windows",
    imageUrl: "https://placehold.co/400x300?text=Buero+Desktop",
    affiliateUrl: "https://www.notebooksbilliger.de/platzhalter-9",
    shortPitch: "Günstiger Einstieg für Surfen, Mails und Office-Anwendungen."
  },
  {
    id: "school-budget-1",
    name: "Acer Aspire 3",
    brand: "Acer",
    shop: "notebooksbilliger.de",
    deviceType: "laptop",
    price: 449,
    cpuClass: "einsteiger",
    hasGPU: false,
    ramGB: 8,
    storageGB: 256,
    mobility: 4,
    lifespanYears: 2,
    useCases: ["school", "office"],
    os: "windows",
    imageUrl: "https://placehold.co/400x300?text=Aspire+3",
    affiliateUrl: "https://www.notebooksbilliger.de/platzhalter-10",
    shortPitch: "Günstiger Begleiter für Schule und einfache Aufgaben."
  }
];
