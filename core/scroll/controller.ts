/**
 * Único dueño del scroll de la página. En v4 cada pieza (imán, puerta, proyecto, modal) movía
 * o clavaba window.scrollY por su cuenta y se coordinaban con banderas sueltas; aquí todas
 * piden a este controlador, así dos bloques no pueden pelearse por la posición.
 *
 * - pin/unpin: clavar la página en una Y (puerta de esfuerzo, proyecto abierto). Mientras hay
 *   un pin, el scroll que se cuele (barra, inercia del trackpad, scroll programático) se
 *   devuelve a esa Y y los suscriptores no se enteran.
 * - captureInput: mientras está activo, rueda/táctil/teclado se cancelan y sus deltas se
 *   entregan al handler (el esfuerzo de la puerta, el scrub de un proyecto). Es una pila: solo
 *   recibe el último que capturó. En v4 la rueda dentro de un proyecto abierto sobre la puerta
 *   sumaba esfuerzo a la vez que hacía scrub; aquí el proyecto tapa a la puerta.
 * - lockOverflow: overflow:hidden en <body> (modales). Nunca en <html>: propagaría el scroll al
 *   <body> y rompería el position:sticky de todas las escenas.
 *
 * - inercia: con rueda de ratón (puntero fino, sin movimiento reducido) la rueda no salta de golpe:
 *   mueve un destino y la posición lo persigue con un muelle exponencial. Los trackpads (deltas
 *   pequeños) ya traen su inercia del sistema y se dejan nativos. El mismo bucle mide la
 *   velocidad del scroll y la publica (velocity / subscribeVelocity / --scroll-v): es el único
 *   requestAnimationFrame del scroll, y solo corre mientras hay movimiento.
 *
 * Singleton de módulo: el constructor no toca window, así que importarlo en el servidor es seguro.
 */

export type ScrollMode = "instant" | "smooth" | "motion";
type Listener = () => void;
/** delta: px hacia abajo (>0) o arriba (<0); el evento original, por si hace falta más (deltaX). */
export type InputHandler = (delta: number, e: WheelEvent | TouchEvent | KeyboardEvent) => void;

const DOWN_KEYS = ["ArrowDown", "PageDown", " ", "Spacebar"];
const UP_KEYS = ["ArrowUp", "PageUp", "Home"];
const KEY_DELTA = 220;
const TOUCH_GAIN = 2.2;
/** Constantes de tiempo (ms) del muelle: la rueda es ágil, los saltos programáticos (seek) más lentos. */
const WHEEL_TAU = 95;
const JUMP_TAU = 170;
/** Por debajo de este deltaY (px) se asume trackpad y se deja el scroll nativo. */
const TRACKPAD_MAX = 40;
const LINE_PX = 16;
/** Constante de tiempo (ms) del filtro de la velocidad y velocidad (px/ms) que cuenta como 1. */
const VEL_TAU = 120;
const VEL_REF = 3;

/** Y absoluta en el documento de la parte de arriba de un elemento. */
export function docTop(el: Element) {
  return el.getBoundingClientRect().top + window.scrollY;
}

class ScrollController {
  private initialized = false;
  private listeners = new Set<Listener>();
  private pinListeners = new Set<Listener>();
  private pins = new Map<string, number>();
  private captures: InputHandler[] = [];
  private overflowLocks = new Set<string>();
  private reduce: MediaQueryList | null = null;
  private touchY: number | null = null;

  // inercia
  private finePointer: MediaQueryList | null = null;
  private looping = false;
  private current = 0;
  private target = 0;
  private tau = WHEEL_TAU;
  /** Última Y escrita por el bucle: distingue nuestros eventos de scroll de los externos. */
  private written = 0;

  // velocidad
  private velListeners = new Set<(v: number) => void>();
  private vel = 0;
  private published = 0;
  private lastY = 0;
  private lastT = 0;
  private tickId = 0;

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    this.reduce = matchMedia("(prefers-reduced-motion: reduce)");
    this.finePointer = matchMedia("(hover: hover) and (pointer: fine)");

    // Refrescar la página siempre arranca desde arriba: las escenas no se diseñaron para
    // aparecer a mitad de recorrido.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onScroll);
    window.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("touchstart", this.onTouchStart, { passive: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: false });
    window.addEventListener("keydown", this.onKey);

    window.scrollTo({ top: 0, behavior: "instant" });
    this.current = this.target = this.written = 0;
    this.onScroll();
  }

  // ---------- suscripción ----------

  /** Se llama en cada scroll y resize, salvo mientras la página está clavada. */
  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Velocidad del scroll normalizada a −1…1 (1 = 3 px/ms hacia abajo), ya suavizada. Con
   * movimiento reducido es siempre 0.
   */
  velocity() {
    return this.published;
  }

  /** Avisa de cada cambio de velocidad; termina siempre con un 0. Devuelve la baja. */
  subscribeVelocity(listener: (v: number) => void) {
    this.velListeners.add(listener);
    return () => {
      this.velListeners.delete(listener);
    };
  }

  // ---------- movimiento ----------

  /** ¿Se mueve la página con el muelle propio en lugar del scroll nativo? */
  private get smoothing() {
    return !!this.finePointer?.matches && !this.reduce?.matches && this.pins.size === 0 && this.overflowLocks.size === 0;
  }

  private maxY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  private stopLoop() {
    this.looping = false;
    this.current = this.target = window.scrollY;
  }

  /**
   * 'motion' = suave salvo con prefers-reduced-motion. Nunca 'auto': <html> lleva
   * scroll-behavior:smooth, así que 'auto' seguiría animando aunque se pida movimiento reducido.
   */
  scrollTo(top: number, mode: ScrollMode = "motion") {
    if (mode !== "instant" && this.smoothing) {
      if (!this.looping) this.current = window.scrollY;
      this.target = Math.min(this.maxY(), Math.max(0, top));
      this.tau = JUMP_TAU;
      this.looping = true;
      this.kick();
      return;
    }
    this.stopLoop();
    const behavior = mode === "motion" ? (this.reduce?.matches ? "instant" : "smooth") : mode;
    window.scrollTo({ top, behavior });
  }

  scrollToElement(el: Element, mode: ScrollMode = "motion") {
    this.scrollTo(docTop(el), mode);
  }

  // ---------- pins ----------

  pin(owner: string, y = window.scrollY) {
    // Borrar antes de poner: el último pin es el que manda, y Map conserva el orden de inserción.
    this.pins.delete(owner);
    this.pins.set(owner, y);
    this.stopLoop();
    if (window.scrollY !== y) window.scrollTo({ top: y, behavior: "instant" });
    this.pinListeners.forEach((l) => l());
  }

  unpin(owner: string) {
    if (!this.pins.delete(owner)) return;
    this.pinListeners.forEach((l) => l());
  }

  isPinned() {
    return this.pins.size > 0;
  }

  /** Dueño del pin activo (el último puesto), o null. */
  topPin() {
    let top: string | null = null;
    for (const owner of this.pins.keys()) top = owner;
    return top;
  }

  subscribePins(listener: Listener) {
    this.pinListeners.add(listener);
    return () => {
      this.pinListeners.delete(listener);
    };
  }

  // ---------- captura de entrada ----------

  /** Devuelve la función que suelta esta captura; la anterior vuelve a recibir. */
  captureInput(handler: InputHandler) {
    this.captures.push(handler);
    return () => {
      const i = this.captures.lastIndexOf(handler);
      if (i >= 0) this.captures.splice(i, 1);
    };
  }

  private get capture(): InputHandler | null {
    return this.captures[this.captures.length - 1] ?? null;
  }

  // ---------- overflow ----------

  lockOverflow(owner: string) {
    this.overflowLocks.add(owner);
    document.body.style.overflow = "hidden";
  }

  unlockOverflow(owner: string) {
    this.overflowLocks.delete(owner);
    if (this.overflowLocks.size === 0) document.body.style.overflow = "";
  }

  // ---------- handlers ----------

  private onScroll = () => {
    const pinY = this.currentPinY();
    if (pinY !== null) {
      if (window.scrollY !== pinY) window.scrollTo({ top: pinY, behavior: "instant" });
      return;
    }
    // Un scroll que no escribió el bucle (barra, teclado, trackpad) manda: el muelle lo acepta
    // como nueva posición en vez de devolver la página a su destino anterior.
    if (this.looping && Math.abs(window.scrollY - this.written) > 2) this.stopLoop();
    else if (!this.looping) this.current = this.target = window.scrollY;
    this.listeners.forEach((l) => l());
    this.kick();
  };

  // ---------- bucle: muelle de la rueda y velocidad ----------

  private kick() {
    if (this.tickId) return;
    this.lastT = performance.now();
    this.lastY = window.scrollY;
    this.tickId = requestAnimationFrame(this.tick);
  }

  private tick = (t: number) => {
    this.tickId = 0;
    // Tope al dt: tras una pestaña en segundo plano no debe haber un salto ni un pico de velocidad.
    const dt = Math.min(50, Math.max(1, t - this.lastT));
    this.lastT = t;

    if (this.looping && !this.smoothing) this.stopLoop();
    if (this.looping) {
      const max = this.maxY();
      this.target = Math.min(max, Math.max(0, this.target));
      this.current += (this.target - this.current) * (1 - Math.exp(-dt / this.tau));
      if (Math.abs(this.target - this.current) < 0.5) {
        this.current = this.target;
        this.looping = false;
      }
      this.written = this.current;
      window.scrollTo({ top: this.current, behavior: "instant" });
    }

    const y = window.scrollY;
    const raw = this.pins.size ? 0 : (y - this.lastY) / dt;
    this.lastY = y;
    this.vel += (raw - this.vel) * (1 - Math.exp(-dt / VEL_TAU));
    const moving = this.looping || Math.abs(this.vel) > 0.002 || raw !== 0;
    if (!moving) this.vel = 0;
    this.publish(this.reduce?.matches ? 0 : Math.max(-1, Math.min(1, this.vel / VEL_REF)));
    if (moving) this.tickId = requestAnimationFrame(this.tick);
  };

  private publish(v: number) {
    if (v === this.published || (v !== 0 && Math.abs(v - this.published) < 0.002)) return;
    this.published = v;
    document.documentElement.style.setProperty("--scroll-v", v.toFixed(3));
    this.velListeners.forEach((l) => l(v));
  }

  private currentPinY() {
    let y: number | null = null;
    for (const v of this.pins.values()) y = v;
    return y;
  }

  private onWheel = (e: WheelEvent) => {
    if (this.capture) {
      e.preventDefault();
      this.capture(e.deltaY, e);
      return;
    }
    // Pellizco (ctrl), gesto horizontal o deltas de trackpad: nativo.
    if (e.ctrlKey || e.deltaY === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.deltaMode === 0 && Math.abs(e.deltaY) < TRACKPAD_MAX) return;
    if (!this.smoothing) return;
    e.preventDefault();
    const delta =
      e.deltaMode === 1 ? e.deltaY * LINE_PX : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    if (!this.looping) this.current = this.target = window.scrollY;
    this.target = Math.min(this.maxY(), Math.max(0, this.target + delta));
    this.tau = WHEEL_TAU;
    this.looping = true;
    this.kick();
  };

  private onTouchStart = (e: TouchEvent) => {
    this.touchY = e.touches[0].clientY;
  };

  private onTouchMove = (e: TouchEvent) => {
    if (!this.capture) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    if (this.touchY !== null) this.capture((this.touchY - y) * TOUCH_GAIN, e);
    this.touchY = y;
  };

  private onKey = (e: KeyboardEvent) => {
    if (!this.capture) return;
    if (DOWN_KEYS.includes(e.key)) {
      e.preventDefault();
      this.capture(KEY_DELTA, e);
    } else if (UP_KEYS.includes(e.key)) {
      e.preventDefault();
      this.capture(-1, e);
    }
  };
}

export const scrollController = new ScrollController();
