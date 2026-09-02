// Allgemeine, laienverständliche Erklärungen zu den wichtigsten PC-Komponenten
// inklusive Richtwerten zur Orientierung. Wird unabhängig von den konkreten
// Suchergebnissen in einem Info-Dialog angezeigt (siehe GlossaryModal).

export interface GlossarySection {
  key: string;
  title: string;
  intro: string;
  reference: string[];
}

export const glossarySections: GlossarySection[] = [
  {
    key: "cpu",
    title: "Prozessor (CPU)",
    intro:
      "Der Prozessor ist das „Gehirn“ deines PCs. Er bestimmt, wie schnell Programme starten, wie flüssig mehrere Anwendungen gleichzeitig laufen und wie gut der PC mit rechenintensiven Aufgaben wie Videoschnitt oder großen Programmierprojekten zurechtkommt.",
    reference: [
      "Einsteiger: reicht für Surfen, Mails, Office, Streaming",
      "Mittelklasse: mehrere Programme gleichzeitig, Studium, leichtes Multitasking",
      "Leistungsklasse: aktuelle Spiele, Videoschnitt, größere Programmierprojekte",
      "High-End: professionelle Videobearbeitung, 3D-Rendering, sehr anspruchsvolles Multitasking"
    ]
  },
  {
    key: "gpu",
    title: "Grafikkarte (GPU)",
    intro:
      "Die Grafikkarte berechnet alles, was auf dem Bildschirm dargestellt wird. Für Büroarbeit reicht die im Prozessor eingebaute Grafikeinheit völlig aus. Für Gaming, Videobearbeitung oder 3D-Anwendungen lohnt sich eine eigene (dedizierte) Grafikkarte.",
    reference: [
      "Integrierte Grafik: ausreichend für Office, Surfen, Streaming, ältere/leichte Spiele",
      "Eigene Grafikkarte (Einstieg): aktuelle Spiele in mittleren Details",
      "Eigene Grafikkarte (Leistung): aktuelle Spiele in hohen Details, schnellerer Videoexport",
      "Wichtig fürs Zusammenspiel: eine starke Grafikkarte bringt wenig, wenn Prozessor oder Arbeitsspeicher sie ausbremsen"
    ]
  },
  {
    key: "ram",
    title: "Arbeitsspeicher (RAM)",
    intro:
      "Der Arbeitsspeicher (RAM) ist der Kurzzeit-Speicher, in dem der PC alles ablegt, woran gerade gearbeitet wird. Je mehr RAM vorhanden ist, desto mehr Programme und Browser-Tabs kannst du gleichzeitig flüssig geöffnet haben.",
    reference: [
      "8 GB: Basis für Surfen, Mails, einfache Office-Aufgaben",
      "16 GB: heutiger Komfort-Standard, auch für Studium, Homeoffice, leichtes Programmieren",
      "32 GB oder mehr: für Bild-/Videobearbeitung, große Projekte oder starkes Multitasking"
    ]
  },
  {
    key: "storage",
    title: "Speicherplatz (SSD)",
    intro:
      "Der Speicherplatz bestimmt, wie viele Programme, Fotos, Videos oder Spiele dauerhaft auf dem PC Platz finden. Moderne Geräte nutzen dafür SSDs, die deutlich schneller sind als alte Festplatten (HDDs) – Windows startet damit in Sekunden statt Minuten.",
    reference: [
      "256 GB: eher knapp, reicht für Basis-Nutzung ohne große Mediensammlung",
      "512 GB: komfortabler Standard für die meisten Anwendungsfälle",
      "1 TB oder mehr: sinnvoll bei vielen Spielen, großen Foto-/Videobibliotheken oder umfangreichen Projekten"
    ]
  },
  {
    key: "mobility",
    title: "Mobilität & Akkulaufzeit",
    intro:
      "Bei Laptops spielen neben der Leistung auch Gewicht und Akkulaufzeit eine große Rolle. Leichtere und ausdauerndere Geräte sind meist etwas teurer oder machen bei der reinen Rechenleistung kleine Abstriche.",
    reference: [
      "Sehr mobil: leicht, lange Akkulaufzeit, ideal für unterwegs (Uni, Zug, Café)",
      "Mittel: guter Kompromiss aus Leistung und Transportfähigkeit",
      "Wenig mobil: leistungsstarke Gaming-/Workstation-Laptops oder Desktop-PCs, die meist am festen Platz bleiben"
    ]
  },
  {
    key: "screen",
    title: "Bildschirm (Größe & Auflösung)",
    intro:
      "Bei Laptops zählen neben der Leistung auch Bildschirmgröße und Auflösung: für Büroarbeit reicht ein kleineres, einfacheres Display, für Kreativarbeit, Programmieren oder Gaming lohnt sich ein größerer, schärferer Bildschirm – mehr Platz für Zeitleisten, Paletten oder mehrere Fenster, feinere Details bei Bild-/Videobearbeitung.",
    reference: [
      "13-14 Zoll, Full HD: guter Kompromiss für Büro, Schule, unterwegs",
      "15,6 Zoll oder mehr, QHD/WQHD: komfortabler für Programmieren, spürbar besser für Kreativarbeit und Gaming",
      "16 Zoll oder mehr, 4K/UHD: ideal für anspruchsvolle Bild-/Videobearbeitung, bei Gaming eher Geschmackssache (hohe Bildwiederholrate oft wichtiger als reine Auflösung)"
    ]
  },
  {
    key: "os",
    title: "Betriebssystem",
    intro:
      "Das Betriebssystem ist die Grundsoftware, mit der du den PC überhaupt bedienst. Windows ist der Standard bei den meisten PCs und Laptops, macOS läuft ausschließlich auf Apple-Geräten. Manche (oft selbst zusammengestellte) PCs werden bewusst ohne vorinstalliertes Betriebssystem verkauft – dafür etwas günstiger, dafür installierst du Windows anschließend selbst.",
    reference: [
      "Windows: größte Software- und Spieleauswahl, läuft auf den meisten PCs und Laptops",
      "macOS: nur auf Apple-Geräten (MacBook, Mac mini, Mac Studio, iMac)",
      "Ohne Betriebssystem: meist günstiger, du brauchst einen eigenen Windows-Lizenzschlüssel und installierst es selbst – dafür gibt es passende Video-Anleitungen"
    ]
  },
  {
    key: "lifespan",
    title: "Zukunftssicherheit",
    intro:
      "Wie lange ein PC „gut mithält“, hängt davon ab, wie viel Leistungsreserve über den aktuellen Bedarf hinaus vorhanden ist. Ein Gerät mit etwas mehr Prozessor, RAM und ggf. Grafikleistung als aktuell nötig bleibt spürbar länger komfortabel nutzbar.",
    reference: [
      "2-3 Jahre: knapp bemessene Ausstattung reicht meist aus",
      "4-5 Jahre und mehr: etwas mehr Reserve bei CPU, RAM und ggf. Grafikkarte einplanen"
    ]
  }
];
