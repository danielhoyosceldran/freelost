import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bounds, contours } from "@/lib/morph/path";

// Palabras dibujadas: el rótulo del hero (Druk Wide) y el eslogan (Instrument Serif cursiva),
// exportadas a contornos desde Figma en public/media/words, un fichero por palabra y una <path> por
// letra. Se leen en el build y viajan como props: así el morph del hero va letra a letra con las
// formas reales, sin cargar ninguna de las dos fuentes. Si cambia una palabra, basta con
// sustituir su SVG.

export type WordArt = {
  text: string;
  /** Una `d` por letra, de izquierda a derecha. */
  letters: string[];
  /** Caja de todas las letras, en las unidades del SVG: [x, y, ancho, alto]. */
  box: [number, number, number, number];
  /** Línea base: el pie más alto de las letras (las redondas y los descendentes bajan más). */
  baseline: number;
  /** Altura de mayúscula: la cabeza más baja de las letras (las redondas rebasan por arriba). */
  capTop: number;
};

export function wordArt(file: string, text: string): WordArt {
  const svg = readFileSync(join(process.cwd(), "public/media/words", file), "utf8");
  const letters = [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)]
    .map((m) => ({ d: m[1], b: bounds(contours(m[1])) }))
    // Figma no las guarda en orden de lectura.
    .sort((p, q) => p.b.x - q.b.x);
  if (!letters.length) throw new Error(`${file}: sin <path>`);
  const all = letters.map((l) => l.b);
  const x0 = Math.min(...all.map((b) => b.x));
  const y0 = Math.min(...all.map((b) => b.y));
  const x1 = Math.max(...all.map((b) => b.x + b.w));
  const y1 = Math.max(...all.map((b) => b.y + b.h));
  return {
    text,
    letters: letters.map((l) => l.d),
    box: [x0, y0, x1 - x0, y1 - y0],
    baseline: Math.min(...all.map((b) => b.y + b.h)),
    capTop: Math.max(...all.map((b) => b.y)),
  };
}
