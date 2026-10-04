import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Syne } from "next/font/google";
import { Cursor } from "@/components/ui/Cursor";
import { ShowreelModal } from "@/components/ui/ShowreelModal";
import { Toast } from "@/components/ui/Toast";
import { LifecycleBoot } from "@/core/lifecycle/LifecycleBoot";
import "./globals.css";

// Mismas familias y pesos que el <link> de Google Fonts de mockup/v4, ahora autoalojadas.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "GUILLEM SALVADOR — Cinematografía de Naturaleza & Deporte Extremo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${cinzel.variable} ${cormorant.variable} ${syne.variable} scroll-smooth`}
    >
      <body className="font-sans antialiased selection:bg-gold-500/20 selection:text-gold-200">
        {/* Chrome global: fuera de las páginas porque no pertenece a ningún bloque. */}
        <Cursor />
        {children}
        <ShowreelModal />
        <Toast />
        {/* Último a propósito: su efecto corre después del de todos los bloques. */}
        <LifecycleBoot />
      </body>
    </html>
  );
}
