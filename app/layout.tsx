import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { ShowreelModal } from "@/components/ui/ShowreelModal";
import { Toast } from "@/components/ui/Toast";
import { LifecycleBoot } from "@/core/lifecycle/LifecycleBoot";
import "./globals.css";

// Una sola familia variable: el eje de anchura (62–125) da el nombre condensado y la marca
// expandida sin cargar una segunda fuente.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Guillem Salvador — free lost",
  description: "Feel free to get lost.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${archivo.variable} scroll-smooth`}>
      <body className="font-sans antialiased">
        {children}
        {/* Chrome heredado de v4 que aún usan bloques fuera de la home (reel). */}
        <ShowreelModal />
        <Toast />
        {/* Último a propósito: su efecto corre después del de todos los bloques. */}
        <LifecycleBoot />
      </body>
    </html>
  );
}
