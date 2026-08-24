import fs from "node:fs";
import path from "node:path";
import { Product, products as placeholderProducts } from "./products";

// Läuft NUR serverseitig (wird von app/page.tsx als Server Component
// aufgerufen). Lädt die per `npm run fetch-feed` generierten echten
// Produktdaten, falls vorhanden – sonst die Platzhalter-Daten aus
// lib/products.ts, damit das Projekt auch ohne Feed sofort lauffähig ist.
export function loadProducts(): { products: Product[]; isLiveData: boolean; generatedAt?: string } {
  const generatedPath = path.join(process.cwd(), "data", "products.generated.json");

  try {
    if (fs.existsSync(generatedPath)) {
      const raw = fs.readFileSync(generatedPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
        return {
          products: parsed.products as Product[],
          isLiveData: true,
          generatedAt: parsed.generatedAt
        };
      }
    }
  } catch (err) {
    console.warn("Konnte data/products.generated.json nicht lesen, nutze Platzhalter-Daten.", err);
  }

  return { products: placeholderProducts, isLiveData: false };
}
