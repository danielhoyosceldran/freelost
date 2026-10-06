import { locales, localeNames, type Locale } from "@/content/locales";

// Primera pantalla de la home. Película: FL1 (public/media/videos/bici/FL1 insta.mp4),
// transcodificada a public/media/web/ sin las pausas en negro del arranque (0–13 s) ni el cartón
// del logo del final (desde 106,8 s). En local por ahora; más adelante, Vimeo.
const text = {
  en: {
    filmLabel: "free lost film: road cycling and running.",
    labels: { sound: "Sound", play: "Play", pause: "Pause", language: "Language" },
  },
  ca: {
    filmLabel: "Pel·lícula de free lost: ciclisme i cursa a peu per carretera.",
    labels: { sound: "So", play: "Reproduir", pause: "Pausar", language: "Idioma" },
  },
  es: {
    filmLabel: "Película de free lost: ciclismo y carrera a pie en carretera.",
    labels: { sound: "Sonido", play: "Reproducir", pause: "Pausar", language: "Idioma" },
  },
} satisfies Record<Locale, { filmLabel: string; labels: Record<string, string> }>;

export const heroContent = (lang: Locale) => ({
  studio: "free lost",
  name: "Guillem Salvador",
  role: "Filmmaker",
  slogan: "Feel free to get lost.",
  // El eslogan es inglés en los tres idiomas; solo hay que marcarlo en las páginas que no lo son.
  sloganLang: lang === "en" ? undefined : "en",
  film: {
    label: text[lang].filmLabel,
    poster: "/media/web/fl1-poster.jpg",
    sources: [
      { src: "/media/web/fl1-720.mp4", media: "(max-width: 960px)" },
      { src: "/media/web/fl1-1080.mp4" },
    ],
  },
  labels: text[lang].labels,
  // Selector de idioma: rutas estáticas, una por idioma.
  languages: locales.map((code) => ({ code, label: localeNames[code], href: `/${code}`, current: code === lang })),
});
