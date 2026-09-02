// Entfernt doppelte Angebote für exakt dasselbe Gerät, das mehrfach im
// (kombinierten Multi-Händler-)Feed auftaucht – z.B. dieselbe Konfiguration
// mit unterschiedlicher aw_product_id/merchant_product_id, teils sogar beim
// selben Händler (unterschiedliche Lagerbestände/Listing-Varianten).
//
// Erkennung rein über den normalisierten Produktnamen (Kleinschreibung,
// Sonderzeichen und Mehrfach-Leerzeichen entfernt) – das deckt den
// häufigsten Fall ab: identischer Titel, unterschiedlicher Tracking-Link.
// Bei mehreren Treffern gewinnt das günstigste Angebot.
//
// Bewusst (noch) NICHT über EAN/MPN dedupliziert: die sind im aktuellen
// Feed nicht durchgängig befüllt (siehe Cross-Shop-Preisvergleich-Backlog
// in der Projekt-Doku) – sobald das der Fall ist, wäre das der robustere
// Schlüssel, gerade auch über mehrere Händler hinweg.
export function normalizeProductName(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Exportiert primär, damit fetch-feed.mjs im Zweifel eine Stichprobe der
// größten Gruppen loggen kann (Plausibilitätscheck: ein einzelnes Gerät
// sollte normalerweise nur 2-3 Duplikate haben, nicht hunderte – eine
// riesige Gruppe deutet eher auf ein zu generisches/leeres Namens-Match hin
// als auf echte Duplikate).
export function groupByNormalizedName(products) {
  const groups = new Map();
  for (const product of products) {
    const key = normalizeProductName(product.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(product);
  }
  return groups;
}

// Cross-Shop-Preisvergleich (Nutzerwunsch 01.09.2026): Bisher wurde das
// teurere Duplikat beim Dedup einfach verworfen – der eigentliche
// Preisvergleich zwischen den Händlern ("bei X ist dasselbe Gerät Y € teurer")
// ging damit verloren, obwohl genau diese Information hier schon vorliegt.
// Jetzt behält jedes Ergebnis zusätzlich `alternativeOffers`: die jeweils
// güntigsten Angebote der ANDEREN Shops für dasselbe Gerät (aufsteigend nach
// Preis), damit im Frontend "auch bei X für Y € verfügbar" angezeigt werden
// kann. Bewusst nur EIN Eintrag pro Shop (nicht jedes einzelne Duplikat-
// Listing desselben Händlers) und OHNE den Shop des behaltenen (günstigsten)
// Angebots selbst.
export function dedupeByName(products) {
  const groups = groupByNormalizedName(products);
  const result = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];

    const seenShops = new Set([cheapest.shop]);
    const alternativeOffers = [];
    for (const product of sorted) {
      if (product === cheapest) continue;
      if (seenShops.has(product.shop)) continue;
      seenShops.add(product.shop);
      alternativeOffers.push({ shop: product.shop, price: product.price });
    }

    result.push(alternativeOffers.length > 0 ? { ...cheapest, alternativeOffers } : cheapest);
  }
  return result;
}
