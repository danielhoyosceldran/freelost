import { SLOGAN, sloganLang } from "@/content/brand";
import type { Locale } from "@/content/locales";
import { wordArt } from "@/content/words";

// «The mission»: el cierre antes del contacto. Una frase y el eslogan dibujado, el mismo de la
// salida del hero (public/media/words/*-slogan.svg), así que la página acaba donde empezó. La frase
// es de la web actual de Guillem (free-lost.com); ca/es, traducción nuestra.
const statement: Record<Locale, string> = {
  en: "Life is not something to simply pass through.",
  ca: "La vida no és una cosa per on simplement passar.",
  es: "La vida no es algo por lo que simplemente pasar.",
};

const title: Record<Locale, string> = { en: "The mission", ca: "La missió", es: "La misión" };

/**
 * Composición del eslogan en las unidades de sus SVG (exportados a cuerpo 100). Los mismos valores
 * que el hero: 0,24em entre palabras y 0,92em entre líneas base. Cada línea se centra sobre el
 * ancho de la más larga. Se calcula en el build: al cliente llegan solo los `d` y sus posiciones.
 */
const WORD_GAP = 24;
const LEADING = 92;

function sloganArt() {
  const lines = [
    ["Feel", "free"],
    ["to", "get", "lost."],
  ].map((line) => {
    let x = 0;
    const words = line.map((w) => {
      const art = wordArt(`${w}-slogan.svg`, w);
      const word = { letters: art.letters, x: x - art.box[0], y: -art.baseline };
      x += art.box[2] + WORD_GAP;
      return { word, art };
    });
    const top = Math.min(...words.map(({ art }) => art.box[1] - art.baseline));
    const bottom = Math.max(...words.map(({ art }) => art.box[1] + art.box[3] - art.baseline));
    return { words: words.map((w) => w.word), width: x - WORD_GAP, top, bottom };
  });
  const width = Math.max(...lines.map((l) => l.width));
  return {
    lines: lines.map((l, i) => ({
      // Cada línea es su propio <svg> (su máscara sube aparte): caja propia, base en y = 0.
      box: [-(width - l.width) / 2, l.top, width, l.bottom - l.top] as [number, number, number, number],
      words: l.words,
      // Lo que sobra entre líneas base una vez restado el alto de cada caja, para el margen.
      gap: i === 0 ? 0 : LEADING - (lines[i - 1].bottom - l.top),
    })),
  };
}

const SLOGAN_ART = sloganArt();

export const missionContent = (lang: Locale) => ({
  anchor: "mission",
  title: title[lang],
  statement: statement[lang],
  slogan: { text: SLOGAN, lang: sloganLang(lang), lines: SLOGAN_ART.lines },
});
