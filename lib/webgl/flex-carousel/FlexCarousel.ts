import { clamp01, easeInOut, easeOut } from "@/lib/easing";
import { clampToEdge, createProgram, createVao } from "../gl";
import { cardFragment, cardVertex, lensFragment, lensVertex } from "./shaders";

/**
 * Carrete de fotos: FlexCarousel de React Bits (reactbits.dev/components/flex-carousel)
 * portado a WebGL2 a pelo, sin React ni OGL. Port 1:1 de actOneCarrusel() de mockup/v4.
 *
 * Dos pasadas: las fotos se pintan como tarjetas planas en un render target, y una segunda
 * pasada a pantalla completa lo mira a través de una "lente" invisible que curva los laterales
 * y separa el color en los bordes (dispersión).
 *
 * Sin entradas propias (ni rueda, ni arrastre, ni flechas, ni muelle de posición, ni bucle): la
 * posición es función lineal del progreso que le dan (applyProgress), y el centrado de cada
 * foto lo remata el imán de la escena. El "focus on click" del original se reaprovecha como la
 * separación al entrar en un proyecto (setFocus): las demás se apartan y la lente se endereza.
 *
 * La entrada también la pilota el scroll (applyIntro): cada tarjeta llega a su sitio por una
 * trayectoria curva desde abajo a la derecha, ladeándose con la tangente como un coche en una
 * curva, y la lente se forma cuando ya casi han llegado. Si se vuelve a subir, se deshace.
 */

export interface LensConfig {
  width: number;
  height: number;
  tilt: number;
  roundness: number;
  bend: number;
  reach: number;
  curl: number;
  dispersion: number;
}

export interface FlexCarouselOptions {
  /** URL de la portada de cada tarjeta. Necesitan CORS para ser texturas. */
  covers: readonly string[];
  lens: LensConfig;
  /** Cuánto se deforma la lente con la velocidad de la cinta (muelle). */
  liquid: number;
  /** Cuánto encogen las tarjetas con la velocidad del scroll. */
  squeeze: number;
  reduced: boolean;
  /** Alto de tarjeta como fracción del alto del lienzo (lo lee de la variable CSS en cada resize). */
  readCardFrac: () => number;
  onActive: (index: number) => void;
}

export interface CardHit {
  index: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

interface Slot {
  tex: WebGLTexture;
  image: [number, number];
  color: [number, number, number];
  loaded: boolean;
  ready: number;
}

interface Metrics {
  cardH: number;
  widths: number[];
  centers: number[];
}

interface IntroFx {
  sceneAlpha: number;
  strength: number;
  card: ((rel: number, cardH: number) => { alpha: number; x: number; y: number; scale: number; angle: number }) | null;
}

// Todas las tarjetas 3:4 (el fit "portrait" del original): el shader recorta cada foto tipo
// cover dentro de ese marco. Sin hueco entre ellas: la fila se lee como una tira de película.
const RATIO = 3 / 4;
const GAP = 0;
const RADIUS = 0; // estética plana de la web (el original lo permite redondeado)
const PIXEL_BUDGET = 4.5e6; // techo de píxeles del lienzo (baja el dpr en pantallas grandes)
/** Fracción de la entrada que se espera la tarjeta más alejada del centro (la del centro sale ya). */
const INTRO_STAGGER = 0.38;
/** Cuánto de la tangente de la trayectoria se convierte en giro de la tarjeta (1 = todo). */
const INTRO_BANK = 0.24;

export class FlexCarousel {
  /** Una promesa por portada; resuelve con load o con error (la pantalla de carga las cuenta). */
  readonly loads: Promise<void>[];

  private readonly gl: WebGL2RenderingContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly host: HTMLElement;
  private readonly o: FlexCarouselOptions;
  private readonly n: number;
  private readonly cardProg;
  private readonly lensProg;
  private readonly quad: WebGLVertexArrayObject;
  private readonly tri: WebGLVertexArrayObject;
  private readonly sceneTex: WebGLTexture;
  private readonly fbo: WebGLFramebuffer;
  private readonly aniso: EXT_texture_filter_anisotropic | null;
  private readonly slots: Slot[];
  private readonly resizeObs: ResizeObserver;
  private readonly visObs: IntersectionObserver;

  private rtW = 2;
  private rtH = 2;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private cardFrac = 0.5;
  private raf = 0;
  private last = performance.now();
  private visible = true;
  private dirty = true;
  private destroyed = false;
  private lastP = 0;
  private pos = 0;
  private lastPos: number | null = null;
  private energy = 0;
  private deform = 0;
  private deformVel = 0;
  private active = -1;
  private instances: CardHit[] = [];
  private projectIndex = -1;
  private introT = 0;
  private readonly focus = { t: 0, v: 0, target: 0 };

  /** null si no hay WebGL2: el bloque cae a su modo sin carrete. */
  static create(host: HTMLElement, options: FlexCarouselOptions) {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) return null;
    host.prepend(canvas);
    return new FlexCarousel(host, canvas, gl, options);
  }

  private constructor(host: HTMLElement, canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, o: FlexCarouselOptions) {
    this.host = host;
    this.canvas = canvas;
    this.gl = gl;
    this.o = o;
    this.n = o.covers.length;

    this.cardProg = createProgram(gl, cardVertex, cardFragment);
    this.lensProg = createProgram(gl, lensVertex, lensFragment);
    this.quad = createVao(gl, [-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]); // TRIANGLE_STRIP
    this.tri = createVao(gl, [-1, -1, 3, -1, -1, 3]); // triángulo a pantalla completa

    // Render target de la escena plana. Con mipmaps: la lente estira y comprime la imagen, y
    // sin ellos los bordes curvados parpadean al moverse.
    this.sceneTex = gl.createTexture()!;
    this.fbo = gl.createFramebuffer()!;
    this.aniso = gl.getExtension("EXT_texture_filter_anisotropic");

    const loads: Promise<void>[] = [];
    this.slots = o.covers.map((src) => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      clampToEdge(gl);
      const slot: Slot = { tex, image: [1, 1], color: [0.5, 0.5, 0.5], loaded: false, ready: 0 };
      loads.push(this.loadCover(slot, src));
      return slot;
    });
    this.loads = loads;

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
    this.visObs = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.wake();
    });
    this.visObs.observe(host);
    document.addEventListener("visibilitychange", this.onVisibility);

    this.resize();
  }

  // ---------- API ----------

  /** Entrada, 0 = fuera, 1 = en su sitio. La da el bloque a partir del scroll; es reversible. */
  applyIntro(t: number) {
    const v = clamp01(t);
    if (v === this.introT) return;
    this.introT = v;
    this.wake();
  }

  get count() {
    return this.n;
  }

  get introDone() {
    return this.introT >= 1;
  }

  get activeIndex() {
    return this.active;
  }

  /** Motor único: la posición de la cinta es el progreso de la escena. Se ignora en un proyecto. */
  applyProgress(p: number) {
    if (this.projectIndex >= 0) return;
    this.lastP = clamp01(p);
    this.wake();
  }

  /** Tarjeta tapada por el marco de un proyecto (-1 = ninguna). Congela el carrete. */
  setProject(index: number) {
    this.projectIndex = index;
    this.wake();
  }

  /** 1 = separación (las demás se apartan, la lente se endereza); 0 = vuelta. */
  setFocus(target: number) {
    this.focus.target = target;
    this.wake();
  }

  /**
   * Hit test contra los rectángulos planos de la última pasada (antes de la lente), como el
   * original: en los laterales la foto curvada no coincide al píxel, pero ahí solo se pide "ir
   * a esta foto", no abrirla. De cerca a lejos porque la del centro se pinta encima.
   */
  hitTest(clientX: number, clientY: number): CardHit | null {
    if (this.projectIndex >= 0 || !this.introDone) return null;
    const r = this.host.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    for (let k = this.instances.length - 1; k >= 0; k--) {
      const inst = this.instances[k];
      if (x >= inst.x0 && x <= inst.x1 && y >= inst.y0 && y <= inst.y1) return inst;
    }
    return null;
  }

  /** Rectángulo en viewport de la tarjeta i tal como está ahora (plana, sin lente). */
  cardRect(i: number) {
    const m = this.metrics();
    const r = this.host.getBoundingClientRect();
    const cx = r.left + this.width / 2 + (m.centers[i] - this.posAt(m, this.lastP));
    return { left: cx - m.widths[i] / 2, top: r.top + this.height / 2 - m.cardH / 2, width: m.widths[i], height: m.cardH };
  }

  /** Relee tamaño. El ResizeObserver lo hace solo; se expone para medir antes de que llegue. */
  resize() {
    if (this.destroyed) return;
    this.width = Math.max(1, this.host.clientWidth);
    this.height = Math.max(1, this.host.clientHeight);
    this.cardFrac = this.o.readCardFrac() || 0.5;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / (this.width * this.height)));
    this.canvas.width = Math.max(2, Math.round(this.width * this.dpr));
    this.canvas.height = Math.max(2, Math.round(this.height * this.dpr));
    this.sizeTarget(this.canvas.width, this.canvas.height);
    this.lastPos = null; // el cambio de ancho no es velocidad: que no encoja las tarjetas
    this.wake();
  }

  /** Idempotente (StrictMode monta y desmonta dos veces). */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.visObs.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.canvas.remove();
  }

  // ---------- carga ----------

  private loadCover(slot: Slot, src: string) {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        // La promesa resuelve aunque el carrete ya no exista: la pantalla de carga la cuenta.
        if (!this.destroyed) this.upload(slot, img);
        resolve();
      };
      // Un error cuenta como cargado; la tarjeta se queda en su gris.
      img.onerror = () => {
        this.wake();
        resolve();
      };
      img.src = src;
    });
  }

  private upload(slot: Slot, img: HTMLImageElement) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, slot.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    slot.image = [img.naturalWidth || 1, img.naturalHeight || 1];
    // Color medio: placeholder mientras la textura entra con fundido.
    try {
      const probe = document.createElement("canvas");
      probe.width = probe.height = 8;
      const ctx = probe.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, 8, 8);
      const data = ctx.getImageData(0, 0, 8, 8).data;
      const avg = [0, 0, 0];
      for (let i = 0; i < data.length; i += 4) {
        avg[0] += data[i];
        avg[1] += data[i + 1];
        avg[2] += data[i + 2];
      }
      slot.color = avg.map((v) => v / 64 / 255) as Slot["color"];
    } catch {
      /* sin color medio: se queda el gris */
    }
    slot.loaded = true;
    this.wake();
  }

  private sizeTarget(w: number, h: number) {
    const gl = this.gl;
    this.rtW = w;
    this.rtH = h;
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    clampToEdge(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ---------- geometría ----------

  /** Ancho = RATIO × alto, igual para todas. Centros acumulados en una fila sin bucle. */
  private metrics(): Metrics {
    const cardH = Math.max(24, this.cardFrac * this.height);
    const widths = this.slots.map(() => RATIO * cardH);
    const centers: number[] = [];
    let cursor = 0;
    for (const w of widths) {
      centers.push(cursor + w / 2);
      cursor += w + GAP;
    }
    return { cardH, widths, centers };
  }

  /**
   * Mapeo LINEAL por foto: el progreso se reparte en N-1 tramos iguales y cada tramo recorre la
   * distancia entre dos centros. Así cada foto queda centrada exactamente en p = i/(N-1), que es
   * lo que asume el imán, aunque los anchos llegaran a ser distintos.
   */
  private posAt(m: Metrics, p: number) {
    if (this.n < 2) return m.centers[0];
    const f = clamp01(p) * (this.n - 1);
    const i = Math.min(this.n - 2, Math.floor(f));
    return m.centers[i] + (f - i) * (m.centers[i + 1] - m.centers[i]);
  }

  private introEffects(): IntroFx {
    const e: IntroFx = { sceneAlpha: 1, strength: 1, card: null };
    const t = this.introT;
    if (t >= 1) return e;
    if (this.o.reduced) {
      // Sin trayectoria: la cinta aparece en su sitio con el mismo tramo de scroll.
      e.sceneAlpha = easeOut(t);
      e.strength = easeOut(t);
      return e;
    }
    const { width: W, height: H } = this;
    // La lente se forma al final, cuando las tarjetas ya casi han llegado: en el viaje van planas.
    e.strength = easeInOut((t - 0.6) / 0.4);
    e.card = (rel, cardH) => {
      const delay = Math.min(Math.abs(rel) / W, 1) * INTRO_STAGGER;
      const local = clamp01((t - delay) / (1 - INTRO_STAGGER));
      const u = easeOut(local);
      // Bézier cúbica relativa al destino (0,0): nace bajo el borde inferior, a la derecha, sube
      // casi en vertical y gira hacia la izquierda hasta entrar en la fila en horizontal.
      const ax = W * 0.42;
      const ay = H / 2 + cardH / 2 + H * 0.12;
      const p0x = ax, p0y = ay;
      const p1x = ax, p1y = ay * 0.18;
      const p2x = ax * 0.38, p2y = 0;
      const v = 1 - u;
      const x = v * v * v * p0x + 3 * v * v * u * p1x + 3 * v * u * u * p2x;
      const y = v * v * v * p0y + 3 * v * v * u * p1y + 3 * v * u * u * p2y;
      // Tangente (derivada) para ladear la tarjeta. Al llegar apunta a la izquierda (-x): ahí el
      // giro es 0; en la subida, vertical, el giro es el máximo.
      const tx = 3 * v * v * (p1x - p0x) + 6 * v * u * (p2x - p1x) + 3 * u * u * (0 - p2x);
      const ty = 3 * v * v * (p1y - p0y) + 6 * v * u * (p2y - p1y) + 3 * u * u * (0 - p2y);
      let ang = Math.atan2(ty, tx) - Math.PI;
      if (ang < -Math.PI) ang += 2 * Math.PI;
      return {
        alpha: clamp01(local * 6),
        x,
        y,
        scale: 0.62 + 0.38 * easeInOut(local),
        angle: ang * INTRO_BANK,
      };
    };
    return e;
  }

  // ---------- render ----------

  private draw(m: Metrics, focusEase: number, effects: IntroFx) {
    const { gl, width, height, dpr } = this;
    const { lens } = this.o;
    const homeX = width / 2;
    const homeY = height / 2;
    const shrink = 1 - this.o.squeeze * this.energy;
    const hidden = this.projectIndex; // la tapa el marco del proyecto
    const draws: { i: number; rel: number; x: number; y: number; cw: number; ch: number; alpha: number; angle: number }[] = [];

    for (let i = 0; i < this.n; i++) {
      if (i === hidden) continue;
      const w = m.widths[i];
      const rel = m.centers[i] - this.pos;
      if (Math.abs(rel) - w / 2 > width + 40) continue;
      const fx = effects.card ? effects.card(rel, m.cardH) : null;
      // El encogido por velocidad escala también la distancia al centro, no solo la tarjeta:
      // si no, con GAP = 0 se abrirían huecos entre fotos al correr.
      let x = homeX + rel * shrink + (fx ? fx.x : 0);
      const scale = shrink * (fx ? fx.scale : 1);
      let alpha = fx ? fx.alpha : 1;
      if (focusEase > 0 && i !== this.projectIndex) {
        // Separación al entrar en un proyecto: las demás se apartan hacia su lado y se apagan,
        // las más cercanas primero.
        const order = Math.min(Math.abs(rel) / width, 1) * 0.25;
        const part = easeInOut(clamp01(this.focus.t) * 1.25 - order);
        x += Math.sign(rel) * part * width * 0.7;
        alpha *= 1 - part;
      }
      const cw = w * scale;
      if (alpha <= 0.001 || x + cw / 2 < -40 || x - cw / 2 > width + 40) continue;
      const y = homeY + (fx ? fx.y : 0);
      if (y - m.cardH / 2 > height + 40) continue; // aún bajo el borde, en su trayectoria
      draws.push({ i, rel, x, y, cw, ch: m.cardH * scale, alpha, angle: fx ? fx.angle : 0 });
    }
    // De lejos a cerca: la del centro se pinta la última, encima de todo.
    draws.sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.rtW, this.rtH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.cardProg.p);
    gl.bindVertexArray(this.quad);
    const cu = this.cardProg.u;
    gl.uniform2f(cu.uResolution, width, height);
    gl.uniform1f(cu.uDpr, dpr);
    gl.uniform1f(cu.uRadius, RADIUS);
    gl.uniform1i(cu.tMap, 0);
    gl.activeTexture(gl.TEXTURE0);
    this.instances = [];
    for (const d of draws) {
      const slot = this.slots[d.i];
      gl.bindTexture(gl.TEXTURE_2D, slot.tex);
      gl.uniform4f(cu.uRect, d.x, d.y, d.cw + 2, d.ch + 2);
      gl.uniform1f(cu.uAngle, d.angle);
      gl.uniform2f(cu.uSize, d.cw, d.ch);
      gl.uniform2f(cu.uImage, slot.image[0], slot.image[1]);
      gl.uniform1f(cu.uAlpha, d.alpha);
      gl.uniform1f(cu.uReady, slot.ready);
      gl.uniform1f(cu.uShift, this.o.reduced ? 0 : Math.max(-1, Math.min(1, d.rel / (width * 0.75))));
      gl.uniform3f(cu.uPlaceholder, slot.color[0], slot.color[1], slot.color[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      this.instances.push({ index: d.i, x0: d.x - d.cw / 2, x1: d.x + d.cw / 2, y0: d.y - d.ch / 2, y1: d.y + d.ch / 2 });
    }
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.lensProg.p);
    gl.bindVertexArray(this.tri);
    const lu = this.lensProg.u;
    const liquid = this.o.reduced ? 0 : this.o.liquid;
    const squash = Math.abs(this.deform) * liquid;
    const halfW = Math.max(1, ((lens.width * width) / 2) * (1 + squash * 0.16));
    const halfH = Math.max(1, ((lens.height * width) / 2) * (1 - squash * 0.08));
    const inner = Math.max(4, lens.reach * (halfW + halfH) * 0.5);
    gl.uniform1i(lu.tScene, 0);
    gl.uniform2f(lu.uResolution, width, height);
    gl.uniform1f(lu.uDpr, dpr);
    gl.uniform2f(lu.uCenter, homeX - this.deform * 14 * liquid, homeY);
    gl.uniform2f(lu.uHalf, halfW, halfH);
    gl.uniform1f(lu.uAngle, (lens.tilt * Math.PI) / 180);
    gl.uniform1f(lu.uExponent, 2 + Math.pow(1 - clamp01(lens.roundness), 1.5) * 10);
    gl.uniform1f(lu.uInner, inner);
    gl.uniform1f(lu.uOuter, inner * 1.6);
    gl.uniform1f(lu.uFlow, lens.bend * (halfW + halfH) * 0.45);
    gl.uniform1f(lu.uCurl, lens.curl);
    gl.uniform1f(lu.uDispersion, lens.dispersion * 0.12 * (1 + Math.abs(this.deform) * liquid * 1.2));
    // La lente se endereza al entrar en un proyecto: el marco crece desde una tarjeta plana.
    gl.uniform1f(lu.uStrength, effects.strength * (1 - focusEase));
    gl.uniform1f(lu.uSceneAlpha, effects.sceneAlpha);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.destroyed) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    const m = this.metrics();
    const { focus, o } = this;
    let animating = false;

    this.pos = this.posAt(m, this.lastP);
    if (this.lastPos === null) this.lastPos = this.pos;
    // "Energía": velocidad de la cinta suavizada. Encoge un poco las tarjetas mientras corre,
    // que es lo que da la sensación de materia elástica del original.
    const vel = (this.pos - this.lastPos) / dt;
    const travel = Math.abs(vel);
    this.lastPos = this.pos;
    const target = o.reduced ? 0 : Math.min(travel / 2600, 1);
    this.energy += (target - this.energy) * (1 - Math.exp(-dt / (target > this.energy ? 0.07 : 0.35)));
    if (this.energy > 0.001) animating = true;
    else this.energy = 0;
    // Deformación "liquid": muelle subamortiguado hacia la velocidad con signo, así la lente
    // rebota un poco al parar en vez de volver en seco.
    const push = Math.max(-1, Math.min(1, vel / 2200));
    const dk = 120;
    this.deformVel += (dk * (push - this.deform) - 2 * Math.sqrt(dk) * 0.32 * this.deformVel) * dt;
    this.deform += this.deformVel * dt;
    if (Math.abs(this.deform) > 0.0005 || Math.abs(this.deformVel) > 0.005) animating = true;
    else {
      this.deform = 0;
      this.deformVel = 0;
    }

    const idx = this.projectIndex >= 0 ? this.projectIndex : this.n < 2 ? 0 : Math.round(this.lastP * (this.n - 1));
    if (idx !== this.active) {
      this.active = idx;
      o.onActive(idx);
    }

    const k = 64;
    focus.v += (k * (focus.target - focus.t) - 2 * Math.sqrt(k) * focus.v) * dt;
    focus.t += focus.v * dt;
    if (Math.abs(focus.target - focus.t) < 0.0005 && Math.abs(focus.v) < 0.001) {
      focus.t = focus.target;
      focus.v = 0;
    } else animating = true;
    const focusEase = o.reduced ? focus.target : easeInOut(clamp01(focus.t));

    for (const s of this.slots) {
      if (s.loaded && s.ready < 1) {
        s.ready = Math.min(1, s.ready + dt / 0.45);
        animating = true;
      }
    }

    if (this.dirty || animating) {
      this.dirty = false;
      this.draw(m, focusEase, this.introEffects());
    }
    if (this.visible && animating) this.raf = requestAnimationFrame(this.frame);
  };

  private wake() {
    this.dirty = true;
    if (this.raf || !this.visible || this.destroyed) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private onVisibility = () => {
    if (!document.hidden) this.wake();
  };
}
