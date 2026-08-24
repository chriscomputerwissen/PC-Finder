import { UseCase } from "./products";

export interface Answers {
  useCase: UseCase;
  gamingLevel?: "casual" | "demanding";
  deviceType: "laptop" | "desktop" | "egal";
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

export const deviceTypeOptions = [
  { value: "laptop" as const, label: "Laptop", hint: "Flexibel, auch unterwegs nutzbar" },
  { value: "desktop" as const, label: "Desktop-PC", hint: "Mehr Leistung pro Euro, bleibt am Platz" },
  { value: "egal" as const, label: "Bin mir nicht sicher", hint: "Zeig mir beide Optionen" }
];

export const lifespanOptions = [
  { value: "kurz" as const, label: "2-3 Jahre reichen", hint: "Danach wird ohnehin neu geschaut" },
  { value: "lang" as const, label: "Möglichst lange", hint: "Soll auch in einigen Jahren noch gut mithalten" }
];
