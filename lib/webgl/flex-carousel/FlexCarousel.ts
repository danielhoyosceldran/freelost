import { clamp01, easeInOut, easeOut, easeOutQuint } from "@/lib/easing";
import { clampToEdge, createProgram, createVao } from "../gl";
import { cardFragment, cardVertex, lensFragment, lensVertex } from "./shaders";

/**
 * Carrete de proyectos: FlexCarousel de React Bits (reactbits.dev/components/flex-carousel)
 * portado a WebGL2 a pelo, sin React ni OGL. La física, la intro "rise", el ajuste "natural" y el
 * bucle infinito siguen el código del original (src/content/Components/FlexCarousel); lo que
 * cambia está anotado donde ocurre.
 *
 * Dos pasadas: las tarjetas se pintan planas en un render target, y una segunda pasada a
 * pantalla completa lo mira a través de una "lente" invisible que curva los laterales y separa
 * el color en los bordes (dispersión). La lente se puede apagar (setLens): en móvil no se usa.
 *
 * Entradas propias, como el original con captureWheel = false: arrastre con inercia y muelle
 * hacia la tarjeta más cercana, flechas izquierda/derecha, Inicio/Fin, y la rueda solo si es
 * horizontal (el gesto lateral del trackpad); la vertical es de la página. El "focus on click"
 * del original se sustituye por la vista de proyecto del bloque: onSelect al pulsar la del
 * centro (o al llegar a una lateral pulsada), y setFocus/setProject para su coreografía.
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
  /** Cuánto encogen las tarjetas con la velocidad de la cinta. */
  squeeze: number;
  /** Separación entre tarjetas (px). */
  gap: number;
  /** Ancho/alto fijo de todas las tarjetas; sin él, "natural": el de cada portada. */
  aspect?: number;
  /** Proporción supuesta mientras una portada natural no ha cargado. */
  fallbackAspect: number;
  reduced: boolean;
  /** Alto de tarjeta como fracción del alto del lienzo (lo lee de la variable CSS en cada resize). */
  readCardFrac: () => number;
  onActive: (index: number) => void;
  /** Se pulsa la tarjeta del centro (o Intro/Espacio con el foco en el carrete). */
  onSelect: (index: number) => void;
  /** Fin de la intro. */
  onRevealed: () => void;
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
  aspect: number;
  color: [number, number, number];
  loaded: boolean;
  ready: number;
}

interface Metrics {
  cardH: number;
  widths: number[];
  centers: number[];
  /** Largo de una vuelta completa (todas las tarjetas y sus huecos). */
  loop: number;
}

interface IntroFx {
  sceneAlpha: number;
  strength: number;
  card: ((rel: number) => { alpha: number; x: number; y: number; scale: number }) | null;
}

const RADIUS = 0; // estética plana de la web
const PIXEL_BUDGET = 4.5e6; // techo de píxeles del lienzo (baja el dpr en pantallas grandes)
// El rise dura algo más que en el original (2,1 s): las tarjetas llegan con calma.
const INTRO_S = { rise: 2.4, fade: 0.35 };
/** La tarjeta central se inclina hacia el cursor: desplazamiento máximo (px) y crecimiento. */
const LEAN_PX = { x: 7, y: 5 };
const LEAN_SCALE = 0.012;
/** Si alguna portada no llega, la intro no la espera más que esto (como el original). */
const INTRO_WAIT_MS = 3500;

/** Distancia con signo más corta en un bucle de largo `size` (el wrap del original). */
const wrap = (value: number, size: number) => ((((value + size / 2) % size) + size) % size) - size / 2;

export class FlexCarousel {
  /** Una promesa por portada; resuelve con load o con error. */
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
  private lensOn = true;
  private lensT = 1;

  // Posición de la cinta (px a lo largo de la fila), su objetivo y su velocidad.
  private pos = 0;
  private goal = 0;
  private vel = 0;
  private mode: "spring" | "wheel" = "spring";
  private wheelAt = 0;
  private layout: Metrics | null = null;
  private lastPos = 0;
  private energy = 0;
  private deform = 0;
  private deformVel = 0;
  private active = -1;
  /** Lateral pulsada: al llegar al centro, se abre (el focus.pending del original). */
  private pending = -1;
  private instances: CardHit[] = [];
  private projectIndex = -1;
  private readonly pointer = {
    down: false,
    id: -1,
    touch: false,
    startX: 0,
    startY: 0,
    startPos: 0,
    dragging: false,
    samples: [] as { x: number; t: number }[],
  };
  private readonly intro = {
    kind: "rise" as "rise" | "fade",
    t: 0,
    requested: false,
    requestedAt: 0,
    running: false,
    done: false,
  };
  private readonly focus = { t: 0, v: 0, target: 0 };
  /** Inclinación de la tarjeta central hacia el cursor (x, y en -1..1; s = 0..1 de presencia). */
  private readonly lean = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0 };

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
      const slot: Slot = {
        tex,
        image: [1, 1],
        aspect: o.aspect ?? o.fallbackAspect,
        color: [0.5, 0.5, 0.5],
        loaded: false,
        ready: 0,
      };
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

    host.addEventListener("pointerdown", this.onPointerDown);
    host.addEventListener("pointermove", this.onPointerMove);
    host.addEventListener("pointerup", this.onPointerUp);
    host.addEventListener("pointercancel", this.onPointerCancel);
    host.addEventListener("wheel", this.onWheel, { passive: false });
    host.addEventListener("keydown", this.onKeyDown);

    this.resize();
  }

  // ---------- API ----------

  /**
   * Pide la intro. Arranca en cuanto las portadas han cargado (o pasados INTRO_WAIT_MS), como el
   * original; el bloque decide cuándo pedirla (al llegar a la sección, tras la pausa).
   */
  start() {
    if (this.intro.requested) return;
    this.intro.requested = true;
    this.intro.requestedAt = performance.now();
    this.wake();
  }

  /** Inclina la tarjeta central hacia el cursor (x, y en -1..1 sobre ella); on=false la suelta. */
  setLean(x: number, y: number, on: boolean) {
    if (this.o.reduced) return;
    this.lean.tx = on ? x : 0;
    this.lean.ty = on ? y : 0;
    this.lean.ts = on ? 1 : 0;
    this.wake();
  }

  get count() {
    return this.n;
  }

  get introDone() {
    return this.intro.done;
  }

  get activeIndex() {
    return this.active;
  }

  /** Lente de los bordes encendida o no (en móvil va plana). Transición corta, no salto. */
  setLens(on: boolean) {
    this.lensOn = on;
    if (this.o.reduced) this.lensT = on ? 1 : 0;
    this.wake();
  }

  /**
   * Mueve la cinta `px` píxeles (el scroll de la página mientras el carrete está clavado). Entra
   * por el mismo camino que la rueda lateral: se deja llevar y, al parar, encaja en una tarjeta.
   */
  nudge(px: number) {
    if (this.locked || this.pointer.dragging || px === 0) return;
    this.goal += px;
    this.mode = "wheel";
    this.wheelAt = performance.now();
    this.pending = -1;
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
   * original. De cerca a lejos porque la del centro se pinta encima.
   */
  hitTest(clientX: number, clientY: number): CardHit | null {
    if (this.projectIndex >= 0 || !this.intro.done) return null;
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
    const cx = r.left + this.width / 2 + wrap(m.centers[i] - this.pos, m.loop);
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
    const h = this.host;
    h.removeEventListener("pointerdown", this.onPointerDown);
    h.removeEventListener("pointermove", this.onPointerMove);
    h.removeEventListener("pointerup", this.onPointerUp);
    h.removeEventListener("pointercancel", this.onPointerCancel);
    h.removeEventListener("wheel", this.onWheel);
    h.removeEventListener("keydown", this.onKeyDown);
    h.removeAttribute("data-dragging");
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.canvas.remove();
  }

  // ---------- entradas ----------

  private local(e: PointerEvent): [number, number] {
    const r = this.host.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  /** Mientras hay un proyecto abierto o la intro no ha acabado, la cinta no se toca. */
  private get locked() {
    return this.projectIndex >= 0 || this.focus.target > 0 || !this.intro.done;
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button > 0 || this.locked) return;
    const [x, y] = this.local(e);
    const p = this.pointer;
    p.down = true;
    p.id = e.pointerId;
    p.touch = e.pointerType === "touch";
    p.startX = x;
    p.startY = y;
    p.startPos = this.pos;
    p.dragging = false;
    p.samples = [{ x, t: performance.now() }];
    this.pending = -1;
    // Coger la cinta en marcha la para en seco, como una mano sobre la película.
    if (Math.abs(this.vel) > 40) {
      this.goal = this.pos;
      this.vel = 0;
    }
    this.wake();
  };

  private onPointerMove = (e: PointerEvent) => {
    const p = this.pointer;
    if (!p.down || e.pointerId !== p.id) return;
    const [x, y] = this.local(e);
    const dx = x - p.startX;
    const dy = y - p.startY;
    const slop = p.touch ? 10 : 5;
    if (!p.dragging) {
      // En táctil, un gesto vertical es scroll de la página: se suelta y no se arrastra.
      if (p.touch && Math.abs(dy) > slop && Math.abs(dy) > Math.abs(dx)) {
        p.down = false;
        return;
      }
      if (Math.abs(dx) <= slop) return;
      p.dragging = true;
      p.startX = x;
      p.startPos = this.pos;
      try {
        this.host.setPointerCapture(e.pointerId);
      } catch {
        /* sin captura: se sigue arrastrando mientras el puntero esté encima */
      }
      this.host.setAttribute("data-dragging", "");
    }
    this.pos = p.startPos - (x - p.startX);
    this.goal = this.pos;
    this.vel = 0;
    const now = performance.now();
    p.samples.push({ x, t: now });
    while (p.samples.length > 2 && now - p.samples[0].t > 100) p.samples.shift();
    this.wake();
  };

  private onPointerUp = (e: PointerEvent) => {
    const p = this.pointer;
    if (!p.down || e.pointerId !== p.id) return;
    p.down = false;
    this.host.removeAttribute("data-dragging");
    const m = this.metrics();
    if (p.dragging) {
      p.dragging = false;
      // Velocidad de los últimos 100 ms. Si el dedo se paró antes de soltar, no hay lanzamiento.
      const now = performance.now();
      const first = p.samples[0];
      const last = p.samples[p.samples.length - 1];
      let velocity = 0;
      if (first && last && last.t > first.t && now - last.t < 70) {
        velocity = -((last.x - first.x) / (last.t - first.t)) * 1000;
      }
      this.vel = velocity;
      const landing = this.snapPoint(m, this.pos + velocity * 0.32);
      this.goal = landing;
      // Un golpe rápido que no llega a cambiar de tarjeta pasa igualmente a la siguiente.
      if (Math.abs(velocity) > 400 && Math.abs(landing - this.pos) < 1) this.step(m, velocity > 0 ? 1 : -1);
      this.mode = "spring";
      this.wake();
      return;
    }
    // Clic: la del centro se abre; una lateral viene al centro y se abre al llegar.
    const hit = this.hitTest(e.clientX, e.clientY);
    if (!hit) return;
    if (hit.index === this.active && Math.abs(this.goal - this.pos) < 2) {
      this.o.onSelect(hit.index);
    } else {
      const rel = (hit.x0 + hit.x1) / 2 - this.width / 2;
      this.goal = this.snapPoint(m, this.pos + rel);
      this.mode = "spring";
      this.pending = hit.index;
      this.wake();
    }
  };

  private onPointerCancel = () => {
    const p = this.pointer;
    p.down = false;
    p.dragging = false;
    this.host.removeAttribute("data-dragging");
    this.goal = this.snapPoint(this.metrics(), this.pos);
    this.mode = "spring";
    this.wake();
  };

  /**
   * Rueda: solo la horizontal (el gesto lateral del trackpad, o mayúsculas + rueda). La vertical
   * no se toca: es el scroll de la página (captureWheel = false del original).
   */
  private onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || this.locked) return;
    let dx = e.deltaX;
    let dy = e.deltaY;
    if (e.shiftKey && Math.abs(dx) < Math.abs(dy)) {
      dx = dy;
      dy = 0;
    }
    if (Math.abs(dx) <= Math.abs(dy)) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.height : 1;
    this.goal += Math.max(-120, Math.min(120, dx * unit)) * 1.25;
    this.mode = "wheel";
    this.wheelAt = performance.now();
    this.pending = -1;
    this.wake();
  };

  /** Flechas laterales e Inicio/Fin. Las verticales se quedan para la página. */
  private onKeyDown = (e: KeyboardEvent) => {
    if (this.locked) return;
    const m = this.metrics();
    if (e.key === "ArrowRight") this.step(m, 1);
    else if (e.key === "ArrowLeft") this.step(m, -1);
    else if (e.key === "Home") this.goTo(m, 0);
    else if (e.key === "End") this.goTo(m, this.n - 1);
    else if ((e.key === "Enter" || e.key === " ") && this.active >= 0) this.o.onSelect(this.active);
    else return;
    e.preventDefault();
  };

  // ---------- carga ----------

  private loadCover(slot: Slot, src: string) {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        if (!this.destroyed) this.upload(slot, img);
        resolve();
      };
      // Un error cuenta como cargado; la tarjeta se queda en su gris.
      img.onerror = () => {
        slot.loaded = true;
        slot.ready = 0;
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
    slot.aspect = slot.image[0] / slot.image[1];
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

  /** Ancho = proporción × alto (fija o la de cada portada). Centros acumulados con su hueco. */
  private metrics(): Metrics {
    const cardH = Math.max(24, this.cardFrac * this.height);
    const widths = this.slots.map((s) => (this.o.aspect ?? s.aspect) * cardH);
    const centers: number[] = [];
    let cursor = 0;
    for (const w of widths) {
      centers.push(cursor + w / 2);
      cursor += w + this.o.gap;
    }
    return { cardH, widths, centers, loop: Math.max(cursor, 1) };
  }

  private nearest(m: Metrics, at: number) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < m.centers.length; i++) {
      const dist = Math.abs(wrap(m.centers[i] - at, m.loop));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  private snapPoint(m: Metrics, at: number) {
    return at + wrap(m.centers[this.nearest(m, at)] - at, m.loop);
  }

  /**
   * Cambio de geometría (resize, o una portada natural que llega con otra proporción): se
   * mantiene la tarjeta que había en el centro y el desplazamiento proporcional dentro de ella.
   */
  private remap(from: Metrics, to: Metrics, at: number) {
    const i = this.nearest(from, at);
    const offset = wrap(at - from.centers[i], from.loop);
    const cycles = Math.round((at - offset - from.centers[i]) / from.loop);
    return cycles * to.loop + to.centers[i] + offset * (to.widths[i] / from.widths[i]);
  }

  private step(m: Metrics, delta: number) {
    let at = this.snapPoint(m, this.goal);
    let index = this.nearest(m, at);
    for (let k = 0; k < Math.abs(delta); k++) {
      const next = (index + (delta > 0 ? 1 : this.n - 1)) % this.n;
      at +=
        delta > 0
          ? m.widths[index] / 2 + this.o.gap + m.widths[next] / 2
          : -(m.widths[next] / 2 + this.o.gap + m.widths[index] / 2);
      index = next;
    }
    this.goal = at;
    this.mode = "spring";
    this.pending = -1;
    this.wake();
  }

  private goTo(m: Metrics, index: number) {
    const i = ((index % this.n) + this.n) % this.n;
    this.goal += wrap(m.centers[i] - this.goal, m.loop);
    this.mode = "spring";
    this.pending = -1;
    this.wake();
  }

  private introEffects(): IntroFx {
    const e: IntroFx = { sceneAlpha: 1, strength: 1, card: null };
    const intro = this.intro;
    if (!intro.running && !intro.done) {
      e.sceneAlpha = 0;
      e.strength = 0;
      return e;
    }
    const t = intro.done ? 1 : intro.t;
    if (t >= 1) return e;
    if (intro.kind === "rise") {
      // Las tarjetas suben desde abajo, en abanico desde el centro, y la lente se forma cuando
      // ya están casi en su sitio.
      e.strength = easeInOut((t - 0.3) / 0.65);
      e.card = (rel) => {
        const delay = Math.min(Math.abs(rel) / (this.width * 0.6), 1) * 0.34;
        const local = clamp01((t - delay) / 0.6);
        return {
          alpha: clamp01(local * 4),
          x: 0,
          y: (1 - easeOutQuint(local)) * this.height * 0.62,
          scale: 0.5 + 0.5 * easeInOut((local - 0.18) / 0.82),
        };
      };
    } else {
      e.sceneAlpha = easeOut(t);
      e.strength = easeOut(t);
    }
    return e;
  }

  // ---------- render ----------

  private draw(m: Metrics, focusEase: number, effects: IntroFx) {
    const { gl, width, height, dpr } = this;
    const { lens } = this.o;
    const homeX = width / 2;
    const homeY = height / 2;
    const shrink = 1 - clamp01(this.o.squeeze) * this.energy;
    const hidden = this.projectIndex; // la tapa el marco del proyecto
    const draws: { i: number; rel: number; x: number; y: number; cw: number; ch: number; alpha: number }[] = [];

    for (let i = 0; i < this.n; i++) {
      if (i === hidden) continue;
      const w = m.widths[i];
      const baseRel = wrap(m.centers[i] - this.pos, m.loop);
      // Bucle: la misma tarjeta puede verse más de una vez si la vuelta es más corta que la pantalla.
      for (let k = -3; k <= 3; k++) {
        const rel = baseRel + k * m.loop;
        if (Math.abs(rel) - w / 2 > width + 40) continue;
        const fx = effects.card ? effects.card(rel) : null;
        // La tarjeta del centro, la que se puede abrir, se arrima al cursor.
        const lead = i === this.active && Math.abs(rel) < w / 2;
        let x = homeX + rel + (fx ? fx.x : 0) + (lead ? this.lean.x * LEAN_PX.x : 0);
        const scale = shrink * (fx ? fx.scale : 1) * (lead ? 1 + LEAN_SCALE * this.lean.s : 1);
        let alpha = fx ? fx.alpha : 1;
        if (focusEase > 0) {
          // Separación al entrar en un proyecto: las demás se apartan hacia su lado y se apagan,
          // las más cercanas primero.
          const order = Math.min(Math.abs(rel) / width, 1) * 0.25;
          const part = easeInOut(clamp01(this.focus.t) * 1.25 - order);
          x += Math.sign(rel) * part * width * 0.7;
          alpha *= 1 - part;
        }
        const cw = w * scale;
        if (alpha <= 0.001 || x + cw / 2 < -40 || x - cw / 2 > width + 40) continue;
        draws.push({ i, rel, x, y: homeY + (fx ? fx.y : 0) + (lead ? this.lean.y * LEAN_PX.y : 0), cw, ch: m.cardH * scale, alpha });
      }
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
    // La lente se endereza al entrar en un proyecto (el marco crece desde una tarjeta plana) y
    // no existe si está apagada (móvil).
    gl.uniform1f(lu.uStrength, effects.strength * (1 - focusEase) * easeInOut(this.lensT));
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
    const { intro, focus, o, pointer } = this;
    let animating = false;

    // Geometría nueva: la cinta se recoloca sobre la misma tarjeta (ver remap).
    if (this.layout && this.layout.loop !== m.loop) {
      this.pos = this.remap(this.layout, m, this.pos);
      this.goal = this.remap(this.layout, m, this.goal);
      pointer.startPos = this.pos;
      animating = true;
    }
    this.layout = m;

    if (intro.requested && !intro.running && !intro.done) {
      const settled = this.slots.every((s) => s.loaded);
      if (settled || now - intro.requestedAt > INTRO_WAIT_MS) {
        this.goal = this.snapPoint(m, this.goal);
        this.pos = this.goal;
        intro.kind = o.reduced ? "fade" : "rise";
        intro.running = true;
      } else animating = true; // seguir mirando hasta que lleguen
    }
    if (intro.running) {
      intro.t = Math.min(1, intro.t + dt / INTRO_S[intro.kind]);
      if (intro.t >= 1) {
        intro.running = false;
        intro.done = true;
        o.onRevealed();
      }
      animating = true;
    }

    // La rueda lateral se deja llevar y, 150 ms después del último evento, encaja.
    if (this.mode === "wheel" && now - this.wheelAt > 150) {
      this.goal = this.snapPoint(m, this.goal);
      this.mode = "spring";
    }
    if (!pointer.dragging && this.projectIndex < 0) {
      // Muelle críticamente amortiguado, integrado en pasos de 1/240 s: estable a cualquier fps.
      const stiffness = this.mode === "wheel" ? 80 : 55;
      const damping = 2 * Math.sqrt(stiffness);
      const steps = Math.ceil(dt / (1 / 240));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        const acc = stiffness * (this.goal - this.pos) - damping * this.vel;
        this.vel += acc * h;
        this.pos += this.vel * h;
      }
      if (Math.abs(this.goal - this.pos) < 0.05 && Math.abs(this.vel) < 0.5) {
        this.pos = this.goal;
        this.vel = 0;
      } else animating = true;
    } else if (pointer.dragging) animating = true;

    // Sin derivas numéricas: a varias vueltas del origen, se recoloca todo una vuelta exacta.
    if (Math.abs(this.pos) > m.loop * 8) {
      const shift = Math.round(this.pos / m.loop) * m.loop;
      this.pos -= shift;
      this.goal -= shift;
      pointer.startPos -= shift;
    }

    const idx = this.projectIndex >= 0 ? this.projectIndex : this.nearest(m, this.pos);
    if (idx !== this.active) {
      this.active = idx;
      o.onActive(idx);
    }

    // La lateral pulsada ya ha llegado al centro: se abre.
    if (this.pending >= 0 && this.mode === "spring" && Math.abs(this.goal - this.pos) < 1.5 && Math.abs(this.vel) < 30) {
      const p = this.pending;
      this.pending = -1;
      if (idx === p) o.onSelect(p);
    }

    // Inclinacion hacia el cursor: sigue con un filtro corto y se apaga sola al soltarla.
    const lean = this.lean;
    const lk = 1 - Math.exp(-dt / 0.12);
    lean.x += (lean.tx - lean.x) * lk;
    lean.y += (lean.ty - lean.y) * lk;
    lean.s += (lean.ts - lean.s) * lk;
    if (Math.abs(lean.tx - lean.x) + Math.abs(lean.ty - lean.y) + Math.abs(lean.ts - lean.s) > 0.002) animating = true;
    else {
      lean.x = lean.tx;
      lean.y = lean.ty;
      lean.s = lean.ts;
    }

    // "Energía": velocidad de la cinta suavizada. Encoge un poco las tarjetas mientras corre.
    const travel = Math.abs(this.pos - this.lastPos) / dt;
    this.lastPos = this.pos;
    const target = o.reduced ? 0 : Math.min(travel / 2600, 1);
    this.energy += (target - this.energy) * (1 - Math.exp(-dt / (target > this.energy ? 0.07 : 0.35)));
    if (this.energy > 0.001) animating = true;
    else this.energy = 0;
    // Deformación "liquid": muelle subamortiguado hacia la velocidad con signo.
    const push = Math.max(-1, Math.min(1, this.vel / 2200));
    const dk = 120;
    this.deformVel += (dk * (push - this.deform) - 2 * Math.sqrt(dk) * 0.32 * this.deformVel) * dt;
    this.deform += this.deformVel * dt;
    if (Math.abs(this.deform) > 0.0005 || Math.abs(this.deformVel) > 0.005) animating = true;
    else {
      this.deform = 0;
      this.deformVel = 0;
    }

    const k = 64;
    focus.v += (k * (focus.target - focus.t) - 2 * Math.sqrt(k) * focus.v) * dt;
    focus.t += focus.v * dt;
    if (Math.abs(focus.target - focus.t) < 0.0005 && Math.abs(focus.v) < 0.001) {
      focus.t = focus.target;
      focus.v = 0;
    } else animating = true;
    const focusEase = o.reduced ? focus.target : easeInOut(clamp01(focus.t));

    // Lente: entra y sale en 0,4 s al cambiar de dispositivo (girar la tableta, redimensionar).
    const lensGoal = this.lensOn ? 1 : 0;
    if (this.lensT !== lensGoal) {
      this.lensT = lensGoal > this.lensT ? Math.min(1, this.lensT + dt / 0.4) : Math.max(0, this.lensT - dt / 0.4);
      animating = true;
    }

    for (const s of this.slots) {
      if (s.loaded && s.ready < 1 && s.image[0] > 1) {
        s.ready = Math.min(1, s.ready + dt / 0.45);
        animating = true;
      }
    }

    if (this.dirty || animating) {
      this.dirty = false;
      this.draw(m, focusEase, this.introEffects());
    }
    if (this.visible && (animating || pointer.down)) this.raf = requestAnimationFrame(this.frame);
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
