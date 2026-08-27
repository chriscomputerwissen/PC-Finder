import PcFinder from "@/components/PcFinder";
import { loadProducts } from "@/lib/loadProducts";

export default function Home() {
  // Nur die isLiveData-Markierung wird hier gebraucht (für den Platzhalter-
  // Hinweis unten) – der eigentliche Produktkatalog wird NICHT mehr an die
  // Client-Komponente durchgereicht. Seit der achten Runde läuft das
  // Matching über eine Server Action (app/actions.ts), die den Katalog
  // serverseitig hält; siehe dortigen Kommentar für den Hintergrund.
  const { isLiveData } = loadProducts();

  return (
    <main className="page">
      <div className="brand">
        <h1>Dein PC-Finder</h1>
        <p>von Computerwissen mit Chris – 6 Fragen, dann weißt du, welcher PC zu dir passt.</p>
      </div>
      {!isLiveData && (
        <p className="data-note">
          Hinweis: Es werden aktuell Platzhalter-Produkte angezeigt. Führe{" "}
          <code>npm run fetch-feed</code> aus, um echte notebooksbilliger.de-Angebote zu laden.
        </p>
      )}
      <PcFinder />
    </main>
  );
}
