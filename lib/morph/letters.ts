import { area, bounds, contours, resample, type Bounds, type Pt } from "./path";

// Morph de una palabra en otra, letra a letra: F→f, R→r… Cada letra se reduce a anillos (el
// contorno de fuera y sus huecos) con el mismo número de puntos en las dos formas, y el cliente solo
// interpola. Lo caro (emparejar huecos y girar los anillos para que los puntos se correspondan) se
// hace una vez.

/** Puntos por anillo: el de fuera necesita más, porque es el que se ve grande al principio. */
const N_OUTER = 256;
const N_HOLE = 96;

/** Un anillo en sus dos formas, como x,y seguidos, en coordenadas de palabra normalizadas. */
export type RingPair = { a: Float32Array; b: Float32Array };
/** Caja de la palabra en sus unidades: centro y tamaño (raíz del área: vale para cualquier aspecto). */
export type WordFrame = { cx: number; cy: number; size: number };

type Letter = { outer: Pt[]; holes: Pt[][]; box: Bounds };

function letter(d: string): Letter | null {
  const rings = contours(d).filter((r) => Math.abs(area(r)) > 1e-3);
  if (!rings.length) return null;
  rings.sort((p, q) => Math.abs(area(q)) - Math.abs(area(p)));
  // Fuera en un sentido y huecos en el contrario: con nonzero los huecos siguen siéndolo a mitad
  // de camino, aunque los contornos se crucen un momento.
  const orient = (r: Pt[], sign: number) => (Math.sign(area(r)) === sign ? r : [...r].reverse());
  const [outer, ...holes] = rings;
  return { outer: orient(outer, 1), holes: holes.map((h) => orient(h, -1)), box: bounds([outer]) };
}

const centroid = (r: Pt[]): Pt => {
  let [x, y] = [0, 0];
  for (const p of r) [x, y] = [x + p[0], y + p[1]];
  return [x / r.length, y / r.length];
};
/** Un punto en la caja de la letra, de 0 a 1. */
const unit = (p: Pt, b: Bounds): Pt => [(p[0] - b.x) / (b.w || 1), (p[1] - b.y) / (b.h || 1)];
const fromUnit = (u: Pt, b: Bounds): Pt => [b.x + u[0] * b.w, b.y + u[1] * b.h];

/**
 * Gira `b` (cambia el punto por el que empieza) para que cada punto caiga lo más cerca posible de
 * su pareja en `a`, comparando las dos letras dentro de su propia caja: la F y la f se parecen en
 * proporción, no en posición ni en tamaño.
 */
function align(a: Pt[], ba: Bounds, b: Pt[], bb: Bounds): Pt[] {
  const ua = a.map((p) => unit(p, ba));
  const ub = b.map((p) => unit(p, bb));
  const n = a.length;
  let best = 0;
  let bestD = Infinity;
  for (let s = 0; s < n; s++) {
    let d = 0;
    for (let k = 0; k < n && d < bestD; k++) {
      const [p, q] = [ua[k], ub[(k + s) % n]];
      d += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    }
    if (d < bestD) [bestD, best] = [d, s];
  }
  return b.map((_, k) => b[(k + best) % n]);
}

const flat = (r: Pt[], f: WordFrame) => {
  const out = new Float32Array(r.length * 2);
  r.forEach(([x, y], k) => {
    out[2 * k] = (x - f.cx) / f.size;
    out[2 * k + 1] = (y - f.cy) / f.size;
  });
  return out;
};
const point = (p: Pt, n: number): Pt[] => Array.from({ length: n }, () => p);

/** Los anillos emparejados de una letra con la suya. Un hueco sin pareja nace o muere en un punto. */
function pairLetter(a: Letter, fa: WordFrame, b: Letter, fb: WordFrame): RingPair[] {
  const oa = resample(a.outer, N_OUTER);
  const ob = align(oa, a.box, resample(b.outer, N_OUTER), b.box);
  const rings: RingPair[] = [{ a: flat(oa, fa), b: flat(ob, fb) }];

  // Huecos: cada uno con el más cercano (en proporción de la letra) de los que quedan libres.
  const free = new Set(b.holes.keys());
  for (const h of a.holes) {
    const uc = unit(centroid(h), a.box);
    let pick = -1;
    let pickD = Infinity;
    for (const j of free) {
      const v = unit(centroid(b.holes[j]), b.box);
      const d = (uc[0] - v[0]) ** 2 + (uc[1] - v[1]) ** 2;
      if (d < pickD) [pickD, pick] = [d, j];
    }
    const ha = resample(h, N_HOLE);
    if (pick < 0) {
      rings.push({ a: flat(ha, fa), b: flat(point(fromUnit(uc, b.box), N_HOLE), fb) });
      continue;
    }
    free.delete(pick);
    const hb = align(ha, bounds([h]), resample(b.holes[pick], N_HOLE), bounds([b.holes[pick]]));
    rings.push({ a: flat(ha, fa), b: flat(hb, fb) });
  }
  for (const j of free) {
    const hb = resample(b.holes[j], N_HOLE);
    const uc = unit(centroid(b.holes[j]), b.box);
    rings.push({ a: flat(point(fromUnit(uc, a.box), N_HOLE), fa), b: flat(hb, fb) });
  }
  return rings;
}

/** Una letra que solo está en un lado (el punto de «lost.»): crece desde su centro, o se apaga en él. */
function lone(l: Letter, f: WordFrame, side: "a" | "b"): RingPair[] {
  return [l.outer, ...l.holes].map((r, k) => {
    const n = k === 0 ? N_OUTER : N_HOLE;
    const shape = flat(resample(r, n), f);
    const c = centroid(l.outer);
    const dot = flat(point(c, n), f);
    return side === "a" ? { a: shape, b: dot } : { a: dot, b: shape };
  });
}

/**
 * Las letras de `a` convertidas en las de `b`, por orden. Cada palabra en sus propias unidades y
 * normalizada con su caja, para que el cliente las coloque donde estén en pantalla.
 */
export function morphWord(a: { letters: string[]; frame: WordFrame }, b: { letters: string[]; frame: WordFrame }) {
  const la = a.letters.map(letter);
  const lb = b.letters.map(letter);
  const out: RingPair[][] = [];
  for (let k = 0; k < Math.max(la.length, lb.length); k++) {
    const [x, y] = [la[k], lb[k]];
    if (x && y) out.push(pairLetter(x, a.frame, y, b.frame));
    else if (x) out.push(lone(x, a.frame, "a"));
    else if (y) out.push(lone(y, b.frame, "b"));
  }
  return out;
}
