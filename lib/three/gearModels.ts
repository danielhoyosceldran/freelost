import * as THREE from "three";

/*
 * Los tres objetos de "Lo que uso", modelados por código (sin GLB): una mirrorless, un dron
 * plegable y un portátil de 14″. Salen de la maqueta "Metamorfosis Técnica". No son productos
 * concretos sino arquetipos de cada categoría; el material los pinta negros con brillo de borde y
 * el contorno lo dibuja un pase aparte (ver GearMorph), así que importa la silueta y el detalle de
 * las aristas, no la textura.
 *
 * Cada constructor añade piezas a un grupo con un Builder, que lleva el material activo y la
 * cuenta de triángulos.
 */

export type GearModelKey = "camera" | "drone" | "laptop";

export interface Builder {
  part(geo: THREE.BufferGeometry, opts?: PartOpts): THREE.Mesh;
  tris: number;
}

interface PartOpts {
  pos?: [number, number, number];
  rot?: [number, number, number];
  /** Ángulo (grados) a partir del cual una arista es dura; por debajo, la normal se suaviza. */
  crease?: number;
  parent?: THREE.Object3D;
}

export function makeBuilder(group: THREE.Object3D, mat: THREE.Material): Builder {
  const b: Builder = {
    tris: 0,
    part(geo, opts = {}) {
      const g = crease(geo, opts.crease || 35);
      const m = new THREE.Mesh(g, mat);
      if (opts.pos) m.position.set(...opts.pos);
      if (opts.rot) m.rotation.set(...opts.rot);
      b.tris += g.attributes.position.count / 3;
      (opts.parent ?? group).add(m);
      return m;
    },
  };
  return b;
}

/** Tamaño (dimensión mayor) al que se normaliza cada modelo. El dron es plano y la cámara y el
 * portátil son macizos: a igual dimensión mayor parecen más grandes, así que van por debajo. */
export const GEAR_MODELS: Record<GearModelKey, { size: number; build: (g: THREE.Group, b: Builder) => void }> = {
  camera: { size: 3.7, build: buildCamera },
  drone: { size: 4.5, build: buildDrone },
  laptop: { size: 3.8, build: buildLaptop },
};

// ---------- Geometría auxiliar ----------

// Normales "con pliegue": suaves en superficies curvas, duras en aristas de más de `deg` grados.
// Sin esto el brillo de borde se lee como facetas en los cilindros o como bultos en las cajas.
function crease(geo: THREE.BufferGeometry, deg: number) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  const count = pos.count;
  const fn = new Float32Array(count * 3);
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  const ab = new THREE.Vector3(),
    cb = new THREE.Vector3();
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    cb.subVectors(c, b);
    ab.subVectors(a, b);
    cb.cross(ab);
    const len = cb.length() || 1;
    cb.divideScalar(len);
    for (let k = 0; k < 3; k++) {
      fn[(i + k) * 3] = cb.x;
      fn[(i + k) * 3 + 1] = cb.y;
      fn[(i + k) * 3 + 2] = cb.z;
    }
  }
  const map = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    const key =
      Math.round(pos.getX(i) * 1e4) + "_" + Math.round(pos.getY(i) * 1e4) + "_" + Math.round(pos.getZ(i) * 1e4);
    let list = map.get(key);
    if (!list) map.set(key, (list = []));
    list.push(i);
  }
  const cos = Math.cos((deg * Math.PI) / 180);
  const out = new Float32Array(count * 3);
  map.forEach((list) => {
    for (const i of list) {
      const nx = fn[i * 3],
        ny = fn[i * 3 + 1],
        nz = fn[i * 3 + 2];
      let sx = 0,
        sy = 0,
        sz = 0;
      for (const j of list) {
        const mx = fn[j * 3],
          my = fn[j * 3 + 1],
          mz = fn[j * 3 + 2];
        if (nx * mx + ny * my + nz * mz >= cos) {
          sx += mx;
          sy += my;
          sz += mz;
        }
      }
      const l = Math.hypot(sx, sy, sz) || 1;
      out[i * 3] = sx / l;
      out[i * 3 + 1] = sy / l;
      out[i * 3 + 2] = sz / l;
    }
  });
  g.setAttribute("normal", new THREE.BufferAttribute(out, 3));
  return g;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2,
    y = -h / 2;
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function roundedBox(w: number, h: number, d: number, r: number, bevel: number, segs = 5) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(w, h, r), {
    depth: d,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segs,
    curveSegments: 10,
  });
  geo.center();
  return geo;
}

const SEG = 56;
const cylY = (r: number, h: number, seg = SEG, r2?: number) => new THREE.CylinderGeometry(r2 ?? r, r, h, seg);
const cylZ = (r: number, h: number, seg = 40) => new THREE.CylinderGeometry(r, r, h, seg).rotateX(Math.PI / 2);
const cylX = (r: number, h: number, seg = 32) => new THREE.CylinderGeometry(r, r, h, seg).rotateZ(Math.PI / 2);

interface Section {
  z: number;
  hw: number;
  /** Semiancho en el suelo, si difiere del de arriba (sección trapezoidal). */
  hwb?: number;
  top: number;
  bot: number;
  x?: number;
}

// Superficie "lofteada": secciones superelípticas (exponente n) a lo largo de Z, con tapas.
function loft(secs: Section[], seg = 48, n = 3) {
  const pos: number[] = [],
    idx: number[] = [];
  for (const s of secs) {
    const yc = (s.top + s.bot) / 2,
      hh = (s.top - s.bot) / 2,
      xc = s.x || 0;
    for (let k = 0; k < seg; k++) {
      const t = (k / seg) * Math.PI * 2;
      const c = Math.cos(t),
        sn = Math.sin(t);
      const ex = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const ey = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      const hw = s.hwb != null ? s.hwb + ((s.hw - s.hwb) * (ey + 1)) / 2 : s.hw;
      pos.push(xc + ex * hw, yc + ey * hh, s.z);
    }
  }
  for (let i = 0; i < secs.length - 1; i++) {
    for (let k = 0; k < seg; k++) {
      const a = i * seg + k,
        b = i * seg + ((k + 1) % seg),
        c = (i + 1) * seg + k,
        d = (i + 1) * seg + ((k + 1) % seg);
      idx.push(a, b, c, b, d, c);
    }
  }
  for (const [si, end] of [
    [0, false],
    [secs.length - 1, true],
  ] as const) {
    const s = secs[si];
    const ci = pos.length / 3;
    pos.push(s.x || 0, (s.top + s.bot) / 2, s.z);
    for (let k = 0; k < seg; k++) {
      const a = si * seg + k,
        b = si * seg + ((k + 1) % seg);
      if (end) idx.push(ci, a, b);
      else idx.push(ci, b, a);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** Orienta una geometría construida a lo largo de +Z para que vaya de `a` a `b`. */
function alongAB(geo: THREE.BufferGeometry, a: number[], b: number[], up = new THREE.Vector3(0, 1, 0)) {
  const A = new THREE.Vector3().fromArray(a),
    B = new THREE.Vector3().fromArray(b);
  const m = new THREE.Matrix4().lookAt(B, A, up);
  m.setPosition(A);
  return geo.applyMatrix4(m);
}

// =====================================================================
// MIRRORLESS
// =====================================================================
function buildCamera(G: THREE.Group, { part }: Builder) {
  const cam = new THREE.Group();
  G.add(cam);
  const P = (geo: THREE.BufferGeometry, opts: PartOpts = {}) => part(geo, { parent: cam, ...opts });

  // ================= CUERPO =================
  P(roundedBox(3.7, 2.1, 0.75, 0.26, 0.1, 6));
  P(roundedBox(1.05, 2.05, 1.45, 0.46, 0.18, 7), { pos: [-1.5, -0.07, 0.42] });
  P(roundedBox(0.75, 1.6, 0.04, 0.3, 0.02, 3), { pos: [-1.5, -0.12, 1.33] });

  // Joroba del visor electrónico
  const evf = new THREE.Shape();
  evf.moveTo(-0.72, 0);
  evf.lineTo(0.72, 0);
  evf.lineTo(0.5, 0.55);
  evf.lineTo(-0.5, 0.55);
  evf.closePath();
  const evfGeo = new THREE.ExtrudeGeometry(evf, {
    depth: 0.95,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.07,
    bevelSegments: 6,
    curveSegments: 2,
  });
  evfGeo.center();
  P(evfGeo, { pos: [0.2, 1.5, -0.08] });

  // Ocular
  P(roundedBox(0.95, 0.62, 0.22, 0.2, 0.05, 5), { pos: [0.2, 1.36, -0.72] });
  P(roundedBox(0.62, 0.36, 0.08, 0.1, 0.02, 3), { pos: [0.2, 1.36, -0.9] });
  P(cylZ(0.04, 0.04, 20), { pos: [0.62, 1.36, -0.88] });

  // Zapata
  P(new THREE.BoxGeometry(0.62, 0.06, 0.55), { pos: [0.2, 1.86, -0.08] });
  P(new THREE.BoxGeometry(0.5, 0.05, 0.1), { pos: [0.2, 1.91, 0.1] });
  P(new THREE.BoxGeometry(0.5, 0.05, 0.1), { pos: [0.2, 1.91, -0.26] });
  // Micrófono estéreo integrado
  for (let i = 0; i < 5; i++) P(cylZ(0.025, 0.02, 16), { pos: [-0.05 + i * 0.12, 1.66, 0.43] });

  // Dial de modos con estrías y selector foto / vídeo / S&Q
  const dialPts: THREE.Vector2[] = [];
  const ribs = 48;
  for (let i = 0; i <= ribs * 2; i++) {
    const t = (i / (ribs * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 0.44 : 0.425;
    dialPts.push(new THREE.Vector2(Math.cos(t) * r, Math.sin(t) * r));
  }
  const dialGeo = new THREE.ExtrudeGeometry(new THREE.Shape(dialPts), {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  dialGeo.rotateX(-Math.PI / 2);
  P(dialGeo, { pos: [1.3, 1.27, -0.05] });
  P(cylY(0.4, 0.06, SEG, 0.37), { pos: [1.3, 1.51, -0.05] });
  P(cylY(0.52, 0.07), { pos: [1.3, 1.22, -0.05] });
  P(roundedBox(0.16, 0.04, 0.1, 0.03, 0.01, 2), { pos: [1.3, 1.22, 0.53], rot: [0, 0.2, 0] });
  P(cylY(0.1, 0.05, 32), { pos: [1.3, 1.56, -0.05] });

  // Disparador, palanca de encendido y diales
  P(cylY(0.3, 0.07), { pos: [-1.55, 1.13, 0.78], rot: [0.15, 0, 0] });
  P(cylY(0.21, 0.1, SEG, 0.19), { pos: [-1.55, 1.21, 0.79], rot: [0.15, 0, 0] });
  P(roundedBox(0.16, 0.03, 0.08, 0.03, 0.01, 2), { pos: [-1.2, 1.14, 1.0], rot: [0, -0.5, 0] });
  P(cylY(0.24, 0.1), { pos: [-1.55, 0.98, 1.2], rot: [0.5, 0, 0] });
  // REC
  P(cylY(0.16, 0.05), { pos: [-0.95, 1.21, 0.22] });
  P(cylY(0.1, 0.06, 40), { pos: [-0.95, 1.26, 0.22] });
  P(cylY(0.08, 0.06, 32), { pos: [-0.95, 1.22, -0.12] });
  P(cylY(0.08, 0.06, 32), { pos: [-0.6, 1.22, 0.1] });
  P(cylY(0.28, 0.1), { pos: [-1.35, 1.17, -0.38] });

  // ================= MONTURA Y OBJETIVO =================
  const lensX = 0.2,
    lensY = -0.1;
  P(cylZ(1.05, 0.08, 96), { pos: [lensX, lensY, 0.52] });
  P(cylZ(0.88, 0.04, 96), { pos: [lensX, lensY, 0.57] });

  const pts: [number, number][] = [
    [0.8, 0],
    [0.98, 0],
    [0.98, 0.1],
    [0.9, 0.12],
    [0.9, 0.3],
    [0.97, 0.36],
  ];
  const grooves = (r: number, y0: number, y1: number, n: number, depth: number) => {
    const step = (y1 - y0) / n;
    for (let i = 0; i < n; i++) {
      const y = y0 + i * step;
      pts.push([r, y + step * 0.1], [r, y + step * 0.6], [r - depth, y + step * 0.72], [r - depth, y + step * 0.88]);
    }
    pts.push([r, y1]);
  };
  grooves(0.97, 0.38, 1.08, 16, 0.025);
  pts.push([0.93, 1.12], [0.93, 1.3], [0.96, 1.33]);
  grooves(0.96, 1.35, 1.72, 10, 0.02);
  pts.push([0.94, 1.76], [0.94, 1.85], [1.0, 1.9], [1.02, 2.05], [1.02, 2.12]);
  pts.push([0.84, 2.12], [0.8, 2.0]);
  // Cristal frontal: curva suave
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    pts.push([0.8 * (1 - t), 2.0 + 0.11 * Math.sin((t * Math.PI) / 2)]);
  }
  const lensGeo = new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    96,
  );
  lensGeo.rotateX(Math.PI / 2);
  P(lensGeo, { pos: [lensX, lensY, 0.56], crease: 30 });

  P(roundedBox(0.06, 0.24, 0.12, 0.02, 0.01, 2), { pos: [lensX - 0.93, lensY + 0.15, 2.0] });
  P(roundedBox(0.06, 0.12, 0.12, 0.02, 0.01, 2), { pos: [lensX - 0.93, lensY - 0.2, 2.0] });

  // Frontal
  P(cylZ(0.13, 0.08), { pos: [1.42, -0.45, 0.52] });
  P(cylZ(0.08, 0.05, 24), { pos: [-0.85, 0.82, 0.5] });
  P(cylZ(0.05, 0.05, 20), { pos: [-0.85, 0.64, 0.5] });
  P(cylZ(0.07, 0.05, 24), { pos: [1.42, -0.85, 0.5] });

  // ================= TRASERA =================
  P(roundedBox(2.45, 1.5, 0.02, 0.1, 0.02, 3), { pos: [0.3, -0.18, -0.5] });
  P(cylZ(0.11, 0.08, 32), { pos: [-1.45, 0.55, -0.53] });
  P(cylZ(0.06, 0.12, 24), { pos: [-1.45, 0.55, -0.6] });
  P(cylZ(0.32, 0.07, 64), { pos: [-1.45, -0.45, -0.52] });
  P(cylZ(0.12, 0.09, 32), { pos: [-1.45, -0.45, -0.55] });
  P(cylZ(0.11, 0.07, 32), { pos: [-1.55, 0.92, -0.52] });
  P(cylZ(0.1, 0.07, 32), { pos: [-1.2, 0.92, -0.52] });
  for (const [x, y] of [
    [-1.25, 0.12],
    [-1.75, 0.12],
    [-1.25, -1.0],
    [-1.75, -1.0],
  ]) {
    P(roundedBox(0.16, 0.1, 0.03, 0.04, 0.015, 3), { pos: [x, y, -0.52] });
  }

  // ================= PANTALLA ABATIBLE (cerrada, display hacia fuera) =================
  const hinge = new THREE.Group();
  hinge.position.set(1.98, -0.18, -0.6);
  hinge.rotation.y = Math.PI;
  cam.add(hinge);
  part(cylY(0.08, 0.9, 32), { parent: hinge });
  part(cylY(0.1, 0.12, 32), { parent: hinge, pos: [0, 0.48, 0] });
  part(cylY(0.1, 0.12, 32), { parent: hinge, pos: [0, -0.48, 0] });
  const arm = new THREE.Group();
  arm.position.set(0.14, 0, 0);
  hinge.add(arm);
  part(roundedBox(0.22, 0.5, 0.12, 0.04, 0.01, 3), { parent: arm, pos: [0.05, 0, 0] });
  part(cylX(0.06, 0.3, 24), { parent: arm, pos: [0.2, 0, 0] });
  const screen = new THREE.Group();
  screen.position.set(0.32, 0, 0);
  arm.add(screen);
  part(roundedBox(2.4, 1.52, 0.1, 0.12, 0.04, 5), { parent: screen, pos: [1.25, 0, 0] });
  part(roundedBox(2.15, 1.3, 0.01, 0.06, 0.01, 2), { parent: screen, pos: [1.25, 0, 0.1] });
  part(new THREE.BoxGeometry(1.95, 1.12, 0.005), { parent: screen, pos: [1.25, 0, 0.12] });
  part(roundedBox(1.8, 1.0, 0.02, 0.1, 0.01, 2), { parent: screen, pos: [1.25, 0, -0.09] });

  // ================= LATERALES Y BASE =================
  P(roundedBox(0.03, 0.55, 0.3, 0.06, 0.02, 3), { pos: [2.07, 0.45, 0.12] });
  P(roundedBox(0.03, 0.55, 0.3, 0.06, 0.02, 3), { pos: [2.07, -0.25, 0.12] });
  P(roundedBox(0.03, 0.45, 0.3, 0.06, 0.02, 3), { pos: [2.07, -0.85, 0.12] });
  P(roundedBox(0.03, 1.3, 0.75, 0.1, 0.02, 3), { pos: [-2.2, -0.1, 0.35] });
  P(new THREE.TorusGeometry(0.12, 0.035, 12, 32), { pos: [2.07, 0.95, 0.1], rot: [0, Math.PI / 2, 0] });
  P(new THREE.TorusGeometry(0.12, 0.035, 12, 32), { pos: [-2.22, 0.95, 0.1], rot: [0, Math.PI / 2, 0] });
  P(roundedBox(0.85, 0.03, 1.1, 0.1, 0.015, 3), { pos: [-1.5, -1.25, 0.42] });
  P(cylY(0.12, 0.03, 32), { pos: [0.2, -1.24, 0.0] });

  cam.position.set(-0.3, 0, -0.5);
  cam.rotation.y = -0.15;
}

// =====================================================================
// DRON
// =====================================================================
function buildDrone(drone: THREE.Group, { part }: Builder) {
  // ================= FUSELAJE =================
  // Secciones transversales (z, semiancho arriba/abajo, techo, suelo). Frente = -Z (cámara)
  part(
    loft(
      [
        { z: -0.87, hw: 0.17, hwb: 0.14, top: -0.02, bot: -0.3 },
        { z: -0.84, hw: 0.29, hwb: 0.24, top: 0.06, bot: -0.4 },
        { z: -0.76, hw: 0.34, hwb: 0.28, top: 0.09, bot: -0.46 },
        { z: -0.55, hw: 0.35, hwb: 0.3, top: 0.105, bot: -0.52 },
        { z: -0.25, hw: 0.33, hwb: 0.3, top: 0.11, bot: -0.55 },
        { z: 0.15, hw: 0.28, hwb: 0.27, top: 0.11, bot: -0.555 },
        { z: 0.45, hw: 0.29, hwb: 0.28, top: 0.105, bot: -0.55 },
        { z: 0.72, hw: 0.29, hwb: 0.27, top: 0.09, bot: -0.5 },
        { z: 0.83, hw: 0.25, hwb: 0.22, top: 0.05, bot: -0.4 },
        { z: 0.875, hw: 0.15, hwb: 0.12, top: -0.02, bot: -0.3 },
      ],
      64,
      3.2,
    ),
    { crease: 40 },
  );

  // Tapa de batería superior con su junta y botón de liberación
  part(roundedBox(0.36, 1.16, 0.012, 0.14, 0.006, 3).rotateX(-Math.PI / 2), { pos: [0, 0.118, 0.06] });
  part(roundedBox(0.12, 0.05, 0.012, 0.02, 0.004, 2).rotateX(-Math.PI / 2), { pos: [0, 0.128, 0.56] });
  part(roundedBox(0.2, 0.24, 0.006, 0.06, 0.003, 2).rotateX(-Math.PI / 2), { pos: [0, 0.128, -0.38] });

  // Vainas laterales superiores (largueros redondeados con sensores en los extremos)
  for (const s of [-1, 1]) {
    const x = 0.285 * s;
    const secs: Section[] = [];
    const z0 = -0.85,
      z1 = 0.77,
      n = 16;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const z = z0 + (z1 - z0) * u;
      const r0 = 0.072 - 0.012 * u;
      const endF = Math.min(1, Math.sin((Math.min(1, u / 0.06) * Math.PI) / 2) * 0.35 + 0.65);
      const endB = Math.min(1, Math.sin((Math.min(1, (1 - u) / 0.06) * Math.PI) / 2) * 0.35 + 0.65);
      const r = r0 * Math.min(endF, endB);
      secs.push({ z, hw: r, top: 0.03 + r, bot: 0.03 - r, x });
    }
    part(loft(secs, 40, 2), { crease: 40 });
    // Sensores de visión frontales y traseros
    part(cylZ(0.052, 0.03, 40), { pos: [x, 0.03, -0.86] });
    part(cylZ(0.034, 0.02, 32), { pos: [x, 0.03, -0.877] });
    part(cylZ(0.044, 0.03, 40), { pos: [x, 0.03, 0.775] });
    part(cylZ(0.028, 0.02, 32), { pos: [x, 0.03, 0.79] });
    // Rejillas laterales de ventilación
    for (let i = 0; i < 3; i++) {
      part(roundedBox(0.022, 0.034, 0.075, 0.012, 0.004, 2), {
        pos: [0.305 * s, -0.33, 0.03 + i * 0.075],
        rot: [0.35, 0, 0],
      });
    }
    // Línea de junta inferior del casco
    part(roundedBox(0.008, 0.02, 1.25, 0.004, 0.002, 1), { pos: [0.315 * s, -0.43, 0.0] });
    // Carcasas de bisagra de los brazos
    part(cylY(0.075, 0.2, 40), { pos: [0.33 * s, -0.31, -0.34] });
    part(cylY(0.07, 0.18, 40), { pos: [0.34 * s, -0.4, 0.66] });
    part(cylY(0.03, 0.22, 20), { pos: [0.345 * s, -0.31, -0.34] });
    part(cylY(0.03, 0.2, 20), { pos: [0.355 * s, -0.4, 0.66] });
  }

  // Panel trasero: botón de encendido y LEDs de batería
  part(roundedBox(0.1, 0.045, 0.02, 0.02, 0.006, 2), { pos: [0, -0.2, 0.875] });
  for (let i = 0; i < 4; i++) part(cylZ(0.008, 0.01, 12), { pos: [-0.045 + i * 0.03, -0.27, 0.865] });

  // Sensores inferiores (ToF y visión inferior) y luz auxiliar
  part(cylY(0.045, 0.02, 40), { pos: [0, -0.56, -0.06] });
  part(cylY(0.03, 0.02, 32), { pos: [0, -0.57, -0.06] });
  part(cylY(0.045, 0.02, 40), { pos: [0, -0.56, 0.19] });
  part(roundedBox(0.11, 0.06, 0.016, 0.03, 0.005, 2).rotateX(-Math.PI / 2), { pos: [0, -0.565, 0.36] });
  part(cylY(0.045, 0.02, 40), { pos: [0, -0.56, 0.56] });
  part(roundedBox(0.34, 0.86, 0.012, 0.1, 0.004, 2).rotateX(-Math.PI / 2), { pos: [0, -0.557, 0.2] });

  // ================= GIMBAL Y CÁMARA DUAL =================
  part(roundedBox(0.32, 0.2, 0.05, 0.05, 0.015, 3).rotateX(-Math.PI / 2), { pos: [0, -0.32, -0.74] });
  part(cylY(0.07, 0.07, 40), { pos: [0, -0.37, -0.76] });
  // Brazo del gimbal (horquilla)
  part(roundedBox(0.36, 0.05, 0.1, 0.02, 0.012, 3), { pos: [0, -0.4, -0.79] });
  part(roundedBox(0.045, 0.2, 0.1, 0.02, 0.012, 3), { pos: [0.185, -0.48, -0.82] });
  part(roundedBox(0.045, 0.2, 0.1, 0.02, 0.012, 3), { pos: [-0.185, -0.48, -0.82] });
  part(cylX(0.068, 0.04, 40), { pos: [0.165, -0.5, -0.86] });
  part(cylX(0.068, 0.04, 40), { pos: [-0.165, -0.5, -0.86] });
  part(cylX(0.04, 0.05, 32), { pos: [0.19, -0.5, -0.86] });
  // Cuerpo de la cámara
  part(roundedBox(0.25, 0.33, 0.17, 0.05, 0.02, 4), { pos: [0, -0.49, -0.89] });
  part(roundedBox(0.2, 0.012, 0.12, 0.004, 0.003, 1), { pos: [0, -0.32, -0.88] });
  for (let i = 0; i < 6; i++) part(new THREE.BoxGeometry(0.008, 0.012, 0.06), { pos: [-0.06 + i * 0.024, -0.312, -0.87] });
  // Ventanas de los dos objetivos (gran angular arriba, tele abajo)
  for (const [y, w, h, r] of [
    [-0.405, 0.18, 0.14, 0.05],
    [-0.585, 0.16, 0.12, 0.042],
  ]) {
    part(roundedBox(w, h, 0.012, 0.03, 0.005, 2), { pos: [0, y, -0.982] });
    part(roundedBox(w - 0.03, h - 0.03, 0.006, 0.02, 0.002, 1), { pos: [0, y, -0.992] });
    part(cylZ(r, 0.012, 48), { pos: [0, y, -0.997] });
    part(cylZ(r * 0.55, 0.01, 32), { pos: [0, y, -1.004] });
  }

  // ================= BRAZOS, MOTORES Y PATAS =================
  const arm = (a: number[], b: number[], w0: number, h0: number, w1: number, h1: number) => {
    const L = new THREE.Vector3().fromArray(b).sub(new THREE.Vector3().fromArray(a)).length();
    const secs: Section[] = [];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const w = w0 + (w1 - w0) * u,
        h = h0 + (h1 - h0) * u;
      secs.push({ z: u * L, hw: w, top: h, bot: -h });
    }
    return part(alongAB(loft(secs, 32, 2.6), a, b), { crease: 45 });
  };

  // Hélice bipala: perfil con cuerda variable, torsión y barrido
  const blade = (R: number, hand: number) => {
    const N = 26,
      M = 18,
      pos: number[] = [],
      idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const r = 0.07 + (R - 0.07) * u;
      let chord = R * (0.05 + 0.07 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(u, 0.75) * 0.95)), 0.9));
      const tip = u > 0.9 ? Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.9) / 0.1, 2))) : 1;
      chord = Math.max(0.004, chord * tip);
      const thick = Math.max(0.002, chord * 0.11);
      const tw = hand * (0.5 * (1 - u) + 0.12);
      const sweep = hand * R * 0.05 * Math.sin(Math.PI * u);
      for (let k = 0; k < M; k++) {
        const t = (k / M) * Math.PI * 2;
        const x = (Math.cos(t) * chord) / 2;
        const y = ((Math.sin(t) * thick) / 2) * (1 + 0.6 * Math.cos(t));
        pos.push(x * Math.cos(tw) - y * Math.sin(tw) + sweep, x * Math.sin(tw) + y * Math.cos(tw), r);
      }
    }
    for (let i = 0; i < N; i++)
      for (let k = 0; k < M; k++) {
        const a = i * M + k,
          b = i * M + ((k + 1) % M),
          c = (i + 1) * M + k,
          d = (i + 1) * M + ((k + 1) % M);
        idx.push(a, b, c, b, d, c);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  };

  const rotor = (c: number[], yProp: number, dir: number[], hand: number) => {
    const grp = new THREE.Group();
    grp.position.set(c[0], yProp, c[1]);
    drone.add(grp);
    grp.rotation.y = Math.atan2(dir[0], dir[1]);
    part(blade(1.06, hand), { parent: grp, crease: 50 });
    part(blade(1.06, hand).rotateY(Math.PI), { parent: grp, crease: 50 });
    part(cylY(0.07, 0.035, 40), { parent: grp });
    part(cylY(0.045, 0.03, 32, 0.035), { parent: grp, pos: [0, 0.03, 0] });
    part(roundedBox(0.16, 0.03, 0.05, 0.012, 0.006, 2), { parent: grp });
  };

  for (const s of [-1, 1]) {
    // ---- Brazo delantero ----
    const fm = [1.51 * s, -0.81];
    arm([0.36 * s, -0.31, -0.36], [fm[0] - 0.06 * s, -0.3, fm[1]], 0.06, 0.075, 0.05, 0.06);
    // Motor delantero
    part(cylY(0.11, 0.16, 48, 0.1), { pos: [fm[0], -0.34, fm[1]] });
    part(cylY(0.102, 0.012, 48), { pos: [fm[0], -0.256, fm[1]] });
    part(cylY(0.098, 0.06, 48, 0.1), { pos: [fm[0], -0.22, fm[1]] });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      part(new THREE.BoxGeometry(0.012, 0.04, 0.03).rotateY(-a), {
        pos: [fm[0] + Math.cos(a) * 0.097, -0.22, fm[1] + Math.sin(a) * 0.097],
      });
    }
    // Pata / antena delantera
    const legSecs: Section[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      legSecs.push({ z: u * 0.5, hw: 0.045 - 0.02 * u, top: 0.06 - 0.03 * u, bot: -(0.06 - 0.03 * u) });
    }
    part(
      alongAB(loft(legSecs, 28, 2.4), [fm[0], -0.4, fm[1]], [1.35 * s, -0.9, fm[1] + 0.02], new THREE.Vector3(0, 0, 1)),
      { crease: 45 },
    );
    part(new THREE.SphereGeometry(0.028, 20, 12), { pos: [1.35 * s, -0.905, fm[1] + 0.02] });
    rotor(fm, -0.17, [0.52 * s, 0.855], -s);

    // ---- Brazo trasero ----
    const rm = [1.27 * s, 1.44];
    arm([0.38 * s, -0.42, 0.68], [rm[0] - 0.07 * s, -0.46, rm[1] - 0.06], 0.065, 0.085, 0.055, 0.07);
    // Motor trasero (cuelga bajo el brazo y hace de pata)
    part(cylY(0.11, 0.24, 48, 0.085), { pos: [rm[0], -0.56, rm[1]] });
    part(new THREE.SphereGeometry(0.085, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), {
      pos: [rm[0], -0.68, rm[1]],
    });
    part(cylY(0.115, 0.14, 48, 0.11), { pos: [rm[0], -0.38, rm[1]] });
    part(cylY(0.104, 0.012, 48), { pos: [rm[0], -0.305, rm[1]] });
    part(cylY(0.1, 0.06, 48, 0.104), { pos: [rm[0], -0.27, rm[1]] });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      part(new THREE.BoxGeometry(0.012, 0.04, 0.03).rotateY(-a), {
        pos: [rm[0] + Math.cos(a) * 0.1, -0.27, rm[1] + Math.sin(a) * 0.1],
      });
    }
    rotor(rm, -0.22, [0.733 * s, -0.68], s);
  }

  drone.rotation.y = Math.PI * 0.85;
}

// =====================================================================
// PORTÁTIL
// =====================================================================
function buildLaptop(G: THREE.Group, { part }: Builder) {
  // Todo se modela en milímetros reales y se escala al final
  const mb = new THREE.Group();
  G.add(mb);

  // Losa horizontal con medidas exteriores exactas (ancho X, fondo Z, alto Y)
  const slab = (w: number, d: number, h: number, r: number, b: number, segs = 3) => {
    b = Math.min(b, h / 2 - 0.01);
    return roundedBox(w - 2 * b, d - 2 * b, Math.max(0.01, h - 2 * b), Math.max(0.1, r - b), b, segs).rotateX(
      -Math.PI / 2,
    );
  };
  const P = (g: THREE.BufferGeometry, pos: [number, number, number], extra?: PartOpts) =>
    part(g, { parent: mb, pos, ...extra });

  // ================= BASE =================
  const BW = 312.6,
    BD = 221.2,
    BH = 14.0,
    FEET = 1.2;
  const topY = FEET + BH;
  P(slab(BW, BD, BH, 10, 2.2, 6), [0, FEET + BH / 2, 0], { crease: 40 });

  // Pozo del teclado
  const KW = 276,
    KD = 116,
    KZ = -37.5;
  P(slab(KW, KD, 0.5, 5, 0.2, 2), [0, topY + 0.05, KZ]);

  // Teclas
  const u = 18.6,
    gap = 2.6,
    kd = 16.2,
    fd = 9.0;
  const key = (x0: number, wu: number, z: number, depth: number) => {
    P(slab(wu * u - gap, depth, 1.1, 2.2, 0.45, 2), [x0 + (wu * u) / 2, topY + 0.85, z]);
    return x0 + wu * u;
  };
  const left = -(14.5 * u) / 2;
  let z = KZ - KD / 2 + 6 + fd / 2;
  // Fila de funciones (media altura) + Touch ID
  let x = key(left, 1.5, z, fd);
  for (let i = 0; i < 12; i++) x = key(x, 1, z, fd);
  P(slab(u - gap, fd, 1.1, 2.2, 0.45, 2), [x + u / 2, topY + 0.85, z]);
  P(cylY(3.4, 0.3, 40), [x + u / 2, topY + 1.45, z]);
  z += fd / 2 + gap + kd / 2;
  const rows = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.7],
    [2.3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.2],
  ];
  for (const r of rows) {
    let xx = left;
    for (const wu of r) xx = key(xx, wu, z, kd);
    z += kd + gap;
  }
  // Fila inferior: fn ctrl opt cmd [espacio] cmd opt ← ↑↓ →
  let xb = left;
  for (const wu of [1, 1, 1, 1.25, 5, 1.25, 1]) xb = key(xb, wu, z, kd);
  xb = key(xb, 1, z, kd);
  key(xb, 1, z - kd / 4 - 0.6, kd / 2 - 1.2);
  xb = key(xb, 1, z + kd / 4 + 0.6, kd / 2 - 1.2);
  key(xb, 1, z, kd);

  // Rejillas de altavoz a ambos lados del teclado
  for (const s of [-1, 1]) {
    const gx = s * 147.2;
    P(slab(10.5, KD, 0.3, 3, 0.1, 1), [gx, topY + 0.03, KZ]);
    for (let r = 0; r < 26; r++)
      for (let c = 0; c < 3; c++) {
        P(cylY(0.75, 0.2, 8), [gx - 3 + c * 3, topY + 0.25, KZ - KD / 2 + 6 + r * 4.15 + (c % 2) * 2]);
      }
  }

  // Trackpad
  P(slab(150, 72, 0.35, 6, 0.12, 2), [0, topY + 0.03, 64]);
  // Hendidura frontal para abrir la tapa
  P(slab(48, 2.2, 0.4, 1, 0.15, 1), [0, topY + 0.05, BD / 2 - 1.5]);

  // Patas de goma
  for (const [px, pz] of [
    [-128, -86],
    [128, -86],
    [-128, 86],
    [128, 86],
  ]) {
    P(cylY(7.5, FEET, 40), [px, FEET / 2, pz]);
    P(cylY(5.5, 0.3, 32), [px, 0.0, pz]);
  }
  // Línea de la tapa inferior
  P(slab(BW - 10, BD - 10, 0.3, 8, 0.1, 1), [0, FEET - 0.05, 0]);

  // ================= PUERTOS LATERALES =================
  const port = (side: number, zc: number, len: number, h: number, r: number, inner: boolean) => {
    const xs = side * (BW / 2 + 0.05);
    P(roundedBox(len, h, 0.4, r, 0.12, 2).rotateY(Math.PI / 2), [xs, FEET + BH / 2, zc]);
    if (inner)
      P(roundedBox(len - 2.5, Math.max(0.6, h - 3), 0.3, Math.max(0.2, r - 1), 0.08, 1).rotateY(Math.PI / 2), [
        xs + side * 0.25,
        FEET + BH / 2,
        zc,
      ]);
  };
  // Derecha: HDMI, Thunderbolt, ranura SDXC
  port(1, -96, 15, 6, 1.2, true);
  port(1, -76, 9, 3.6, 1.7, true);
  port(1, -46, 25, 2.4, 1.0, false);
  // Izquierda: MagSafe, dos Thunderbolt, minijack
  port(-1, -96, 17, 4.2, 2.0, true);
  port(-1, -74, 9, 3.6, 1.7, true);
  port(-1, -58, 9, 3.6, 1.7, true);
  P(cylX(2.0, 0.6, 32), [-(BW / 2 + 0.1), FEET + BH / 2, 60]);
  P(cylX(1.2, 0.8, 24), [-(BW / 2 + 0.2), FEET + BH / 2, 60]);

  // ================= BISAGRA Y PANTALLA =================
  const hingeY = topY - 2.5,
    hingeZ = -BD / 2 - 1.5;
  P(cylX(5.2, 238, 48), [0, hingeY, hingeZ]);
  P(cylX(5.6, 6, 48), [119, hingeY, hingeZ]);
  P(cylX(5.6, 6, 48), [-119, hingeY, hingeZ]);

  const lid = new THREE.Group();
  lid.position.set(0, hingeY, hingeZ);
  lid.rotation.x = -0.38; // tapa abierta ~112°
  mb.add(lid);
  const LW = 312.6,
    LH = 221.2,
    LT = 5.6;
  const L = (g: THREE.BufferGeometry, pos: [number, number, number]) => part(g, { parent: lid, pos, crease: 40 });
  // Carcasa de la tapa (bisel inferior envuelve la bisagra)
  L(roundedBox(LW - 3, LH - 3, LT - 3, 10, 1.5, 5), [0, LH / 2 + 3.5, -LT / 2 + 1.2]);
  // Marco de cristal y panel activo
  L(roundedBox(LW - 7, LH - 9, 0.4, 8, 0.15, 2), [0, LH / 2 + 4.5, 1.65]);
  L(roundedBox(302, 195, 0.3, 6, 0.1, 2), [0, LH / 2 + 3.5, 2.0]);
  // Muesca de la cámara
  L(roundedBox(31, 7.5, 0.6, 2.5, 0.15, 2), [0, LH + 4.5 - 3.5 - 4.6, 2.2]);
  L(cylZ(1.1, 0.6, 24), [0, LH + 4.5 - 3.5 - 4.6, 2.6]);
  // Pastilla de goma inferior de la tapa
  L(roundedBox(250, 2, 0.6, 1, 0.2, 1), [0, 5.5, 1.6]);
  // Almohadillas superiores del marco
  for (const lx of [-120, 120]) L(roundedBox(18, 1.6, 0.6, 0.8, 0.2, 1), [lx, LH + 2.6, 1.5]);
  // Cara exterior de la tapa: ligero panel embutido
  L(roundedBox(LW - 18, LH - 18, 0.3, 6, 0.1, 1), [0, LH / 2 + 3.5, -LT + 1.0]);

  mb.scale.setScalar(0.0145);
}
