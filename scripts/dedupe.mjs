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

export function dedupeByName(products) {
  const groups = groupByNormalizedName(products);
  const result = [];
  for (const group of groups.values()) {
    let cheapest = group[0];
    for (const product of group) {
      if (product.price < cheapest.price) cheapest = product;
    }
    result.push(cheapest);
  }
  return result;
}
