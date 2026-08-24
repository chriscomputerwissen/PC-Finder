import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PC-Finder | Computerwissen mit Chris",
  description: "Beantworte ein paar Fragen und finde den Laptop oder PC, der wirklich zu dir passt."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
