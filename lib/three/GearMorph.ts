import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BLUE_NOISE_B64, BLUE_NOISE_SIZE } from "./blueNoise";
import { GEAR_MODELS, type GearModelKey, makeBuilder } from "./gearModels";
import type { SdfRequest, SdfResponse } from "./sdfTypes";
import { sdfWorkerMain } from "./sdfWorker";

/**
 * "Metamorfosis técnica": un único lienzo con todo el equipo. Cada objeto es negro con brillo de
 * borde (Fresnel) y contorno (pase de normales + profundidad).
 *
 * El cambio de objeto es un morph volumétrico: cada objeto tiene además su campo de distancias
 * con signo (SDF, calculado en un worker, ver sdfWorker.ts) y durante el cambio se dibuja por
 * raymarching la interpolación de los dos campos. La forma se funde de verdad de uno a otro: lo
 * que sobra se reabsorbe, lo que falta brota, sin partículas ni fundidos a negro. Los extremos
 * son las mallas reales, con todo su detalle; el volumen solo vive durante el cambio y entra y
 * sale con un fundido corto, porque a resolución de vóxel pierde lo más fino (teclas, rejillas).
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
 * Velo de trama (adaptación del DitherVeil de React Bits): la imagen final se reduce a dos tintas
 * (la misma tinta del fondo, para que el lienzo no se distinga del escenario, y DITHER_PAPER) con
 * una trama de ruido azul por celdas; alrededor del puntero se abre una ventana que deja ver el
 * render limpio y su estela tarda REVEAL_LINGER en volver a tramarse. Con CLICK_BURST, cada clic
 * lanza además una onda que lo destapa todo un instante. Se hace en la GPU con una pasada más
 * del composer y no con el componente de ogl: la escena se mueve en cada frame, así que la
 * difusión de error (Floyd/Atkinson, en CPU y sobre una imagen fija) no sirve; el ruido azul es lo
 * que más se le parece, punteado orgánico sin rejilla. Un segundo contexto WebGL encima del de
 * three solo costaría memoria.
 *
 * Arrastra three.js + postprocesado: el bloque lo importa dinámicamente al calentarse (useWarm).
 * Crea su <canvas> dentro de `host` y lo elimina en destroy(), que es idempotente.
 */

/** Segundos que dura una metamorfosis entre dos objetos vecinos. */
const MORPH_SECONDS = 0.5;
/** Fracción del cambio que dura el relevo malla ↔ volumen en cada extremo. */
const SWAP = 0.12;
/** Volumen extra (unidades) a mitad del morph: la forma intermedia se ve maciza, no adelgazada. */
const BULGE = 0.06;
/** Vóxeles en el lado mayor de la rejilla del SDF. */
const SDF_RES = 128;
/** Giro automático (rad/s); al pasar el puntero casi se para. */
const AUTO_SPIN = 0.12;
const HOVER_SPIN_FACTOR = 0.2;
// Arrastre: radianes por píxel y constante de tiempo (s) de la inercia al soltar.
const DRAG_GAIN = 0.008;
const DRAG_INERTIA = 0.35;
const LOAD_MARGIN = "200px 0px";

// Velo de trama. Celda en px CSS, radio de la ventana en px CSS, fracción del borde que se
// deshace en trama y segundos que tarda la estela en volver a tramarse.
const DITHER_PX = 1;
const DITHER_CONTRAST = 1.15;
const DITHER_PAPER = 0xf4f1ea;
const REVEAL_RADIUS = 200;
const REVEAL_SOFTNESS = 0.6;
const REVEAL_LINGER = 1;
/** Ganancia de la máscara: el centro de la ventana se ve limpio antes de llegar al radio. */
const REVEAL_HOLD = 1.6;
/** La máscara de la estela va a media resolución: es un degradado, no necesita más. */
const MASK_SCALE = 0.5;
/** Onda del clic. Apagada: salía también al empezar a arrastrar para girar el objeto. */
const CLICK_BURST = false;
/** Duración (s) de la onda y cuántas pueden convivir (tamaño del array del shader). */
const BURST_SECONDS = 1.2;
const MAX_BURSTS = 4;

const RIM = 0.55;
const LINE = 0.9;

const raw = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
const INK = 0x060a0c;
const GLOW = 0xe6ecf5;

interface Model {
  group: THREE.Group;
  mat: THREE.ShaderMaterial;
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
  /** Todo lo que gira: modelos y volumen. La cámara queda fija, en picado de tres cuartos. */
  private readonly root = new THREE.Group();
  private readonly models: Model[];
  private readonly solid: number[];
  /** Volumen del morph: una caja del tamaño de la rejilla que se raymarchea por dentro. */
  private readonly volume: THREE.Mesh;
  private readonly volColor: THREE.ShaderMaterial;
  private readonly volNormal: THREE.ShaderMaterial;
  private volWeight = 0;
  private sdf: THREE.Data3DTexture | null = null;
  private worker: Worker | null = null;
  private readonly normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
  private readonly nTarget: THREE.WebGLRenderTarget;
  private readonly composer: EffectComposer;
  private readonly edgePass: ShaderPass;
  private readonly bloom: UnrealBloomPass;
  private readonly ditherPass: ShaderPass;
  /** Estela del puntero, en ping-pong: cada frame lee la anterior, la apaga un poco y pinta encima. */
  private readonly masks: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private readonly maskQuad: FullScreenQuad;
  private readonly maskMat: THREE.ShaderMaterial;
  private readonly pointer = { x: 0, y: 0, inside: false, fresh: true };
  private readonly brush = { x: 0, y: 0, px: 0, py: 0 };
  /** 0 … 1: se suaviza al entrar y salir para que la ventana no aparezca ni se corte de golpe. */
  private presence = 0;
  private readonly bursts: { x: number; y: number; start: number }[] = [];
  private readonly noise: THREE.DataTexture;
  private readonly dpr = Math.min(window.devicePixelRatio || 1, 2);
  private readonly reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private readonly resizeObs: ResizeObserver;
  private readonly io: IntersectionObserver;

  /** Posición continua entre objetos (0 … n-1) y la que marca el scroll. */
  private pos = 0;
  private target = 0;
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
      this.root.add(group);
      return { group, mat };
    });
    this.solid = this.models.map(() => 0);
    this.root.updateMatrixWorld(true);

    // ---------- Volumen del morph: rejilla común a todos los objetos ----------
    const bounds = new THREE.Box3();
    for (const m of this.models) bounds.union(new THREE.Box3().setFromObject(m.group));
    const extent = bounds.getSize(new THREE.Vector3());
    const h = Math.max(extent.x, extent.y, extent.z) / SDF_RES;
    const pad = 4; // vóxeles de aire alrededor: el relleno de "fuera" empieza en el borde
    const min = bounds.min.clone().subScalar(pad * h);
    const dims = extent
      .clone()
      .divideScalar(h)
      .ceil()
      .addScalar(pad * 2);
    const gridSize = dims.clone().multiplyScalar(h);
    const uniforms = {
      uSdf: { value: null as THREE.Data3DTexture | null },
      uW: { value: new THREE.Vector4() },
      uMin: { value: min },
      uSize: { value: gridSize },
      uH: { value: h },
      uBulge: { value: 0 },
      rimColor: { value: raw(GLOW) },
      rimPower: { value: 3.2 },
      rimStrength: { value: 0 },
    };
    // Dos materiales con los mismos uniforms: el de color suma su brillo (para el relevo con la
    // malla) y el de normales escribe como MeshNormalMaterial para el pase de contornos.
    this.volColor = makeVolume(uniforms, false);
    this.volNormal = makeVolume(uniforms, true);
    const boxGeo = new THREE.BoxGeometry(gridSize.x, gridSize.y, gridSize.z);
    boxGeo.translate(min.x + gridSize.x / 2, min.y + gridSize.y / 2, min.z + gridSize.z / 2);
    this.volume = new THREE.Mesh(boxGeo, this.volColor);
    this.volume.visible = false;
    this.volume.frustumCulled = false;
    this.root.add(this.volume);
    if (this.models.length >= 2 && this.models.length <= 4) this.computeSdf(min, h, dims);

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

    // ---------- Velo de trama con ventana al puntero ----------
    const maskTarget = () =>
      new THREE.WebGLRenderTarget(2, 2, {
        type: THREE.HalfFloatType,
        depthBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
    this.masks = [maskTarget(), maskTarget()];
    this.maskMat = makeMask();
    this.maskQuad = new FullScreenQuad(this.maskMat);
    const noise = Uint8Array.from(atob(BLUE_NOISE_B64), (c) => c.charCodeAt(0));
    this.noise = new THREE.DataTexture(noise, BLUE_NOISE_SIZE, BLUE_NOISE_SIZE, THREE.RedFormat);
    this.noise.needsUpdate = true;
    this.ditherPass = new ShaderPass(makeDither(this.dpr));
    this.ditherPass.uniforms.tNoise.value = this.noise;
    this.composer.addPass(this.ditherPass);

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
    this.worker?.terminate();
    this.io.disconnect();
    this.resizeObs.disconnect();
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose();
    });
    for (const m of this.models) m.mat.dispose();
    this.volColor.dispose();
    this.volNormal.dispose();
    this.sdf?.dispose();
    this.normalMat.dispose();
    this.nTarget.depthTexture?.dispose();
    this.nTarget.dispose();
    this.edgePass.dispose();
    this.bloom.dispose();
    this.ditherPass.dispose();
    this.noise.dispose();
    this.masks.forEach((m) => m.dispose());
    this.maskMat.dispose();
    this.maskQuad.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  /**
   * Manda los triángulos de cada objeto (en el espacio de `root`) al worker. Hasta que vuelve el
   * SDF, el cambio de objeto es un simple relevo de brillo entre las dos mallas.
   */
  private computeSdf(min: THREE.Vector3, h: number, dims: THREE.Vector3) {
    const models = this.models.map((m) => trianglesOf(m.group));
    try {
      const url = URL.createObjectURL(new Blob([`(${sdfWorkerMain.toString()})()`], { type: "text/javascript" }));
      this.worker = new Worker(url);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Sin worker para el morph; el cambio será un relevo simple", err);
      return;
    }
    this.worker.onmessage = (e: MessageEvent<SdfResponse>) => {
      this.worker?.terminate();
      this.worker = null;
      if (this.destroyed) return;
      const tex = new THREE.Data3DTexture(e.data.data, dims.x, dims.y, dims.z);
      tex.format = THREE.RGBAFormat;
      tex.type = THREE.HalfFloatType;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.unpackAlignment = 1;
      tex.needsUpdate = true;
      this.sdf = tex;
      this.volColor.uniforms.uSdf.value = tex;
    };
    this.worker.onerror = (err) => console.warn("No se pudo calcular el morph", err);
    const req: SdfRequest = { models, min: [min.x, min.y, min.z], h, dims: [dims.x, dims.y, dims.z] };
    this.worker.postMessage(
      req,
      models.map((m) => m.buffer),
    );
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
    (this.ditherPass.uniforms.uResolution.value as THREE.Vector2).set(pw, ph);
    (this.maskMat.uniforms.uSize.value as THREE.Vector2).set(w, h);
    (this.ditherPass.uniforms.uSize.value as THREE.Vector2).set(w, h);
    const mw = Math.max(2, Math.round(w * MASK_SCALE)),
      mh = Math.max(2, Math.round(h * MASK_SCALE));
    this.masks.forEach((m) => m.setSize(mw, mh));
    this.play();
  }

  /**
   * Reparto de cada cambio entre dos objetos A → B:
   * - primer SWAP: la malla de A cede el brillo al volumen, que en ese momento tiene la forma de A;
   * - centro: el volumen pasa del campo de A al de B (con una pizca de volumen extra a mitad);
   * - último SWAP: el volumen, ya con la forma de B, cede el brillo a la malla de B.
   * Sin SDF (aún calculándose o sin worker), relevo directo de brillo entre las mallas.
   */
  private applyPhase(p: number) {
    const n = this.models.length;
    this.solid.fill(0);
    let vol = 0;
    const pair = Math.max(0, Math.min(n - 2, Math.floor(p)));
    const u = p - pair;
    if (n < 2 || u <= 0.0001) this.solid[pair] = 1;
    else if (u >= 0.9999) this.solid[pair + 1] = 1;
    else {
      const e = smooth(u);
      if (this.sdf) {
        const fadeIn = lin(0, SWAP, e);
        const fadeOut = lin(1 - SWAP, 1, e);
        this.solid[pair] = 1 - fadeIn;
        this.solid[pair + 1] = fadeOut;
        vol = fadeIn * (1 - fadeOut);
        const t = smooth(lin(SWAP * 0.5, 1 - SWAP * 0.5, e));
        const w = this.volColor.uniforms.uW.value as THREE.Vector4;
        w.set(0, 0, 0, 0).setComponent(pair, 1 - t).setComponent(pair + 1, t);
        this.volColor.uniforms.uBulge.value = BULGE * Math.sin(Math.PI * t);
      } else {
        this.solid[pair] = 1 - lin(0, 0.5, e);
        this.solid[pair + 1] = lin(0.5, 1, e);
      }
    }
    this.models.forEach((m, i) => {
      m.group.visible = this.solid[i] > 0.002;
      m.mat.uniforms.rimStrength.value = RIM * this.solid[i];
    });
    this.volWeight = vol;
    this.volume.visible = vol > 0.002;
    this.volColor.uniforms.rimStrength.value = RIM * vol;
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

    this.renderNormals();
    this.renderMask(dt);
    this.composer.render(dt);

    this.raf = requestAnimationFrame(this.frame);
  };

  /**
   * Pase de normales y profundidad para los contornos. Solo entra lo que domina en ese instante
   * (malla o volumen), para que durante el relevo no se dibujen dos contornos superpuestos.
   */
  private renderNormals() {
    const r = this.renderer;
    const meshVis = this.models.map((m, i) => {
      const was = m.group.visible;
      m.group.visible = this.solid[i] > 0.5;
      return was;
    });
    const volVis = this.volume.visible;
    this.volume.visible = false;

    this.scene.overrideMaterial = this.normalMat;
    r.setRenderTarget(this.nTarget);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(this.scene, this.camera);
    this.scene.overrideMaterial = null;
    if (this.volWeight >= 0.5) {
      // El volumen escribe su propia profundidad (gl_FragDepth) en el mismo búfer.
      this.volume.visible = true;
      this.volume.material = this.volNormal;
      r.autoClear = false;
      r.render(this.volume, this.camera);
      r.autoClear = true;
      this.volume.material = this.volColor;
    }
    r.setRenderTarget(null);
    r.setClearColor(raw(INK), 1);

    this.models.forEach((m, i) => (m.group.visible = meshVis[i]));
    this.volume.visible = volVis;
  }

  /**
   * Avanza la estela: el pincel sigue al puntero con un pequeño retraso y pinta el trazo desde su
   * posición anterior, así un movimiento rápido deja un surco continuo y no una ristra de círculos.
   */
  private renderMask(dt: number) {
    const p = this.pointer,
      b = this.brush;
    this.presence += ((p.inside ? 1 : 0) - this.presence) * (1 - Math.exp(-dt / 0.16));
    if (p.fresh) {
      b.x = b.px = p.x;
      b.y = b.py = p.y;
      p.fresh = false;
    } else {
      const follow = 1 - Math.exp(-dt / 0.035);
      b.x += (p.x - b.x) * follow;
      b.y += (p.y - b.y) * follow;
    }
    const u = this.maskMat.uniforms;
    u.tPrev.value = this.masks[0].texture;
    (u.uFrom.value as THREE.Vector2).set(b.px, b.py);
    (u.uTo.value as THREE.Vector2).set(b.x, b.y);
    u.uRadius.value = REVEAL_RADIUS * (0.45 + 0.55 * this.presence);
    u.uStrength.value = this.presence;
    u.uFade.value = REVEAL_LINGER > 0 ? dt / REVEAL_LINGER : 1;
    this.renderer.setRenderTarget(this.masks[1]);
    this.maskQuad.render(this.renderer);
    this.renderer.setRenderTarget(null);
    this.masks.reverse();
    b.px = b.x;
    b.py = b.y;
    this.ditherPass.uniforms.tMask.value = this.masks[0].texture;

    // Ondas: el radio crece hasta cubrir la esquina más lejana y la intensidad cae al final.
    const now = performance.now();
    const { x: w, y: h } = u.uSize.value as THREE.Vector2;
    const width = this.ditherPass.uniforms.uBurstWidth.value as number;
    const slots = this.ditherPass.uniforms.uBursts.value as THREE.Vector4[];
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      if ((now - this.bursts[i].start) / 1000 >= BURST_SECONDS) this.bursts.splice(i, 1);
    }
    slots.forEach((v, i) => {
      const burst = this.bursts[i];
      if (!burst) return v.set(0, 0, 0, 0);
      const k = (now - burst.start) / 1000 / BURST_SECONDS;
      const reach = Math.hypot(Math.max(burst.x, w - burst.x), Math.max(burst.y, h - burst.y)) + width;
      v.set(burst.x, burst.y, reach * Math.sin((k * Math.PI) / 2), 1 - k * k * k);
    });
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (CLICK_BURST) {
      const rect = this.canvas.getBoundingClientRect();
      this.bursts.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, start: performance.now() });
      if (this.bursts.length > MAX_BURSTS) this.bursts.shift();
    }
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
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = e.clientX - rect.left;
    this.pointer.y = e.clientY - rect.top;
    if (!this.pointer.inside) {
      this.pointer.inside = true;
      this.pointer.fresh = true;
    }
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
    this.pointer.inside = false;
  };
}

/** Triángulos de un grupo en el espacio de su raíz (las mallas del Builder ya no tienen índice). */
function trianglesOf(group: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  const total = meshes.reduce((s, m) => s + m.geometry.attributes.position.count, 0);
  const out = new Float32Array(total * 3);
  const v = new THREE.Vector3();
  let k = 0;
  for (const m of meshes) {
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      out[k++] = v.x;
      out[k++] = v.y;
      out[k++] = v.z;
    }
  }
  return out;
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

// ---------- Volumen: raymarching de la mezcla de SDF, con el mismo brillo de borde ----------
function makeVolume(uniforms: Record<string, THREE.IUniform>, normalPass: boolean) {
  return new THREE.ShaderMaterial({
    uniforms,
    defines: normalPass ? { NORMAL_PASS: "" } : {},
    // En color, el brillo se suma: durante el relevo malla y volumen se reparten la luz en vez de
    // pelearse por la profundidad.
    transparent: !normalPass,
    blending: normalPass ? THREE.NoBlending : THREE.AdditiveBlending,
    depthWrite: normalPass,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vCam;
      void main() {
        vPos = position;
        vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      precision highp sampler3D;
      uniform sampler3D uSdf;
      uniform vec4 uW;
      uniform vec3 uMin, uSize;
      uniform float uH, uBulge;
      uniform vec3 rimColor;
      uniform float rimPower, rimStrength;
      uniform mat4 modelViewMatrix, projectionMatrix;
      uniform mat3 normalMatrix;
      varying vec3 vPos;
      varying vec3 vCam;

      float map(vec3 p) { return dot(texture(uSdf, (p - uMin) / uSize), uW) - uBulge; }

      void main() {
        vec3 rd = normalize(vPos - vCam);
        vec3 t0 = (uMin - vCam) / rd, t1 = (uMin + uSize - vCam) / rd;
        vec3 tx = max(t0, t1);
        float tFar = min(min(tx.x, tx.y), tx.z);
        float t = length(vPos - vCam);
        vec3 p;
        bool hit = false;
        for (int i = 0; i < 160; i++) {
          p = vCam + rd * t;
          float d = map(p);
          if (d < uH * 0.08) { hit = true; break; }
          t += max(d, uH * 0.3);
          if (t > tFar) break;
        }
        if (!hit) discard;

        vec2 e = vec2(uH, 0.0);
        vec3 n = normalize(vec3(
          map(p + e.xyy) - map(p - e.xyy),
          map(p + e.yxy) - map(p - e.yxy),
          map(p + e.yyx) - map(p - e.yyx)));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 vn = normalize(normalMatrix * n);
        vec4 clip = projectionMatrix * mv;
        gl_FragDepth = clip.z / clip.w * 0.5 + 0.5;
      #ifdef NORMAL_PASS
        gl_FragColor = vec4(vn * 0.5 + 0.5, 1.0);
      #else
        float f = 1.0 - clamp(dot(vn, normalize(-mv.xyz)), 0.0, 1.0);
        gl_FragColor = vec4(rimColor * pow(f, rimPower) * rimStrength, 1.0);
      #endif
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

// ---------- Estela del puntero: la anterior, apagada un poco, más el trazo de este frame ----------
function makeMask() {
  return new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tPrev: { value: null },
      uSize: { value: new THREE.Vector2(1, 1) },
      uFrom: { value: new THREE.Vector2() },
      uTo: { value: new THREE.Vector2() },
      uRadius: { value: REVEAL_RADIUS },
      uSoftness: { value: REVEAL_SOFTNESS },
      uStrength: { value: 0 },
      uFade: { value: 1 },
      uHold: { value: REVEAL_HOLD },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tPrev;
      uniform vec2 uSize, uFrom, uTo;
      uniform float uRadius, uSoftness, uStrength, uFade, uHold;
      varying vec2 vUv;
      float stroke(vec2 p, vec2 a, vec2 b) {
        vec2 ab = b - a;
        float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
        return length(p - a - ab * h);
      }
      void main() {
        // El puntero llega en px CSS desde arriba; la textura tiene el origen abajo.
        vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
        float trail = max(texture2D(tPrev, vUv).r - uFade, 0.0);
        float band = max(uRadius * uSoftness, 1.0) * uHold;
        trail = max(trail, clamp((uRadius - stroke(p, uFrom, uTo)) / band, 0.0, 1.0) * uStrength);
        gl_FragColor = vec4(trail, 0.0, 0.0, 1.0);
      }`,
  });
}

// ---------- Trama: dos tintas por celdas de ruido azul; la máscara deja ver el render limpio ----------
function makeDither(dpr: number) {
  return {
    uniforms: {
      tDiffuse: { value: null },
      tMask: { value: null },
      tNoise: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uSize: { value: new THREE.Vector2(1, 1) },
      uCell: { value: Math.max(1, Math.round(DITHER_PX * dpr)) },
      uContrast: { value: DITHER_CONTRAST },
      uHold: { value: REVEAL_HOLD },
      // El tono se mide entre el fondo y el brillo del render; la trama sale con sus propias tintas.
      uFromInk: { value: raw(INK) },
      uFromPaper: { value: raw(GLOW) },
      uInk: { value: raw(INK) },
      uPaper: { value: raw(DITHER_PAPER) },
      uBursts: { value: Array.from({ length: MAX_BURSTS }, () => new THREE.Vector4()) },
      uBurstWidth: { value: Math.max(60, REVEAL_RADIUS * 0.9) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse, tMask, tNoise;
      uniform vec2 uResolution, uSize;
      uniform float uCell, uContrast, uHold, uBurstWidth;
      uniform vec3 uFromInk, uFromPaper, uInk, uPaper;
      uniform vec4 uBursts[${MAX_BURSTS}];
      varying vec2 vUv;

      float bayer(vec2 cell) {
        ivec2 p = ivec2(mod(cell, 8.0));
        int v = p.x ^ p.y;
        int m = ((v & 1) << 5) | ((p.y & 1) << 4) | ((v & 2) << 2) | ((p.y & 2) << 1) | ((v & 4) >> 1) | ((p.y & 4) >> 2);
        return (float(m) + 0.5) / 64.0;
      }
      float blueNoise(vec2 cell) {
        return (texelFetch(tNoise, ivec2(mod(cell, ${BLUE_NOISE_SIZE}.0)), 0).r * 255.0 + 0.5) / 256.0;
      }
      float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
      // Anillo de la onda: borde exterior nítido, cola interior más larga.
      float shockwave(vec2 p) {
        float value = 0.0;
        for (int i = 0; i < ${MAX_BURSTS}; i++) {
          vec4 b = uBursts[i];
          if (b.w <= 0.0) continue;
          float offset = distance(p, b.xy) - b.z;
          float edge = offset > 0.0 ? offset / (uBurstWidth * 0.35) : -offset / uBurstWidth;
          value = max(value, clamp(1.0 - edge, 0.0, 1.0) * b.w);
        }
        return value;
      }

      void main() {
        vec2 cell = floor(gl_FragCoord.xy / uCell);
        vec2 cellUv = (cell + 0.5) * uCell / uResolution;
        vec3 photo = texture2D(tDiffuse, vUv).rgb;

        // El tono se mide entre el fondo del render y su brillo, no desde el negro: así el fondo
        // queda limpio, sin puntos sueltos.
        float ink = luma(uFromInk);
        float t = (luma(texture2D(tDiffuse, cellUv).rgb) - ink) / (luma(uFromPaper) - ink);
        t = pow(clamp((t - 0.5) * uContrast + 0.5, 0.0, 1.0), 1.6);
        vec3 dithered = mix(uInk, uPaper, step(blueNoise(cell), t));

        // El borde de la ventana se deshace con otra ordenación Bayer (traspuesta) para que no
        // coincida con la de la trama.
        vec2 point = vec2(cellUv.x, 1.0 - cellUv.y) * uSize;
        float shown = max(clamp(texture2D(tMask, cellUv).r * uHold, 0.0, 1.0), shockwave(point));
        gl_FragColor = vec4(mix(dithered, photo, step(bayer(cell.yx), shown)), 1.0);
      }`,
  };
}
