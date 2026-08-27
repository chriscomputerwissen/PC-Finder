"use server";

// Server Action: führt das Matching serverseitig gegen den vollen Katalog
// aus und gibt NUR die 1-3 Ergebnisse ans Frontend zurück.
//
// Grund (achte Runde, 26.08.2026): Seit Otto/Cyberport zusätzlich zu
// notebooksbilliger.de im Awin-Feed eingebunden sind, ist der Katalog auf
// ca. 44.000 Produkte gewachsen. Vorher wurde der komplette Katalog als
// Prop an die Client-Komponente PcFinder übergeben und dadurch beim
// statischen Build direkt in die Seite eingebettet – das hat die
// 19-MB-Obergrenze für vorgerenderte Seiten gesprengt (Build-Fehler
// FALLBACK_BODY_TOO_LARGE). Jetzt bleibt der volle Katalog ausschließlich
// auf dem Server; der Browser bekommt nur das fertige Ergebnis.
import { loadProducts } from "@/lib/loadProducts";
import { matchProducts, ScoredProduct } from "@/lib/scoring";
import { Answers } from "@/lib/questions";

export async function getMatches(answers: Answers): Promise<ScoredProduct[]> {
  const { products } = loadProducts();

  // Nur Geräte, die in JEDER Komponente mindestens 3/5 erreichen (also
  // "fullMatch" sind, siehe lib/scoring.ts), werden aktiv empfohlen – ein
  // Mini-PC mit tollem Preis, aber Gerätetyp-Note 1/5, soll bei "Laptop"
  // nicht als Empfehlung erscheinen, nur weil er in Summe hoch punktet.
  // Gibt es kein einziges qualifizierendes Gerät, zeigen wir stattdessen
  // die besten Alternativen (klar gekennzeichnet über ScoredProduct.fullMatch
  // im Frontend).
  const allResults = matchProducts(products, answers);
  const qualifying = allResults.filter((r) => r.fullMatch);
  return (qualifying.length > 0 ? qualifying : allResults).slice(0, 3);
}
