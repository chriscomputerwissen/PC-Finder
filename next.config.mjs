/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Das Matching läuft seit der achten Runde über eine Server Action
  // (app/actions.ts) statt über in die statische Seite eingebettete Props,
  // damit der komplette Katalog (inzwischen mehrere zehntausend Produkte
  // durch Otto/Cyberport) nicht mehr die ISR-Seitengrößen-Obergrenze
  // sprengt (siehe PC-Finder-Konzept.md, achte Runde). Die Server Action
  // liest data/products.generated.json zur Laufzeit per fs.readFileSync
  // (siehe lib/loadProducts.ts) – das wird von Next.js' automatischer
  // File-Tracing-Erkennung NICHT zuverlässig erfasst, weil der Pfad
  // dynamisch zusammengesetzt wird. Ohne diese explizite Angabe würde die
  // Datei im Serverless-Function-Bundle fehlen und die Server Action würde
  // in Produktion nur auf die Platzhalter-Daten zurückfallen.
  experimental: {
    outputFileTracingIncludes: {
      "/": ["./data/products.generated.json"]
    }
  }
};

export default nextConfig;
