import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { GEAR_MODELS, type GearModelKey, makeBuilder } from "./gearModels";

/**
 * "Metamorfosis técnica": un único lienzo con todo el equipo. Cada objeto es negro con brillo de
 * borde (Fresnel) y contorno (pase de normales + profundidad); al cambiar de objeto el sólido se
 * deshace en una nube de puntos que gira, se abre y se recompone en el siguiente.
 *
 * El bloque decide a qué objeto ir (setTarget) y el motor recorre el camino en el tiempo, siempre
 * completo y a velocidad fija, hacia delante o hacia atrás: un barrido de rueda no deja el morph
 * a medias. Arrastrar gira el conjunto; solo, gira despacio.
 *
 * Colores: todo el pipeline va en valores "crudos" (como la maqueta, three r128 sin gestión de
 * color). Los colores se declaran lineales para que three no los convierta y la salida es
 * LinearSRGB para que la última pasada no los vuelva a codificar; así #060a0c del fondo sale igual
 * que el --color-ink del escenario.
 *
 * Arrastra three.js + postprocesado: el bloque lo importa dinámicamente al calentarse (useWarm).
 * Crea su <canvas> dentro de `host` y lo elimina en destroy(), que es idempotente.
 */

/** Segundos que dura una metamorfosis entre dos objetos vecinos. */
const MORPH_SECONDS = 2;
/** Puntos de la nube. Cada objeto se muestrea con los mismos, ordenados por altura. */
const POINTS = 26000;
/** Giro automático (rad/s); al pasar el puntero casi se para. */
const AUTO_SPIN = 0.12;
const HOVER_SPIN_FACTOR = 0.2;
// Arrastre: radianes por píxel y constante de tiempo (s) de la inercia al soltar.
const DRAG_GAIN = 0.008;
const DRAG_INERTIA = 0.35;
const LOAD_MARGIN = "200px 0px";

const RIM = 0.55;
const LINE = 0.9;

const raw = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
const INK = 0x060a0c;
const GLOW = 0xe6ecf5;

interface Model {
  group: THREE.Group;
  mat: THREE.ShaderMaterial;
  points: Float32Array;
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const lin = (a: number, b: number, x: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

export class GearMorph {
  private readonly canvas = document.createElement("canvas");
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.5, 60);
  /** Todo lo que gira: modelos y nube. La cámara queda fija, en picado de tres cuartos. */
  private readonly root = new THREE.Group();
  private readonly models: Model[];
  private readonly cloud: THREE.Points;
  private readonly cloudMat: THREE.ShaderMaterial;
  private readonly posA: THREE.BufferAttribute;
  private readonly posB: THREE.BufferAttribute;
  private readonly normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
  private readonly nTarget: THREE.WebGLRenderTarget;
  private readonly composer: EffectComposer;
  private readonly edgePass: ShaderPass;
  private readonly bloom: UnrealBloomPass;
  private readonly dpr = Math.min(window.devicePixelRatio || 1, 2);
  private readonly reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private readonly resizeObs: ResizeObserver;
  private readonly io: IntersectionObserver;

  /** Posición continua entre objetos (0 … n-1) y la que marca el scroll. */
  private pos = 0;
  private target = 0;
  private pairLoaded = -1;
  private spin = 0;
  private dragVel = 0;
  private hover = false;
  private dragging: { id: number; x: number } | null = null;
  private lastMoveT = 0;
  private visible = false;
  private active = true;
  private destroyed = false;
  private raf = 0;
  private last = 0;

  constructor(
    private readonly host: HTMLElement,
    keys: readonly GearModelKey[],
  ) {
    host.appendChild(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(raw(INK), 1);

    this.camera.position.set(6.4, 3.2, 8.0);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.root);

    // ---------- Modelos, centrados y escalados a su tamaño ----------
    this.models = keys.map((key) => {
      const def = GEAR_MODELS[key];
      const mat = makeRim();
      const inner = new THREE.Group();
      def.build(inner, makeBuilder(inner, mat));
      const box = new THREE.Box3().setFromObject(inner);
      const size = box.getSize(new THREE.Vector3());
      inner.position.sub(box.getCenter(new THREE.Vector3()));
      const group = new THREE.Group();
      group.add(inner);
      group.scale.setScalar(def.size / Math.max(size.x, size.y, size.z));
      group.updateMatrixWorld(true);
      this.root.add(group);
      return { group, mat, points: sampleSurface(group) };
    });

    // ---------- Nube de puntos de la metamorfosis ----------
    const geo = new THREE.BufferGeometry();
    this.posA = new THREE.BufferAttribute(new Float32Array(POINTS * 3), 3);
    this.posB = new THREE.BufferAttribute(new Float32Array(POINTS * 3), 3);
    const rnd = new Float32Array(POINTS);
    for (let i = 0; i < POINTS; i++) rnd[i] = Math.random();
    geo.setAttribute("position", this.posA);
    geo.setAttribute("posB", this.posB);
    geo.setAttribute("rnd", new THREE.BufferAttribute(rnd, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    this.cloudMat = makeCloud(4.4 * this.dpr);
    this.cloud = new THREE.Points(geo, this.cloudMat);
    this.cloud.frustumCulled = false;
    this.root.add(this.cloud);

    // ---------- Contornos (normales + profundidad) y bloom ----------
    this.nTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    this.nTarget.depthTexture = new THREE.DepthTexture(1, 1);
    this.nTarget.depthTexture.type = THREE.UnsignedIntType;

    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(this.dpr);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.edgePass = new ShaderPass(makeEdge(this.nTarget, this.camera));
    this.composer.addPass(this.edgePass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.22, 0.35);
    this.composer.addPass(this.bloom);

    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerleave", this.onPointerLeave);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.resize();

    this.io = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        this.play();
      },
      { rootMargin: LOAD_MARGIN },
    );
    this.io.observe(host);
    this.applyPhase(0);
  }

  /** Objeto al que ir. Sin movimiento (o con movimiento reducido) se salta directamente. */
  setTarget(i: number, instant = false) {
    this.target = Math.min(this.models.length - 1, Math.max(0, i));
    if (instant || this.reduced) this.pos = this.target;
    this.play();
  }

  /** false: no renderiza (el escenario no se ve aunque la caja esté en pantalla). */
  setActive(on: boolean) {
    if (on === this.active) return;
    this.active = on;
    this.play();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.resizeObs.disconnect();
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints) (o as THREE.Mesh).geometry.dispose();
    });
    for (const m of this.models) m.mat.dispose();
    this.cloudMat.dispose();
    this.normalMat.dispose();
    this.nTarget.depthTexture?.dispose();
    this.nTarget.dispose();
    this.edgePass.dispose();
    this.bloom.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  private resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    // En vertical el objeto se saldría por los lados: se abre el campo.
    this.camera.fov = this.camera.aspect < 0.8 ? 52 : 35;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    const pw = Math.floor(w * this.dpr),
      ph = Math.floor(h * this.dpr);
    this.nTarget.setSize(pw, ph);
    (this.edgePass.uniforms.texel.value as THREE.Vector2).set(1 / pw, 1 / ph);
    this.play();
  }

  private loadPair(i: number) {
    if (this.pairLoaded === i) return;
    this.posA.array.set(this.models[i].points);
    this.posB.array.set(this.models[i + 1].points);
    this.posA.needsUpdate = true;
    this.posB.needsUpdate = true;
    this.pairLoaded = i;
  }

  /**
   * Reparto de cada tramo entre dos objetos: el sólido de salida se apaga en el primer 18%, la
   * nube aparece, viaja de una forma a otra y se apaga, y el de llegada se enciende en el último
   * 18%. Nunca hay dos sólidos a la vez.
   */
  private applyPhase(p: number) {
    const n = this.models.length;
    const solid = new Array<number>(n).fill(0);
    let pointAlpha = 0,
      morph = 0;
    const pair = Math.max(0, Math.min(n - 2, Math.floor(p)));
    const u = p - pair;
    if (n < 2 || u <= 0.0001) solid[pair] = 1;
    else if (u >= 0.9999) solid[pair + 1] = 1;
    else {
      this.loadPair(pair);
      const e = smooth(u);
      solid[pair] = 1 - lin(0, 0.18, e);
      solid[pair + 1] = lin(0.82, 1, e);
      pointAlpha = lin(0, 0.12, e) * (1 - lin(0.88, 1, e));
      morph = lin(0.12, 0.88, e);
    }
    let line = 0;
    this.models.forEach((m, i) => {
      m.group.visible = solid[i] > 0.002;
      m.mat.uniforms.rimStrength.value = RIM * solid[i];
      line = Math.max(line, solid[i]);
    });
    this.edgePass.uniforms.lineStrength.value = LINE * line;
    this.cloudMat.uniforms.uAlpha.value = pointAlpha;
    this.cloudMat.uniforms.uT.value = morph;
    this.cloud.visible = pointAlpha > 0.002;
  }

  private play() {
    if (this.raf || this.destroyed || !this.visible || !this.active) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.destroyed || !this.visible || !this.active) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;

    const step = dt / MORPH_SECONDS;
    this.pos = this.pos < this.target ? Math.min(this.target, this.pos + step) : Math.max(this.target, this.pos - step);
    this.applyPhase(this.pos);

    if (!this.dragging) {
      if (!this.reduced) this.spin += AUTO_SPIN * (this.hover ? HOVER_SPIN_FACTOR : 1) * dt;
      this.spin += this.dragVel * dt;
      this.dragVel *= Math.exp(-dt / DRAG_INERTIA);
    }
    this.root.rotation.y = this.spin;

    // Pase de normales y profundidad para los contornos (sin la nube).
    const cloudOn = this.cloud.visible;
    this.cloud.visible = false;
    this.scene.overrideMaterial = this.normalMat;
    this.renderer.setRenderTarget(this.nTarget);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = null;
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(raw(INK), 1);
    this.cloud.visible = cloudOn;
    this.composer.render(dt);

    this.raf = requestAnimationFrame(this.frame);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.dragging = { id: e.pointerId, x: e.clientX };
    this.lastMoveT = e.timeStamp;
    this.dragVel = 0;
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.dragging?.id !== e.pointerId) return;
    this.dragging = null;
    // Soltar tras quedarse quieto no lanza el modelo.
    if (e.timeStamp - this.lastMoveT > 80) this.dragVel = 0;
  };

  private onPointerMove = (e: PointerEvent) => {
    this.hover = true;
    if (this.dragging?.id !== e.pointerId) return;
    const dr = (e.clientX - this.dragging.x) * DRAG_GAIN;
    this.dragging.x = e.clientX;
    this.spin += dr;
    const dt = Math.max(0.008, (e.timeStamp - this.lastMoveT) / 1000);
    this.lastMoveT = e.timeStamp;
    this.dragVel = this.dragVel * 0.6 + (dr / dt) * 0.4;
  };

  private onPointerLeave = () => {
    this.hover = false;
  };
}

// ---------- Material: cara negra con brillo de borde (Fresnel), uno por modelo para fundirlo ----------
function makeRim() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      rimColor: { value: raw(GLOW) },
      rimPower: { value: 3.2 },
      rimStrength: { value: RIM },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 rimColor;
      uniform float rimPower;
      uniform float rimStrength;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        float f = 1.0 - clamp(dot(n, normalize(vV)), 0.0, 1.0);
        gl_FragColor = vec4(rimColor * pow(f, rimPower) * rimStrength, 1.0);
      }`,
  });
}

// ---------- Nube: cada punto va de su sitio en A a su sitio en B girando y abriéndose ----------
function makeCloud(size: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uT: { value: 0 },
      uAlpha: { value: 0 },
      uSize: { value: size },
      uColor: { value: raw(GLOW) },
    },
    vertexShader: /* glsl */ `
      attribute vec3 posB;
      attribute float rnd;
      uniform float uT, uSize;
      varying float vGlow;
      void main() {
        // Cada punto sale con un pequeño retraso propio: la forma se deshace por capas.
        float e = clamp((uT - rnd * 0.15) / 0.85, 0.0, 1.0);
        vec3 p = mix(position, posB, e);
        float b = sin(3.14159265 * e);
        float ang = b * (0.9 + rnd * 1.4);
        float c = cos(ang), s = sin(ang);
        p.xz = mat2(c, -s, s, c) * p.xz;
        vec3 dir = normalize(p + vec3(0.0001));
        p += dir * b * (0.25 + 0.6 * rnd);
        p.y += b * (rnd - 0.5) * 0.6;
        vGlow = b;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (1.0 + b * 0.8) * (9.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAlpha;
      uniform vec3 uColor;
      varying float vGlow;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = dot(q, q);
        if (d > 0.25) discard;
        float r = sqrt(d);
        float core = 1.0 - smoothstep(0.17, 0.21, r);   // punto negro puro
        float halo = (1.0 - smoothstep(0.17, 0.45, r)) * (0.05 + 0.03 * vGlow);
        gl_FragColor = vec4(uColor * (1.0 - core), max(core, halo) * uAlpha);
      }`,
  });
}

// ---------- Contorno: Laplaciano de profundidad + salto de normal + silueta contra el fondo ----------
function makeEdge(nTarget: THREE.WebGLRenderTarget, camera: THREE.PerspectiveCamera) {
  return {
    uniforms: {
      tDiffuse: { value: null },
      tNormal: { value: nTarget.texture },
      tDepth: { value: nTarget.depthTexture },
      texel: { value: new THREE.Vector2() },
      cNear: { value: camera.near },
      cFar: { value: camera.far },
      lineColor: { value: raw(GLOW) },
      lineStrength: { value: LINE },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse, tNormal, tDepth;
      uniform vec2 texel;
      uniform float cNear, cFar, lineStrength;
      uniform vec3 lineColor;
      varying vec2 vUv;
      float rawD(vec2 uv) { return texture2D(tDepth, uv).x; }
      float linZ(float d) { return (cNear * cFar) / (cFar - d * (cFar - cNear)); }
      vec3 nrm(vec2 uv) { return normalize(texture2D(tNormal, uv).xyz * 2.0 - 1.0); }
      void main() {
        vec4 base = texture2D(tDiffuse, vUv);
        float dc = rawD(vUv);
        if (dc >= 0.99999) { gl_FragColor = base; return; }
        vec2 o[4];
        o[0] = vec2(texel.x, 0.0); o[1] = vec2(-texel.x, 0.0);
        o[2] = vec2(0.0, texel.y); o[3] = vec2(0.0, -texel.y);
        float zc = linZ(dc);
        vec3 nc = nrm(vUv);
        float lap = -4.0 * zc;
        float nEdge = 0.0;
        float bg = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 uv = vUv + o[i];
          float d = rawD(uv);
          if (d >= 0.99999) bg = 1.0;
          lap += linZ(min(d, 0.9999));
          nEdge = max(nEdge, 1.0 - dot(nc, nrm(uv)));
        }
        float dEdge = smoothstep(0.004, 0.012, abs(lap) / zc);
        float e = max(max(dEdge, smoothstep(0.12, 0.3, nEdge)), bg);
        gl_FragColor = vec4(mix(base.rgb, lineColor, e * lineStrength), 1.0);
      }`,
  };
}

// ---------- Muestreo de superficie: POINTS puntos repartidos por área ----------
function sampleSurface(group: THREE.Object3D) {
  const tris: number[][] = [];
  let total = 0;
  const va = new THREE.Vector3(),
    vb = new THREE.Vector3(),
    vc = new THREE.Vector3();
  const e1 = new THREE.Vector3(),
    e2 = new THREE.Vector3();
  group.updateMatrixWorld(true);
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      va.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      vb.fromBufferAttribute(p, i + 1).applyMatrix4(mesh.matrixWorld);
      vc.fromBufferAttribute(p, i + 2).applyMatrix4(mesh.matrixWorld);
      const area = e1.subVectors(vb, va).cross(e2.subVectors(vc, va)).length() * 0.5;
      if (area <= 0) continue;
      total += area;
      tris.push([va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z, total]);
    }
  });
  const pts: [number, number, number][] = [];
  for (let n = 0; n < POINTS; n++) {
    const r = Math.random() * total;
    let lo = 0,
      hi = tris.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tris[mid][9] < r) lo = mid + 1;
      else hi = mid;
    }
    const t = tris[lo];
    let u = Math.random(),
      v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    pts.push([t[0] * w + t[3] * u + t[6] * v, t[1] * w + t[4] * u + t[7] * v, t[2] * w + t[5] * u + t[8] * v]);
  }
  // Ordenar por altura: cada punto conserva su "capa" y la forma fluye de lado.
  pts.sort((a, b) => a[1] - b[1]);
  const out = new Float32Array(POINTS * 3);
  pts.forEach((p, i) => out.set(p, i * 3));
  return out;
}
