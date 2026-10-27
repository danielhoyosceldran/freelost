import { sloganLang } from "@/content/brand";
import type { Locale } from "@/content/locales";

// «The mission»: el cierre antes del contacto. Una frase y el eslogan, citado: es la última palabra
// de la página antes de escribir a Guillem. La frase es de la web actual de Guillem
// (free-lost.com); ca/es, traducción nuestra.
const statement: Record<Locale, string> = {
  en: "Life is not something to simply pass through.",
  ca: "La vida no és una cosa per on simplement passar.",
  es: "La vida no es algo por lo que simplemente pasar.",
};

const title: Record<Locale, string> = { en: "The mission", ca: "La missió", es: "La misión" };

/** El eslogan (content/brand.ts) en dos líneas de largo parecido. */
const SLOGAN_LINES = ["Feel free", "to get lost."];

export const missionContent = (lang: Locale) => ({
  anchor: "mission",
  title: title[lang],
  statement: statement[lang],
  slogan: { lang: sloganLang(lang), lines: SLOGAN_LINES },
});
