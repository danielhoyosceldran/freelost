import { SLOGAN, sloganLang } from "@/content/brand";
import { locales, localeNames, type Locale } from "@/content/locales";
import { imageUrl, videoUrl } from "@/lib/media";
import { wordArt } from "@/content/words";

// El rótulo y el eslogan, dibujados (ver content/words.ts). El eslogan va en dos líneas de largo
// parecido: en una sola, las letras serían demasiado bajas para enseñar plano. Cada palabra del
// eslogan que también está en el rótulo lleva `from`: es la que se convierte en ella.
const norm = (w: string) => w.replace(/[^\p{L}]/gu, "").toLowerCase();
const STUDIO_ART = ["FREE", "LOST"].map((w) => wordArt(`${w}-hero.svg`, w));
const SLOGAN_ART = [
  ["Feel", "free"],
  ["to", "get", "lost."],
].map((line) =>
  line.map((w) => {
    const from = STUDIO_ART.findIndex((t) => norm(t.text) === norm(w));
    return { ...wordArt(`${w}-slogan.svg`, w), ...(from >= 0 && { from }) };
  }),
);

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
    labels: { sound: "Sound", play: "Play", pause: "Pause", language: "Language", scroll: "Scroll" },
  },
  ca: {
    filmLabel: "Pel·lícula de free lost: descens urbà en bicicleta de muntanya.",
    labels: { sound: "So", play: "Reproduir", pause: "Pausar", language: "Idioma", scroll: "Desplaça" },
  },
  es: {
    filmLabel: "Película de free lost: descenso urbano en bicicleta de montaña.",
    labels: { sound: "Sonido", play: "Reproducir", pause: "Pausar", language: "Idioma", scroll: "Desplaza" },
  },
} satisfies Record<Locale, { filmLabel: string; labels: Record<string, string> }>;

export const heroContent = (lang: Locale) => ({
  studio: "free lost",
  name: "Guillem Salvador",
  role: "Filmmaker",
  // El rótulo dibujado, una palabra por línea.
  studioArt: STUDIO_ART,
  // No en la primera pantalla: aparece con el scroll, en papel, y se queda sobre tinta cuando la película se va.
  slogan: { text: SLOGAN, lang: sloganLang(lang), lines: SLOGAN_ART },
  film: {
    label: text[lang].filmLabel,
    // A prueba: Lofoten desde Vimeo (sin su interfaz). Quitando `vimeo` vuelve Down Urban en MP4;
    // entonces el póster vuelve a ser downurban-poster.jpg.
    poster: imageUrl("films/lofoten.jpg", 1920),
    vimeo: { id: "1234445182" },
    sources: [
      { src: videoUrl("downurban-720.mp4"), media: "(max-width: 960px)" },
      { src: videoUrl("downurban-1080.mp4") },
    ],
  },
  labels: text[lang].labels,
  // Selector de idioma: rutas estáticas, una por idioma.
  languages: locales.map((code) => ({ code, label: localeNames[code], href: `/${code}`, current: code === lang })),
});
