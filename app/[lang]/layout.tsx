import type { Metadata } from "next";
import { Archivo, Instrument_Serif, Six_Caps } from "next/font/google";
import { notFound } from "next/navigation";
import { preconnect } from "react-dom";
import { PageProgress } from "@/components/ui/PageProgress";
import { LifecycleBoot } from "@/core/lifecycle/LifecycleBoot";
import { isLocale, locales, type Locale } from "@/content/locales";
import { mediaOrigins } from "@/lib/media";
import "../globals.css";

// Una sola familia variable: el eje de anchura (62–125) da el nombre condensado y la marca
// expandida sin cargar una segunda fuente. Solo `latin` y sin cursiva: cada subconjunto y cada
// estilo es otro fichero de ~95 KB precargado que compite con el vídeo del hero. `latin` ya cubre
// el catalán (à, ç, l·l, ’); la única cursiva del sitio es el eslogan, que va en Instrument Serif.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Las dos voces de película del primer cartón: Six Caps, alta y estrecha como las hojas de la marca,
// para el rótulo; Instrument Serif cursiva, de título de crédito, para el eslogan (hero y pie).
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
  // Con los medios en un CDN, la conexión se abre mientras se parsea el HTML. Las imágenes van
  // con CORS (texturas WebGL); el vídeo, sin él.
  const media = mediaOrigins();
  if (media.image) preconnect(media.image, { crossOrigin: "anonymous" });
  if (media.video) preconnect(media.video);
  return (
    <html lang={lang} className={`${archivo.variable} ${sixCaps.variable} ${instrument.variable} scroll-smooth`}>
      <body className="font-sans antialiased">
        {children}
        <PageProgress />
        {/* Último a propósito: su efecto corre después del de todos los bloques. */}
        <LifecycleBoot />
      </body>
    </html>
  );
}
