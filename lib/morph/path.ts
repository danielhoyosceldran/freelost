// Geometría de contornos para el morph de letras: lee los `d` que exporta Figma (M L H V C Q Z,
// absolutos o relativos), los aplana a polilíneas y los remuestrea a un número fijo de puntos, que
// es lo que hace falta para interpolar una letra en otra. Sin zod ni DOM: corre en el build
// (content/) y en el cliente.

export type Pt = [number, number];
export type Bounds = { x: number; y: number; w: number; h: number };

const TOKEN = /[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g;

/** Los subtrayectos de `d` como polilíneas cerradas (sin repetir el primer punto al final). */
export function contours(d: string, steps = 16): Pt[][] {
  const tokens = d.match(TOKEN) ?? [];
  const rings: Pt[][] = [];
  let ring: Pt[] = [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let cmd = "";
  let i = 0;
  const num = () => Number(tokens[i++]);
  const close = () => {
    const [f, l] = [ring[0], ring.at(-1)];
    if (ring.length > 1 && Math.hypot(f[0] - l![0], f[1] - l![1]) < 1e-6) ring.pop();
    if (ring.length > 2) rings.push(ring);
    ring = [];
  };
  const curve = (pts: Pt[]) => {
    // Bézier de grado 2 o 3 por De Casteljau, a pasos fijos: el remuestreo iguala después.
    for (let s = 1; s <= steps; s++) {
      let q = pts;
      const t = s / steps;
      while (q.length > 1) q = q.slice(1).map((p, k) => [q[k][0] + (p[0] - q[k][0]) * t, q[k][1] + (p[1] - q[k][1]) * t]);
      ring.push(q[0]);
    }
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd !== cmd.toUpperCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M":
        close();
        x = ox + num();
        y = oy + num();
        [sx, sy] = [x, y];
        ring.push([x, y]);
        // Los pares que siguen a una M son líneas.
        cmd = rel ? "l" : "L";
        break;
      case "L":
        x = ox + num();
        y = oy + num();
        ring.push([x, y]);
        break;
      case "H":
        x = ox + num();
        ring.push([x, y]);
        break;
      case "V":
        y = oy + num();
        ring.push([x, y]);
        break;
      case "C": {
        const p1: Pt = [ox + num(), oy + num()];
        const p2: Pt = [ox + num(), oy + num()];
        const p3: Pt = [ox + num(), oy + num()];
        curve([[x, y], p1, p2, p3]);
        [x, y] = p3;
        break;
      }
      case "Q": {
        const p1: Pt = [ox + num(), oy + num()];
        const p2: Pt = [ox + num(), oy + num()];
        curve([[x, y], p1, p2]);
        [x, y] = p2;
        break;
      }
      case "Z":
        [x, y] = [sx, sy];
        close();
        break;
      default:
        // Comando que Figma no saca (arcos, S, T): se salta su número.
        i++;
    }
  }
  close();
  return rings;
}

/** Área con signo (positiva en sentido horario con la y hacia abajo). */
export function area(r: Pt[]) {
  let a = 0;
  for (let k = 0; k < r.length; k++) {
    const [p, q] = [r[k], r[(k + 1) % r.length]];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

export function bounds(rings: Pt[][]): Bounds {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of rings)
    for (const [x, y] of r) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** `n` puntos a la misma distancia a lo largo del contorno cerrado. */
export function resample(r: Pt[], n: number): Pt[] {
  const len = [0];
  for (let k = 1; k <= r.length; k++) {
    const [p, q] = [r[k - 1], r[k % r.length]];
    len.push(len[k - 1] + Math.hypot(q[0] - p[0], q[1] - p[1]));
  }
  const total = len[r.length];
  const out: Pt[] = [];
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const d = (k / n) * total;
    while (len[seg + 1] < d) seg++;
    const [p, q] = [r[seg], r[(seg + 1) % r.length]];
    const t = (d - len[seg]) / (len[seg + 1] - len[seg] || 1);
    out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
  }
  return out;
}
