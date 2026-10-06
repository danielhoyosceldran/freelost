export const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
export const easeOutQuint = (v: number) => 1 - Math.pow(1 - clamp01(v), 5);
export const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
export const easeInOut = (v: number) => {
  const t = clamp01(v);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const pad2 = (n: number) => String(n).padStart(2, "0");
export const easeIn = (v: number) => Math.pow(clamp01(v), 2.2);
/** Progreso 0→1 de p dentro del tramo [a, b]: 0 antes de a y 1 después de b. */
export const segment = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
