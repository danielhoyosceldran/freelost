import type { Metadata } from "next";
import { Archivo, Instrument_Serif, Six_Caps } from "next/font/google";
import { PageProgress } from "@/components/ui/PageProgress";
import { ShowreelModal } from "@/components/ui/ShowreelModal";
import { Toast } from "@/components/ui/Toast";
import { LifecycleBoot } from "@/core/lifecycle/LifecycleBoot";
import { isLocale, locales, type Locale } from "@/content/locales";
import { notFound } from "next/navigation";
import "../globals.css";

// Una sola familia variable: el eje de anchura (62–125) da el nombre condensado y la marca
// expandida sin cargar una segunda fuente.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["wdth"],
});

// Las dos voces de película del primer cartón: Six Caps, alta y estrecha como las hojas de la marca,
// para el rótulo; Instrument Serif cursiva, de título de crédito, para el eslogan. Solo el hero.
const sixCaps = Six_Caps({ variable: "--font-six-caps", subsets: ["latin"], weight: "400" });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
});

// Solo se prerenderizan los idiomas listados; cualquier otro segmento es 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export function generateMetadata(): Metadata {
  return {
    title: "Guillem Salvador — free lost",
    description: "Feel free to get lost.",
    alternates: {
      languages: Object.fromEntries(locales.map((l: Locale) => [l, `/${l}`])),
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang} className={`${archivo.variable} ${sixCaps.variable} ${instrument.variable} scroll-smooth`}>
      <body className="font-sans antialiased">
        {children}
        <PageProgress />
        {/* Chrome heredado de v4 que aún usan bloques fuera de la home (reel). */}
        <ShowreelModal />
        <Toast />
        {/* Último a propósito: su efecto corre después del de todos los bloques. */}
        <LifecycleBoot />
      </body>
    </html>
  );
}
