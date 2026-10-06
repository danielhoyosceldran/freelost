/*
 * Campo de distancias con signo (SDF) de cada objeto del equipo, en una rejilla común. Es lo que
 * hace posible el morph: interpolar dos SDF da una forma intermedia de verdad (se funde, se abre
 * y se cierra), cosa que no se puede hacer entre mallas con topologías distintas.
 *
 * Va en un worker porque son ~1,5 M de vóxeles por objeto: en el hilo principal sería un tirón
 * de medio segundo justo cuando la sección se está calentando.
 *
 * Por cada objeto:
 *  1. Superficie: se marcan los vóxeles que tocan los triángulos, muestreándolos a menos de medio
 *     vóxel. Así las piezas finas (palas, tapa del portátil) quedan con al menos un vóxel.
 *  2. Interior: relleno desde el borde de la rejilla por lo que no es superficie. Lo que no se
 *     alcanza es sólido. No depende de que las piezas sean cerradas ni de cómo se solapan.
 *  3. Distancias: transformada de distancia euclídea exacta (Felzenszwalb) hacia fuera y hacia
 *     dentro, combinadas con signo.
 *  4. Suavizado ligero para quitar la escalera de los vóxeles.
 *
 * Todo vive dentro de sdfWorkerMain: GearMorph lo convierte en texto y lo arranca como worker desde
 * un Blob (Turbopack copia un `new Worker(new URL(...))` como fichero .ts sin compilar). Por eso
 * la función no puede usar nada de fuera de su propio cuerpo.
 *
 * Salida: una textura 3D RGBA en half float, un objeto por canal (hasta 4), en unidades del
 * mundo del motor.
 */

import type { SdfRequest, SdfResponse } from "./sdfTypes";

export function sdfWorkerMain() {
  const INF = 1e20;

  self.onmessage = (e: MessageEvent<SdfRequest>) => {
    const { models, min, h, dims } = e.data;
    const [nx, ny, nz] = dims;
    const n = nx * ny * nz;
    const out = new Uint16Array(n * 4);
    // Canales sin objeto: "lejos", para que pesen 0 sin crear superficie.
    const far = toHalf(1000);
    for (let i = 0; i < n; i++) for (let c = models.length; c < 4; c++) out[i * 4 + c] = far;
    models.forEach((tris, c) => {
      const sdf = buildSdf(tris, min, h, dims);
      for (let i = 0; i < n; i++) out[i * 4 + c] = toHalf(sdf[i]);
    });
    (self as unknown as Worker).postMessage({ data: out } satisfies SdfResponse, [out.buffer]);
  };

  function buildSdf(tris: Float32Array, min: number[], h: number, [nx, ny, nz]: number[]) {
    const n = nx * ny * nz;
    const sx = 1,
      sy = nx,
      sz = nx * ny;
    // 0 = sin decidir, 1 = superficie, 2 = fuera
    const state = new Uint8Array(n);

    // ---------- 1. Superficie ----------
    const mark = (x: number, y: number, z: number) => {
      const ix = Math.floor(x),
        iy = Math.floor(y),
        iz = Math.floor(z);
      if (ix < 0 || iy < 0 || iz < 0 || ix >= nx || iy >= ny || iz >= nz) return;
      state[ix + iy * sy + iz * sz] = 1;
    };
    for (let t = 0; t < tris.length; t += 9) {
      const ax = (tris[t] - min[0]) / h,
        ay = (tris[t + 1] - min[1]) / h,
        az = (tris[t + 2] - min[2]) / h;
      const ux = (tris[t + 3] - min[0]) / h - ax,
        uy = (tris[t + 4] - min[1]) / h - ay,
        uz = (tris[t + 5] - min[2]) / h - az;
      const vx = (tris[t + 6] - min[0]) / h - ax,
        vy = (tris[t + 7] - min[1]) / h - ay,
        vz = (tris[t + 8] - min[2]) / h - az;
      const len = Math.max(Math.hypot(ux, uy, uz), Math.hypot(vx, vy, vz), Math.hypot(vx - ux, vy - uy, vz - uz));
      const k = Math.max(1, Math.ceil(len * 2.5));
      for (let i = 0; i <= k; i++) {
        for (let j = 0; i + j <= k; j++) {
          const a = i / k,
            b = j / k;
          mark(ax + ux * a + vx * b, ay + uy * a + vy * b, az + uz * a + vz * b);
        }
      }
    }

    // ---------- 2. Fuera: relleno 6-conexo desde el borde ----------
    const queue = new Int32Array(n);
    let head = 0,
      tail = 0;
    const seed = (i: number) => {
      if (state[i] === 0) {
        state[i] = 2;
        queue[tail++] = i;
      }
    };
    for (let z = 0; z < nz; z++)
      for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++) {
          if (x === 0 || y === 0 || z === 0 || x === nx - 1 || y === ny - 1 || z === nz - 1) seed(x + y * sy + z * sz);
        }
    while (head < tail) {
      const i = queue[head++];
      const x = i % nx,
        y = Math.floor(i / sy) % ny,
        z = Math.floor(i / sz);
      if (x > 0) seed(i - sx);
      if (x < nx - 1) seed(i + sx);
      if (y > 0) seed(i - sy);
      if (y < ny - 1) seed(i + sy);
      if (z > 0) seed(i - sz);
      if (z < nz - 1) seed(i + sz);
    }

    // ---------- 3. Distancias con signo ----------
    const dOut = new Float32Array(n);
    const dIn = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const outside = state[i] === 2;
      dOut[i] = outside ? INF : 0; // distancia de cada vóxel de fuera al sólido
      dIn[i] = outside ? 0 : INF; // y de cada vóxel sólido al exterior
    }
    edt3(dOut, nx, ny, nz);
    edt3(dIn, nx, ny, nz);
    let sdf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // La superficie queda a medio vóxel entre el último sólido y el primero de fuera.
      sdf[i] = (state[i] === 2 ? Math.sqrt(dOut[i]) - 0.5 : 0.5 - Math.sqrt(dIn[i])) * h;
    }

    // ---------- 4. Suavizado [1 2 1] por eje, dos veces ----------
    let tmp = new Float32Array(n);
    for (let pass = 0; pass < 2; pass++) {
      for (const [stride, size] of [
        [sx, nx],
        [sy, ny],
        [sz, nz],
      ]) {
        for (let i = 0; i < n; i++) {
          const c = Math.floor(i / stride) % size;
          const a = c > 0 ? sdf[i - stride] : sdf[i];
          const b = c < size - 1 ? sdf[i + stride] : sdf[i];
          tmp[i] = (a + 2 * sdf[i] + b) * 0.25;
        }
        [sdf, tmp] = [tmp, sdf];
      }
    }
    return sdf;
  }

  // Transformada de distancia euclídea al cuadrado, separable (Felzenszwalb & Huttenlocher).
  function edt3(g: Float32Array, nx: number, ny: number, nz: number) {
    const m = Math.max(nx, ny, nz);
    const f = new Float32Array(m),
      d = new Float32Array(m),
      v = new Int32Array(m),
      z = new Float32Array(m + 1);
    const run = (start: number, stride: number, len: number) => {
      for (let i = 0; i < len; i++) f[i] = g[start + i * stride];
      edt1(f, len, d, v, z);
      for (let i = 0; i < len; i++) g[start + i * stride] = d[i];
    };
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) run(j * nx + k * nx * ny, 1, nx);
    for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) run(i + k * nx * ny, nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) run(i + j * nx, nx * ny, nz);
  }

  function edt1(f: Float32Array, n: number, d: Float32Array, v: Int32Array, z: Float32Array) {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  }

  // float32 → float16 (lo que espera una textura HalfFloatType).
  const f32 = new Float32Array(1);
  const u32 = new Uint32Array(f32.buffer);
  function toHalf(val: number) {
    f32[0] = val;
    const x = u32[0];
    const sign = (x >> 16) & 0x8000;
    const exp = ((x >> 23) & 0xff) - 127 + 15;
    const mant = x & 0x7fffff;
    if (exp <= 0) return sign;
    if (exp >= 31) return sign | 0x7bff;
    return sign | (exp << 10) | (mant >> 13);
  }
}
