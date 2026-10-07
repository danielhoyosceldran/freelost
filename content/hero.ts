import { locales, localeNames, type Locale } from "@/content/locales";
import { imageUrl, videoUrl } from "@/lib/media";

// Primera pantalla de la home. Película: Down Urban (public/media/videos/bici/downUrban.mp4),
// entera (28 s, sin negros), transcodificada a 1080p y 720p; el póster es su primer fotograma.
//
// El hero es un <video> nativo a propósito, también cuando el resto pase a Vimeo: el loader mide
// su búfer, la salida le cambia la velocidad y es el LCP. Un iframe de Vimeo añadiría su player
// (cientos de KB) antes del primer fotograma. Al CDN van estos mismos MP4 (o los enlaces de
// fichero de Vimeo, si el plan los da), vía NEXT_PUBLIC_VIDEO_BASE.
const text = {
  en: {
    filmLabel: "free lost film: urban downhill mountain biking.",
    labels: { sound: "Sound", play: "Play", pause: "Pause", language: "Language" },
  },
  ca: {
    filmLabel: "Pel·lícula de free lost: descens urbà en bicicleta de muntanya.",
    labels: { sound: "So", play: "Reproduir", pause: "Pausar", language: "Idioma" },
  },
  es: {
    filmLabel: "Película de free lost: descenso urbano en bicicleta de montaña.",
    labels: { sound: "Sonido", play: "Reproducir", pause: "Pausar", language: "Idioma" },
  },
} satisfies Record<Locale, { filmLabel: string; labels: Record<string, string> }>;

export const heroContent = (lang: Locale) => ({
  studio: "free lost",
  name: "Guillem Salvador",
  role: "Filmmaker",
  // Sin eslogan: Guillem lo quiere más adelante, descubierto en el scroll (bloque `slogan`).
  film: {
    label: text[lang].filmLabel,
    poster: imageUrl("downurban-poster.jpg", 1920),
    sources: [
      { src: videoUrl("downurban-720.mp4"), media: "(max-width: 960px)" },
      { src: videoUrl("downurban-1080.mp4") },
    ],
  },
  labels: text[lang].labels,
  // Selector de idioma: rutas estáticas, una por idioma.
  languages: locales.map((code) => ({ code, label: localeNames[code], href: `/${code}`, current: code === lang })),
});
