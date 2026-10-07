import type { Metadata } from "next";
import { Archivo, Instrument_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { preconnect } from "react-dom";
import { PageProgress } from "@/components/ui/PageProgress";
import { LifecycleBoot } from "@/core/lifecycle/LifecycleBoot";
import { isLocale, locales, type Locale } from "@/content/locales";
import { mediaOrigins } from "@/lib/media";
import "../globals.css";

// Texto: Instrument Sans, la que eligió Guillem para todo lo que no es título. Variable en peso y
// en anchura (75–100): el eje de anchura sigue dando la voz condensada a los pies y al índice del
// equipo. Solo `latin` y sin cursiva: cada subconjunto y cada estilo es otro fichero precargado que
// compite con el vídeo del hero. `latin` ya cubre el catalán (à, ç, l·l, ’).
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Títulos: Guillem quiere Druk Wide (Commercial Type, de pago). Hasta tener la licencia hace de
// sustituto Archivo en su anchura máxima y su peso más alto, lo más parecido entre las gratuitas.
// Cuando llegue el woff2 se carga con next/font/local en este mismo sitio y se cambian los tokens
// --title-* de globals.css. Solo se usa en títulos, nunca en texto corrido. El rótulo del hero no
// la usa: va dibujado en Druk Wide, igual que el eslogan en Instrument Serif (content/words.ts),
// así que ninguna de las dos se carga como fuente.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
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
    <html lang={lang} className={`${instrumentSans.variable} ${archivo.variable} scroll-smooth`}>
      <body className="font-sans antialiased">
        {children}
        <PageProgress />
        {/* Último a propósito: su efecto corre después del de todos los bloques. */}
        <LifecycleBoot />
      </body>
    </html>
  );
}
