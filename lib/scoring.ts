import { Product, CpuClass } from "./products";
import { Answers } from "./questions";

const cpuRank: Record<CpuClass, number> = {
  einsteiger: 1,
  mittel: 2,
  leistung: 3,
  premium: 4
};

export interface ScoredProduct {
  product: Product;
  score: number;
  reasons: string[];
}

// Leitet aus den Antworten ein Anforderungsprofil ab und bewertet jedes
// Produkt dagegen. Bewusst regelbasiert (keine KI) für Nachvollziehbarkeit,
// Geschwindigkeit und Kostenfreiheit im MVP.
export function matchProducts(products: Product[], answers: Answers): ScoredProduct[] {
  const requiresGPU =
    answers.useCase === "gaming" ||
    (answers.useCase === "creative" && answers.gamingLevel !== "casual");

  let minCpuRank = 1;
  if (answers.useCase === "coding" || answers.useCase === "creative") minCpuRank = 2;
  if (answers.useCase === "gaming") {
    minCpuRank = answers.gamingLevel === "demanding" ? 3 : 2;
  }

  const results: ScoredProduct[] = products.map((product) => {
    let score = 0;
    const reasons: string[] = [];

    // Use-Case-Treffer
    if (product.useCases.includes(answers.useCase)) {
      score += 30;
    }

    // CPU-Klasse ausreichend?
    if (cpuRank[product.cpuClass] >= minCpuRank) {
      score += 20;
      if (cpuRank[product.cpuClass] === minCpuRank) {
        reasons.push("Die Prozessorleistung passt genau zu deinem Bedarf.");
      } else {
        reasons.push("Hat sogar etwas mehr Leistungsreserve als nötig.");
      }
    } else {
      score -= 25;
    }

    // GPU-Anforderung
    if (requiresGPU) {
      if (product.hasGPU) {
        score += 20;
        reasons.push("Eigene Grafikkarte für flüssiges Gaming bzw. Rendering an Bord.");
      } else {
        score -= 30;
      }
    } else if (!product.hasGPU) {
      // Kein unnötiges Geld für Grafikleistung ausgeben, die nicht gebraucht wird
      score += 8;
      reasons.push("Keine überflüssige (und teure) Grafikleistung, die du nicht brauchst.");
    }

    // Gerätetyp
    if (answers.deviceType !== "egal") {
      if (product.deviceType === answers.deviceType) {
        score += 15;
      } else {
        score -= 15;
      }
    }

    // Mobilität
    const mobilityWeight = 10;
    if (product.deviceType === "laptop") {
      const diff = Math.abs(product.mobility - answers.mobilityImportance);
      score += mobilityWeight - diff * 2;
      if (answers.mobilityImportance >= 4 && product.mobility >= 4) {
        reasons.push("Gute Mobilität bzw. Akkulaufzeit für unterwegs.");
      }
    } else if (answers.mobilityImportance >= 4) {
      // Desktop, aber Mobilität ist wichtig -> Punktabzug
      score -= 15;
    }

    // Budget
    if (product.price <= answers.budget) {
      score += 20;
      const distance = answers.budget - product.price;
      if (distance <= answers.budget * 0.15) {
        reasons.push("Schöpft dein Budget sinnvoll aus, ohne es zu sprengen.");
      } else {
        reasons.push("Bleibt spürbar unter deinem Budget.");
      }
    } else {
      const overBudget = product.price - answers.budget;
      score -= 15 + Math.min(30, (overBudget / answers.budget) * 40);
    }

    // Lebensdauer
    if (answers.lifespan === "lang" && product.lifespanYears >= 4) {
      score += 10;
      reasons.push("Solide Ausstattung, die auch in ein paar Jahren noch mithält.");
    }
    if (answers.lifespan === "kurz" && product.price < answers.budget * 0.7) {
      score += 5;
      reasons.push("Guter Preis, wenn es nicht die längste Lebensdauer sein muss.");
    }

    return { product, score, reasons };
  });

  return results.sort((a, b) => b.score - a.score);
}
