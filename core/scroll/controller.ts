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

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    this.reduce = matchMedia("(prefers-reduced-motion: reduce)");

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

  // ---------- movimiento ----------

  /**
   * 'motion' = suave salvo con prefers-reduced-motion. Nunca 'auto': <html> lleva
   * scroll-behavior:smooth, así que 'auto' seguiría animando aunque se pida movimiento reducido.
   */
  scrollTo(top: number, mode: ScrollMode = "motion") {
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
    this.listeners.forEach((l) => l());
  };

  private currentPinY() {
    let y: number | null = null;
    for (const v of this.pins.values()) y = v;
    return y;
  }

  private onWheel = (e: WheelEvent) => {
    if (!this.capture) return;
    e.preventDefault();
    this.capture(e.deltaY, e);
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
