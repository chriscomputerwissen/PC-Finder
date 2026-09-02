import { UseCase, OS } from "./products";

export interface Answers {
  useCase: UseCase;
  gamingLevel?: "casual" | "demanding";
  deviceType: "laptop" | "desktop" | "egal";
  os: OS | "egal";
  mobilityImportance: number; // 1-5, nur relevant bei laptop/egal
  budget: number; // in Euro
  lifespan: "kurz" | "lang"; // 2-3 Jahre vs. möglichst lange
}

export const useCaseOptions: { value: UseCase; label: string; hint: string }[] = [
  { value: "office", label: "Büro & Alltag", hint: "Surfen, Mails, Office, Streaming" },
  { value: "gaming", label: "Gaming", hint: "Spiele – von gelegentlich bis anspruchsvoll" },
  { value: "creative", label: "Foto/Video/Kreativ", hint: "Bild-, Video- oder Musikbearbeitung" },
  { value: "coding", label: "Programmieren", hint: "Entwicklung, mehrere Tools gleichzeitig" },
  { value: "school", label: "Schule/Studium", hint: "Leichte Aufgaben, oft unterwegs" }
];

export const gamingLevelOptions = [
  { value: "casual" as const, label: "Eher entspannt", hint: "z. B. Fortnite, League of Legends, ältere Titel" },
  { value: "demanding" as const, label: "Anspruchsvoll", hint: "Aktuelle AAA-Titel in guten Details" }
];

export const osOptions: { value: OS | "egal"; label: string; hint: string }[] = [
  { value: "windows", label: "Windows", hint: "Der Standard für die meisten PCs und Laptops" },
  { value: "macos", label: "macOS (Apple)", hint: "Nur für Apple-Geräte wie MacBook oder Mac mini" },
  {
    value: "ohne",
    label: "Ohne Betriebssystem",
    hint: "Meist günstiger – Windows installierst du selbst (wir zeigen dir wie)"
  },
  { value: "egal", label: "Egal", hint: "Zeig mir alle Optionen" }
];

export const deviceTypeOptions = [
  { value: "laptop" as const, label: "Laptop", hint: "Flexibel, auch unterwegs nutzbar" },
  { value: "desktop" as const, label: "Desktop-PC", hint: "Mehr Leistung pro Euro, bleibt am Platz" },
  { value: "egal" as const, label: "Bin mir nicht sicher", hint: "Zeig mir beide Optionen" }
];

export const lifespanOptions = [
  { value: "kurz" as const, label: "2-3 Jahre reichen", hint: "Danach wird ohnehin neu geschaut" },
  { value: "lang" as const, label: "Möglichst lange", hint: "Soll auch in einigen Jahren noch gut mithalten" }
];

// Wort-Label für die 1-5-Wichtigkeits-Skala der Mobilitäts-Frage. Zentral
// definiert, damit Frage (PcFinder.tsx) und Ergebnis-Erklärung (scoring.ts)
// exakt dasselbe Wording verwenden – reine Zahlen ("4 von 5") sind für
// Nutzer:innen ohne Kontext schwer einzuordnen (Feedback 02.09.2026).
export const mobilityImportanceLabels: Record<number, string> = {
  1: "nicht wichtig",
  2: "eher unwichtig",
  3: "mittelwichtig",
  4: "wichtig",
  5: "sehr wichtig"
};
