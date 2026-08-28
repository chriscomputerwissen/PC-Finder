import { Product, CpuClass, UseCase, OS } from "./products";
import {
  Answers,
  deviceTypeOptions,
  gamingLevelOptions,
  lifespanOptions,
  osOptions,
  useCaseOptions
} from "./questions";

const cpuRank: Record<CpuClass, number> = {
  einsteiger: 1,
  mittel: 2,
  leistung: 3,
  premium: 4
};

const cpuClassOrder: CpuClass[] = ["einsteiger", "mittel", "leistung", "premium"];

const cpuLabel: Record<CpuClass, string> = {
  einsteiger: "Einsteiger-Prozessor",
  mittel: "Mittelklasse-Prozessor",
  leistung: "Leistungs-Prozessor",
  premium: "High-End-Prozessor"
};

// Richtwerte fürs RAM je Einsatzzweck (nur zur Einordnung/Erklärung genutzt,
// fließt zusätzlich leicht ins Scoring ein).
const ramRecommendation: Record<UseCase, { min: number; comfortable: number }> = {
  office: { min: 8, comfortable: 16 },
  school: { min: 8, comfortable: 8 },
  coding: { min: 16, comfortable: 16 },
  creative: { min: 16, comfortable: 32 },
  gaming: { min: 16, comfortable: 16 }
};

// Richtwerte für Speicherplatz je Einsatzzweck.
const storageRecommendation: Record<UseCase, number> = {
  office: 256,
  school: 256,
  coding: 512,
  creative: 512,
  gaming: 512
};

function findLabel<T extends string>(options: { value: T; label: string }[], value: T | undefined): string {
  return options.find((o) => o.value === value)?.label ?? "";
}

const osLabel: Record<OS, string> = {
  windows: "Windows",
  macos: "macOS",
  ohne: "ohne Betriebssystem",
  chromeos: "ChromeOS"
};

export type Verdict = "gut" | "ok" | "weniger-passend";

// Jede Komponente wird auf einer Skala von 1-5 bewertet. Die Ampel-Farbe
// (Verdict) wird direkt aus diesem Wert abgeleitet, damit beides immer
// konsistent bleibt.
function verdictFromScore(scoreOutOf5: number): Verdict {
  if (scoreOutOf5 >= 4) return "gut";
  if (scoreOutOf5 === 3) return "ok";
  return "weniger-passend";
}

// Durchgängiges Bewertungsprinzip (Stand 26.08.2026, nach Nutzer-Feedback):
// Erfüllt eine Komponente exakt den Bedarf, gilt das bereits als 100% –
// volle 5 Punkte. Übertrifft sie den Bedarf sogar noch, bleibt die Punktzahl
// bei 5 (mehr als 5 gibt es nicht), der Unterschied wird stattdessen im
// Beschreibungstext als "übertrifft deine Anforderung" o.ä. sichtbar gemacht.
// Wird der Bedarf verfehlt, gibt es zwei Stufen: "knapp verfehlt" (2 Punkte)
// und "deutlich verfehlt" (1 Punkt) – beides zählt als "weniger passend" und
// verhindert, dass das Gerät als Volltreffer empfohlen wird.
const NEAR_MISS = 2;
const CLEAR_MISS = 1;

// Eine einzelne, für Laien verständliche Einordnung einer Produkt-Komponente
// (Prozessor, Grafikkarte, RAM, ...) im Verhältnis zu den Antworten des Users.
// "short" wird in der Kurzübersicht der Ergebniskarte gezeigt, "detail" in der
// aufklappbaren Detailansicht. "scoreOutOf5" wird dort direkt hinter der
// Überschrift angezeigt (z.B. "Einsatzzweck (4/5)").
export interface ComponentAssessment {
  key: string;
  label: string;
  scoreOutOf5: number;
  verdict: Verdict;
  short: string;
  detail: string;
  // Wie stark diese Komponente in die Gesamtpunktzahl einfließt (Standard: 1).
  // Budget und Gerätetyp bekommen ein höheres Gewicht, damit ein Gerät, das
  // hier klar daneben liegt, nicht allein durch starke Werte bei anderen
  // Komponenten (CPU, RAM, ...) nach oben "gerettet" werden kann.
  weight: number;
}

export interface ScoredProduct {
  product: Product;
  reasons: string[];
  assessments: ComponentAssessment[];
  totalScore: number;
  maxScore: number;
  // true, wenn keine einzige Komponente als "weniger-passend" eingestuft wurde
  fullMatch: boolean;
}

function pushAssessment(
  assessments: ComponentAssessment[],
  key: string,
  label: string,
  scoreOutOf5: number,
  short: string,
  detail: string,
  weight: number = 1
) {
  assessments.push({ key, label, scoreOutOf5, verdict: verdictFromScore(scoreOutOf5), short, detail, weight });
}

// Budget bekommt doppeltes Gewicht in der Gesamtpunktzahl: eine einzelne
// 1-5-Bewertung wie jede andere Komponente würde einem Gerät, das weit über
// dem Budget liegt, erlauben, das allein durch gute CPU/GPU/RAM-Werte wieder
// auszugleichen. Mit doppeltem Gewicht schlägt eine schlechte Budget-Passung
// stärker auf die Gesamtpunktzahl durch.
const BUDGET_WEIGHT = 2;

// Gerätetyp bekommt ebenfalls doppeltes Gewicht: ein Laptop-Wunsch, der durch
// einen Mini-PC/Desktop "erfüllt" wird (oder umgekehrt), soll nicht allein
// durch gute Werte bei anderen Komponenten kaschiert werden können.
const DEVICE_TYPE_WEIGHT = 2;

// Leitet aus den Antworten ein Anforderungsprofil ab und bewertet jedes
// Produkt dagegen. Bewusst regelbasiert (keine KI) für Nachvollziehbarkeit,
// Geschwindigkeit und Kostenfreiheit im MVP. Sortiert wird zuerst nach
// Gesamtpunktzahl (meiste Punkte oben), bei Gleichstand nach günstigstem
// Preis.
export function matchProducts(products: Product[], answers: Answers): ScoredProduct[] {
  const requiresGPU =
    answers.useCase === "gaming" ||
    (answers.useCase === "creative" && answers.gamingLevel !== "casual");

  let minCpuRank = 1;
  if (answers.useCase === "coding" || answers.useCase === "creative") minCpuRank = 2;
  if (answers.useCase === "gaming") {
    minCpuRank = answers.gamingLevel === "demanding" ? 3 : 2;
  }
  const minCpuClass = cpuClassOrder[minCpuRank - 1];

  const useCaseLabel = findLabel(useCaseOptions, answers.useCase);
  const gamingLabel = answers.gamingLevel ? findLabel(gamingLevelOptions, answers.gamingLevel) : undefined;
  const deviceTypeLabel = findLabel(deviceTypeOptions, answers.deviceType);
  const lifespanLabel = findLabel(lifespanOptions, answers.lifespan);
  const osOptionLabel = findLabel(osOptions, answers.os);
  const useCaseWithLevel = `${useCaseLabel}${gamingLabel ? ` (${gamingLabel})` : ""}`;

  const ramRec = ramRecommendation[answers.useCase];
  const storageRec = storageRecommendation[answers.useCase];

  // Betriebssystem ist ein harter Filter (macOS/Windows/ohne sind funktional
  // sehr unterschiedlich) – "egal" zeigt alles. Falls der Filter keine
  // Treffer liefert (z.B. noch keine Mac-Produkte im Katalog), fällt er auf
  // den vollen Katalog zurück, statt eine leere Ergebnisliste zu zeigen.
  const osFilter: OS | null = answers.os && answers.os !== "egal" ? answers.os : null;
  const osFiltered = osFilter ? products.filter((p) => p.os === osFilter) : products;
  const osFallback = osFiltered.length === 0;
  const workingProducts = osFallback ? products : osFiltered;

  const results: ScoredProduct[] = workingProducts.map((product) => {
    const assessments: ComponentAssessment[] = [];

    // Einsatzzweck
    if (product.useCases.includes(answers.useCase)) {
      pushAssessment(
        assessments,
        "useCase",
        "Einsatzzweck",
        5,
        `Passt zu deinem Einsatzzweck „${useCaseLabel}“.`,
        `Du hast „${useCaseLabel}“ als Haupteinsatzzweck angegeben. Dieses Gerät ist genau für solche Anwendungsfälle ausgelegt.`
      );
    } else {
      pushAssessment(
        assessments,
        "useCase",
        "Einsatzzweck",
        NEAR_MISS,
        `Nicht speziell für „${useCaseLabel}“ ausgelegt.`,
        `Du hast „${useCaseLabel}“ angegeben. Dieses Gerät ist eher für andere Einsatzzwecke gedacht, kann aber trotzdem brauchbar sein, wenn Preis und Ausstattung sonst passen.`
      );
    }

    // Betriebssystem
    // "Egal" bedeutet: es gibt keine konkrete Anforderung – die ist damit
    // automatisch zu 100% erfüllt, unabhängig davon, welches Betriebssystem
    // das Gerät mitbringt.
    if (osFilter && !osFallback) {
      pushAssessment(
        assessments,
        "os",
        "Betriebssystem",
        5,
        `Läuft mit ${osLabel[product.os]}, wie gewünscht.`,
        `Du hast „${osOptionLabel}“ gewählt. Dieses Gerät bringt genau das mit.`
      );
    } else if (osFilter && osFallback) {
      pushAssessment(
        assessments,
        "os",
        "Betriebssystem",
        NEAR_MISS,
        `Läuft mit ${osLabel[product.os]} statt der gewünschten Option.`,
        `Du hast „${osOptionLabel}“ gewählt. Aktuell haben wir dafür kein passendes Gerät im Katalog – hier stattdessen die nächstbeste Alternative.`
      );
    } else {
      pushAssessment(
        assessments,
        "os",
        "Betriebssystem",
        5,
        `Kommt mit ${osLabel[product.os]}.`,
        `Du hast bei Betriebssystem „Egal“ gewählt – jedes Betriebssystem erfüllt damit deine Anforderung. Dieses Gerät läuft mit ${osLabel[product.os]}.`
      );
    }

    // Prozessor
    // Erfüllt die CPU die Mindestklasse, ist der Bedarf zu 100% gedeckt (5
    // Punkte) – egal ob genau getroffen oder übertroffen. Nur der Text
    // unterscheidet, ob zusätzlich Reserve vorhanden ist. Erst wenn die CPU
    // darunter liegt, sinkt die Punktzahl gestaffelt nach Abstand.
    {
      const cpuGap = minCpuRank - cpuRank[product.cpuClass];
      if (cpuGap <= 0) {
        const extra = cpuGap < 0;
        pushAssessment(
          assessments,
          "cpu",
          "Prozessor (CPU)",
          5,
          extra
            ? "Bietet mehr Prozessorleistung, als du eigentlich brauchst – gute Reserve."
            : "Prozessorleistung passt genau zu deinem Bedarf.",
          `Ausgestattet mit einem ${cpuLabel[product.cpuClass]}. Für „${useCaseWithLevel}“ reicht als Richtwert mindestens ein ${cpuLabel[minCpuClass]}. ${
            extra
              ? "Hier ist sogar etwas mehr Leistung vorhanden, als unbedingt nötig wäre – deine Anforderung ist damit übertroffen."
              : "Die Einstufung trifft deinen Bedarf genau – das zählt als volle Erfüllung."
          }`
        );
      } else {
        const score = cpuGap === 1 ? NEAR_MISS : CLEAR_MISS;
        pushAssessment(
          assessments,
          "cpu",
          "Prozessor (CPU)",
          score,
          score === NEAR_MISS
            ? "Prozessor könnte für deinen Bedarf knapp sein."
            : "Prozessor dürfte für deinen Bedarf spürbar zu schwach sein.",
          `Ausgestattet mit einem ${cpuLabel[product.cpuClass]}. Für „${useCaseWithLevel}“ empfehlen wir als Richtwert mindestens einen ${cpuLabel[minCpuClass]}, damit es auch bei mehreren Aufgaben gleichzeitig flüssig bleibt.`
        );
      }
    }

    // Grafikkarte
    // Sonderfall ohne numerischen Richtwert (nur "vorhanden ja/nein"): eine
    // nicht benötigte, aber trotzdem verbaute Grafikkarte ist kein Erfüllen
    // einer Anforderung (die gibt es hier nicht), sondern ein unnötiger
    // Mehrpreis – bleibt bewusst bei 3/5 statt bei voller Punktzahl.
    if (requiresGPU) {
      if (product.hasGPU) {
        pushAssessment(
          assessments,
          "gpu",
          "Grafikkarte (GPU)",
          5,
          "Eigene Grafikkarte für flüssiges Gaming bzw. Rendering an Bord.",
          `Bei „${useCaseWithLevel}“ ist eine dedizierte Grafikkarte wichtig, damit Spiele oder Bild-/Videobearbeitung flüssig laufen. Dieses Gerät bringt eine eigene Grafikkarte mit.`
        );
      } else {
        pushAssessment(
          assessments,
          "gpu",
          "Grafikkarte (GPU)",
          CLEAR_MISS,
          "Keine eigene Grafikkarte – für deinen Zweck meist zu wenig.",
          `Bei „${useCaseWithLevel}“ ist eine dedizierte Grafikkarte normalerweise wichtig. Dieses Gerät hat nur eine im Prozessor integrierte Grafikeinheit, die bei anspruchsvolleren Spielen oder Videobearbeitung schnell an ihre Grenzen kommt.`
        );
      }
    } else if (!product.hasGPU) {
      pushAssessment(
        assessments,
        "gpu",
        "Grafikkarte (GPU)",
        5,
        "Keine überflüssige (und teure) Grafikleistung, die du nicht brauchst.",
        `Für „${useCaseLabel}“ wird keine dedizierte Grafikkarte benötigt. Die im Prozessor integrierte Grafikeinheit reicht für Büro, Streaming & Co. völlig aus – dafür bleibt der Preis niedriger.`
      );
    } else {
      pushAssessment(
        assessments,
        "gpu",
        "Grafikkarte (GPU)",
        3,
        "Hat eine Grafikkarte, die du für deinen Zweck nicht zwingend brauchst.",
        `Für „${useCaseLabel}“ wäre eine dedizierte Grafikkarte nicht zwingend nötig gewesen. Sie schadet nicht, kann aber den Preis nach oben treiben.`
      );
    }

    // Arbeitsspeicher (RAM)
    // Erreicht das Gerät den Mindest-Richtwert, ist der Bedarf zu 100%
    // gedeckt (5 Punkte) – ob genau am Richtwert oder mit Komfort-Puffer
    // darüber, das steht nur noch im Text. Erst darunter sinkt die Punktzahl
    // gestaffelt: "etwas zu wenig" vs. "deutlich zu wenig".
    if (product.ramGB >= ramRec.min) {
      const extra = product.ramGB >= ramRec.comfortable;
      pushAssessment(
        assessments,
        "ram",
        "Arbeitsspeicher (RAM)",
        5,
        extra
          ? `${product.ramGB} GB RAM – mehr Puffer, als du für „${useCaseLabel}“ eigentlich brauchst.`
          : `${product.ramGB} GB RAM – passt genau zu deinem Bedarf für „${useCaseLabel}“.`,
        `Mit ${product.ramGB} GB Arbeitsspeicher erfüllst du den Richtwert für „${useCaseLabel}“ (mindestens ${ramRec.min} GB) vollständig.${
          extra ? ` Das liegt sogar über dem Komfort-Richtwert von ${ramRec.comfortable} GB.` : ""
        }`
      );
    } else {
      const nearMiss = product.ramGB >= ramRec.min * 0.5;
      pushAssessment(
        assessments,
        "ram",
        "Arbeitsspeicher (RAM)",
        nearMiss ? NEAR_MISS : CLEAR_MISS,
        nearMiss
          ? `${product.ramGB} GB RAM – etwas unter dem Richtwert für „${useCaseLabel}“.`
          : `${product.ramGB} GB RAM – deutlich unter dem Richtwert für „${useCaseLabel}“.`,
        `Mit ${product.ramGB} GB kann es bei „${useCaseLabel}“ zu Rucklern kommen, sobald mehrere Programme gleichzeitig offen sind. Richtwert wäre hier mindestens ${ramRec.min} GB.`
      );
    }

    // Speicherplatz
    // Gleiches Prinzip wie bei RAM: Richtwert erreicht = volle Punktzahl,
    // unabhängig davon ob genau getroffen oder deutlich übertroffen.
    if (product.storageGB >= storageRec) {
      const extra = product.storageGB >= storageRec * 2;
      pushAssessment(
        assessments,
        "storage",
        "Speicherplatz",
        5,
        extra
          ? `${product.storageGB} GB Speicher – reichlich Platz, mehr als du für „${useCaseLabel}“ brauchst.`
          : `${product.storageGB} GB Speicher – passt genau zu deinem Bedarf für „${useCaseLabel}“.`,
        `${product.storageGB} GB SSD-Speicher decken den Richtwert für „${useCaseLabel}“ (ca. ${storageRec} GB) vollständig ab.${
          extra ? " Das ist sogar deutlich mehr, als du eigentlich brauchst." : ""
        }`
      );
    } else {
      const nearMiss = product.storageGB >= storageRec * 0.5;
      pushAssessment(
        assessments,
        "storage",
        "Speicherplatz",
        nearMiss ? NEAR_MISS : CLEAR_MISS,
        nearMiss
          ? `${product.storageGB} GB Speicher – etwas unter dem Richtwert für „${useCaseLabel}“.`
          : `${product.storageGB} GB Speicher – deutlich unter dem Richtwert für „${useCaseLabel}“.`,
        `${product.storageGB} GB liegen unter dem Richtwert von ca. ${storageRec} GB für „${useCaseLabel}“. Eventuell wird es mit Fotos, Spielen oder großen Dateien eng.`
      );
    }

    // Gerätetyp
    // "Bin mir nicht sicher" bedeutet auch hier: keine konkrete Anforderung,
    // also automatisch zu 100% erfüllt.
    if (answers.deviceType !== "egal") {
      if (product.deviceType === answers.deviceType) {
        pushAssessment(
          assessments,
          "deviceType",
          "Gerätetyp",
          5,
          `Ist ein ${product.deviceType === "laptop" ? "Laptop" : "Desktop-PC"}, wie gewünscht.`,
          `Du hast „${deviceTypeLabel}“ gewählt. Genau das ist dieses Gerät.`,
          DEVICE_TYPE_WEIGHT
        );
      } else {
        pushAssessment(
          assessments,
          "deviceType",
          "Gerätetyp",
          CLEAR_MISS,
          `Ist kein ${deviceTypeLabel}, wie eigentlich gewünscht.`,
          `Du hast „${deviceTypeLabel}“ gewählt, dieses Gerät ist aber ein ${product.deviceType === "laptop" ? "Laptop" : "Desktop-PC"}.`,
          DEVICE_TYPE_WEIGHT
        );
      }
    } else {
      pushAssessment(
        assessments,
        "deviceType",
        "Gerätetyp",
        5,
        `${product.deviceType === "laptop" ? "Laptop" : "Desktop-PC"} – du warst dir hier unsicher, das erfüllt jede Option.`,
        `Da du „Bin mir nicht sicher“ angegeben hast, zeigen wir dir sowohl Laptop- als auch Desktop-Optionen.`,
        DEVICE_TYPE_WEIGHT
      );
    }

    // Mobilität
    // Erreicht oder übertrifft die Mobilität des Geräts die von dir gewählte
    // Wichtigkeit, ist der Bedarf zu 100% gedeckt (5 Punkte). Liegt sie
    // knapp darunter, gilt das als leicht verfehlt, deutlich darunter als
    // klar verfehlt.
    if (product.deviceType === "laptop") {
      const diff = product.mobility - answers.mobilityImportance;
      let score: number;
      let short: string;
      if (diff >= 0) {
        score = 5;
        short =
          diff > 0
            ? `Bietet mehr Mobilität/Akkulaufzeit (${product.mobility}/5), als dir wichtig war (${answers.mobilityImportance}/5).`
            : "Mobilität passt genau zu dem, was dir wichtig war.";
      } else if (diff === -1) {
        score = NEAR_MISS;
        short = `Etwas weniger mobil (${product.mobility}/5), als dir wichtig war (${answers.mobilityImportance}/5).`;
      } else {
        score = CLEAR_MISS;
        short = `Deutlich weniger mobil (${product.mobility}/5), als dir wichtig war (${answers.mobilityImportance}/5).`;
      }
      pushAssessment(
        assessments,
        "mobility",
        "Mobilität / Akkulaufzeit",
        score,
        short,
        `Du hast Mobilität mit ${answers.mobilityImportance} von 5 bewertet. Dieses Gerät liegt bei ${product.mobility} von 5 (Gewicht, Akkulaufzeit, Formfaktor).`
      );
    } else if (answers.mobilityImportance >= 4) {
      pushAssessment(
        assessments,
        "mobility",
        "Mobilität / Akkulaufzeit",
        CLEAR_MISS,
        "Als Desktop-PC nicht mobil nutzbar, obwohl dir das wichtig war.",
        `Du hast Mobilität mit ${answers.mobilityImportance} von 5 als wichtig eingestuft. Ein Desktop-PC bleibt aber fest am Platz.`
      );
    } else if (answers.mobilityImportance === 3) {
      pushAssessment(
        assessments,
        "mobility",
        "Mobilität / Akkulaufzeit",
        3,
        "Desktop-PC – Mobilität war dir nur mittelwichtig, ein kleiner Kompromiss.",
        `Mobilität war dir mit ${answers.mobilityImportance} von 5 nur mittelwichtig. Ein Desktop-PC deckt das nur teilweise ab.`
      );
    } else {
      pushAssessment(
        assessments,
        "mobility",
        "Mobilität / Akkulaufzeit",
        5,
        "Desktop-PC – passt genau, da dir Mobilität nicht wichtig war.",
        `Mobilität war dir mit ${answers.mobilityImportance} von 5 nicht wichtig, daher erfüllt ein Desktop-PC deine Anforderung vollständig.`
      );
    }

    // Budget
    // Bleibt der Preis im Budget, ist die Anforderung "im Rahmen bleiben"
    // zu 100% erfüllt (5 Punkte) – unabhängig davon, ob das Budget knapp
    // ausgeschöpft oder deutlich unterschritten wird (das steht nur noch im
    // Text). Über dem Budget sinkt die Punktzahl gestaffelt nach Abstand und
    // zählt doppelt (BUDGET_WEIGHT), damit ein Gerät, das z.B. 170% über dem
    // Budget liegt, nicht allein durch gute Werte bei anderen Komponenten
    // ganz nach oben rutschen kann.
    if (product.price <= answers.budget) {
      const distance = answers.budget - product.price;
      const closeToBudget = distance <= answers.budget * 0.15;
      pushAssessment(
        assessments,
        "budget",
        "Budget",
        5,
        closeToBudget
          ? "Schöpft dein Budget sinnvoll aus, ohne es zu sprengen."
          : "Bleibt spürbar unter deinem Budget – volle Punktzahl, dein Budget-Rahmen ist eingehalten.",
        `Du hast ein Budget von ca. ${answers.budget.toLocaleString("de-DE")} € angegeben. Der Preis von ${product.price.toLocaleString(
          "de-DE"
        )} € liegt darunter (Differenz: ${distance.toLocaleString("de-DE")} €).`,
        BUDGET_WEIGHT
      );
    } else {
      const overBudget = product.price - answers.budget;
      const overRatio = overBudget / answers.budget;
      const overScore = overRatio <= 0.1 ? 3 : overRatio <= 0.25 ? NEAR_MISS : CLEAR_MISS;
      pushAssessment(
        assessments,
        "budget",
        "Budget",
        overScore,
        `Liegt ${overBudget.toLocaleString("de-DE")} € (${Math.round(overRatio * 100)}%) über deinem Budget.`,
        `Du hast ein Budget von ca. ${answers.budget.toLocaleString("de-DE")} € angegeben. Der Preis von ${product.price.toLocaleString(
          "de-DE"
        )} € liegt darüber – das sind ${Math.round(overRatio * 100)}% mehr als geplant.`,
        BUDGET_WEIGHT
      );
    }

    // Zukunftssicherheit
    // Gleiches Prinzip: erreicht die geschätzte Lebensdauer die gewünschte
    // Nutzungsdauer, ist der Bedarf zu 100% gedeckt (5 Punkte) – ob genau
    // getroffen oder deutlich übertroffen, steht nur noch im Text. Der Preis
    // fließt bewusst NICHT in die Punktzahl ein, taucht bei "kurz reicht"
    // aber weiterhin als zusätzlicher Hinweistext auf, wenn er günstig ist.
    if (answers.lifespan === "lang") {
      const diff = product.lifespanYears - 4;
      let score: number;
      let short: string;
      if (diff >= 0) {
        score = 5;
        short =
          diff > 0
            ? "Hält sogar noch länger, als für „möglichst lange“ nötig wäre."
            : "Solide Ausstattung, die auch in ein paar Jahren noch mithält.";
      } else if (diff === -1) {
        score = NEAR_MISS;
        short = "Dürfte etwas früher als gewünscht an ihre Grenzen kommen.";
      } else {
        score = CLEAR_MISS;
        short = "Könnte deutlich schneller an ihre Grenzen kommen als gewünscht.";
      }
      pushAssessment(
        assessments,
        "lifespan",
        "Zukunftssicherheit",
        score,
        short,
        `Du willst, dass der PC „${lifespanLabel}“ mithält. Wir schätzen dieses Gerät auf ca. ${product.lifespanYears} Jahre gute Nutzbarkeit ein.`
      );
    } else {
      const diff = product.lifespanYears - 2;
      const cheapForPeriod = product.price < answers.budget * 0.7;
      let score: number;
      let short: string;
      if (diff >= 0) {
        score = 5;
        short =
          diff >= 2
            ? `Hält mit ca. ${product.lifespanYears} Jahren deutlich länger, als du eigentlich brauchst.`
            : `Deckt die gewünschten „${lifespanLabel}“ genau ab.`;
      } else if (diff === -1) {
        score = NEAR_MISS;
        short = `Könnte mit ca. ${product.lifespanYears} Jahren knapp an deiner gewünschten Nutzungsdauer vorbeigehen.`;
      } else {
        score = CLEAR_MISS;
        short = `Dürfte mit ca. ${product.lifespanYears} Jahren deutlich unter deiner gewünschten Nutzungsdauer bleiben.`;
      }
      pushAssessment(
        assessments,
        "lifespan",
        "Zukunftssicherheit",
        score,
        short,
        `Du hast angegeben, dass „${lifespanLabel}“ ausreicht. Wir schätzen dieses Gerät auf etwa ${product.lifespanYears} Jahre gute Nutzbarkeit ein.${
          cheapForPeriod
            ? ` Dazu ist der Preis von ${product.price.toLocaleString("de-DE")} € für diesen Zeitraum besonders attraktiv.`
            : ""
        }`
      );
    }

    const reasons = assessments.filter((a) => a.verdict === "gut").map((a) => a.short);
    // Gewichtete Summe statt einfacher Summe: Komponenten mit höherem Gewicht
    // (Budget, Gerätetyp) zählen entsprechend stärker.
    const totalScore = assessments.reduce((sum, a) => sum + a.scoreOutOf5 * a.weight, 0);
    const maxScore = assessments.reduce((sum, a) => sum + 5 * a.weight, 0);
    const fullMatch = assessments.every((a) => a.verdict !== "weniger-passend");

    return { product, reasons, assessments, totalScore, maxScore, fullMatch };
  });

  // Meiste Punkte zuerst, bei Gleichstand der günstigste Preis zuerst.
  return results.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.product.price - b.product.price;
  });
}
