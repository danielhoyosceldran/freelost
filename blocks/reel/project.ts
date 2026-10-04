import type { FlexCarousel } from "@/lib/webgl/flex-carousel/FlexCarousel";
import { coverOf, hiResOf, type ReelSlide } from "./slides";
import { VimeoClip } from "./vimeo";

/**
 * Vista de proyecto del carrete, port 1:1 de enterProject()/exitProject() de v4. Imperativa a
 * propósito: es una coreografía de transiciones CSS, medidas de layout y carga con progreso que
 * en estado React solo ganaría re-renders y carreras.
 *
 * Fases (clases en el root): splitting (las demás fotos se apartan, la lente se endereza) →
 * loading (el anillo del marco se rellena con la carga real) → in-project (el marco ha crecido
 * a pantalla completa y el vídeo arranca). Los vídeos son de Vimeo (ver vimeo.ts). Al salir, la página vuelve a la foto vista.
 */

export interface ProjectElements {
  root: HTMLElement;
  project: HTMLElement;
  frame: HTMLElement;
  media: HTMLElement;
  bar: HTMLElement;
  ring: SVGRectElement;
  scrub: HTMLElement;
  scrubFill: HTMLElement;
  close: HTMLElement;
}

/** Nombres de clase (CSS module) de las fases y estados. */
export interface ProjectClasses {
  splitting: string;
  loading: string;
  inProject: string;
  growing: string;
  fromCard: string;
  current: string;
  scrubVisible: string;
}

interface Options {
  slides: readonly ReelSlide[];
  reduced: boolean;
  /** Se llama justo después de abrir (pin de la página) y al cerrar, con el índice visto. */
  onOpen: (index: number) => void;
  onClose: (index: number) => void;
}

const GROW_MS = 600;
const SEEK_PER_PX = 0.01;
const SCRUB_HIDE_MS = 700;
const SCRUB_FILL_MS = 320;

export class ProjectView {
  private open = false;
  private index = -1;
  private video: VimeoClip | null = null;
  private loadToken = 0;
  private abort: AbortController | null = null;
  private hiObjectUrl: string | null = null;
  private perimeter = 0;
  private progress = 0;
  private barW = 1;
  private scrubHide = 0;
  private scrubRaf = 0;
  private scrubT0 = 0;

  constructor(
    private readonly el: ProjectElements,
    private readonly cls: ProjectClasses,
    private readonly carousel: FlexCarousel,
    private readonly o: Options,
  ) {
    this.barW = parseFloat(getComputedStyle(el.root).getPropertyValue("--reel-bar-w")) || 1;
  }

  get isOpen() {
    return this.open;
  }

  enter(i: number) {
    if (this.open || i < 0) return;
    const { el, cls } = this;
    // El marco nace sobre la tarjeta tal como está ahora, antes de clavar la página.
    el.project.hidden = false;
    el.project.setAttribute("aria-hidden", "false");
    el.close.removeAttribute("inert");
    this.syncFrameToCard(i);

    this.open = true;
    this.index = i;
    this.carousel.setProject(i);
    // La página queda clavada mientras dure el proyecto: si siguiera corriendo, al salir la
    // cinta habría avanzado por debajo del material que se estaba viendo.
    this.o.onOpen(i);

    this.showMedia(i);
    el.bar.style.opacity = "";

    // Separación: el focus del FlexCarousel aparta y apaga las demás fotos.
    this.carousel.setFocus(1);
    el.root.classList.add(cls.splitting, cls.loading);
    const token = ++this.loadToken;

    let loaded: Promise<unknown>;
    if (this.video) {
      const v = this.video;
      this.setProgress(0);
      loaded = v.load((p) => {
        if (token === this.loadToken && this.video === v) this.setProgress(p);
      });
    } else {
      this.abort = new AbortController();
      loaded = this.loadHiRes(i, token, this.abort.signal).then((hiUrl) => {
        if (token !== this.loadToken || !hiUrl) return;
        const img = el.media.querySelector<HTMLImageElement>(`img.${cls.current}`);
        if (img) img.src = hiUrl;
      });
    }

    loaded.then(() => {
      if (token !== this.loadToken) return;
      el.root.classList.remove(cls.loading);
      el.bar.style.opacity = "0";
      this.growToFullscreen();
    });
  }

  /** notify = false al desmontar: limpia sin pedir que la página vuelva a la foto. */
  exit(notify = true) {
    if (!this.open) return;
    const { el, cls } = this;
    const seen = this.index;
    this.loadToken++;
    this.abort?.abort();
    this.abort = null;
    this.open = false;
    this.index = -1;
    el.root.classList.remove(cls.splitting, cls.loading, cls.inProject);
    el.project.hidden = true;
    el.project.setAttribute("aria-hidden", "true");
    el.close.setAttribute("inert", "");
    this.hideScrub();
    if (this.video) {
      this.video.destroy();
      this.video = null;
    }
    el.media.replaceChildren();
    if (this.hiObjectUrl) {
      URL.revokeObjectURL(this.hiObjectUrl);
      this.hiObjectUrl = null;
    }
    this.setProgress(0);
    el.frame.classList.remove(cls.growing);
    el.frame.style.left = el.frame.style.top = "";
    el.frame.style.width = el.frame.style.height = "";
    // Las demás fotos vuelven a su sitio (focus → 0) y la lente se vuelve a curvar.
    this.carousel.setProject(-1);
    this.carousel.setFocus(0);
    if (notify) this.o.onClose(seen);
  }

  /**
   * Rueda dentro de un proyecto: con vídeo hace scrub, con foto nada. El evento ya llega
   * cancelado por el scrollController (la página no se mueve por debajo).
   */
  onInput(e: WheelEvent | TouchEvent | KeyboardEvent) {
    if (!this.open || !(e instanceof WheelEvent)) return;
    const v = this.video;
    if (!v) return;
    if (!v.duration) return;
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    v.seekBy(delta * SEEK_PER_PX);
    this.showScrub();
  }

  onResize() {
    if (!this.open) return;
    if (this.el.root.classList.contains(this.cls.inProject)) this.measureRing();
    else {
      // El ResizeObserver puede llegar después que este evento: se relee el tamaño ya, para
      // medir la tarjeta con el ancho/alto/--reel-card nuevos.
      this.carousel.resize();
      this.syncFrameToCard(this.index);
    }
  }

  destroy() {
    this.exit(false);
    this.hideScrub();
  }

  // ---------- marco y anillo ----------

  private syncFrameToCard(i: number) {
    const c = this.carousel.cardRect(i);
    const f = this.el.frame.style;
    f.left = `${c.left}px`;
    f.top = `${c.top}px`;
    f.width = `${c.width}px`;
    f.height = `${c.height}px`;
    this.measureRing();
  }

  private measureRing() {
    const bw = this.barW;
    const { frame, ring } = this.el;
    const w = frame.offsetWidth;
    const h = frame.offsetHeight;
    ring.setAttribute("x", String(-bw / 2));
    ring.setAttribute("y", String(-bw / 2));
    ring.setAttribute("width", String(w + bw));
    ring.setAttribute("height", String(h + bw));
    this.perimeter = 2 * (w + bw + (h + bw));
    ring.style.strokeDasharray = String(this.perimeter);
    ring.style.strokeDashoffset = String(this.perimeter * (1 - this.progress));
  }

  private setProgress(p: number) {
    this.progress = Math.max(0, Math.min(1, p));
    this.el.ring.style.strokeDashoffset = String(this.perimeter * (1 - this.progress));
    this.el.bar.setAttribute("aria-valuenow", String(Math.round(this.progress * 100)));
  }

  private growToFullscreen() {
    const { el, cls } = this;
    const full = () => {
      el.frame.style.left = "0px";
      el.frame.style.top = "0px";
      el.frame.style.width = "100vw";
      el.frame.style.height = "100vh";
    };
    const settled = () => {
      el.root.classList.remove(cls.splitting);
      el.root.classList.add(cls.inProject);
      this.startPlayback();
    };

    if (this.o.reduced) {
      full();
      this.measureRing();
      settled();
      return;
    }

    el.frame.classList.add(cls.growing);
    void el.frame.offsetWidth;
    full();

    const token = this.loadToken;
    const onGrown = (e: TransitionEvent) => {
      if (e.target !== el.frame || e.propertyName !== "width") return;
      el.frame.removeEventListener("transitionend", onGrown);
      if (token !== this.loadToken) return;
      el.frame.classList.remove(cls.growing);
      settled();
    };
    el.frame.addEventListener("transitionend", onGrown);

    const t0 = performance.now();
    const trackGrow = () => {
      this.measureRing();
      if (performance.now() - t0 < GROW_MS + 50) requestAnimationFrame(trackGrow);
    };
    trackGrow();
  }

  // ---------- medios ----------

  private showMedia(i: number) {
    const { el, cls } = this;
    el.media.replaceChildren();
    this.video = null;
    const slide = this.o.slides[i];
    // Nace con el zoom de la tarjeta (ver .fromCard) y lo suelta en el frame siguiente.
    el.media.classList.add(cls.fromCard);

    if (slide.kind === "video") {
      const v = new VimeoClip(slide.vimeo, slide.hash, slide.cover, cls.current);
      el.media.appendChild(v.el);
      this.video = v;
    } else {
      const img = document.createElement("img");
      img.className = cls.current;
      img.alt = slide.place;
      img.draggable = false;
      img.src = coverOf(slide);
      el.media.appendChild(img);
    }
    void el.media.offsetWidth;
    requestAnimationFrame(() => el.media.classList.remove(cls.fromCard));
  }

  /** Descarga la versión grande leyendo el stream, para que el anillo enseñe el progreso real. */
  private async loadHiRes(i: number, token: number, signal: AbortSignal): Promise<string | null> {
    const url = hiResOf(this.o.slides[i]);
    this.setProgress(0);
    try {
      const res = await fetch(url, { signal });
      if (!res.ok || !res.body) throw new Error("respuesta sin cuerpo");
      const total = Number(res.headers.get("Content-Length")) || 0;
      if (!total) throw new Error("sin Content-Length: progreso indeterminado");

      const reader = res.body.getReader();
      const chunks: BlobPart[] = [];
      let loaded = 0;
      let raf = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        if (token !== this.loadToken) return null;
        if (!raf)
          raf = requestAnimationFrame(() => {
            this.setProgress(loaded / total);
            raf = 0;
          });
      }
      cancelAnimationFrame(raf);
      this.setProgress(1);
      this.hiObjectUrl = URL.createObjectURL(new Blob(chunks));
      return this.hiObjectUrl;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return null;
      console.warn("[proyecto] progreso de carga no disponible, fallback a onload:", (err as Error).message);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = () => {
          this.setProgress(1);
          resolve(url);
        };
        img.src = url;
      });
    }
  }

  private startPlayback() {
    const v = this.video;
    v?.play();
  }

  // ---------- scrub ----------
  // Línea de tiempo: se enciende con cada muesca de rueda y se apaga SCRUB_HIDE_MS después de
  // la última. Al encenderse el relleno sale de 0 con un ease-out corto; a partir de ahí sigue a
  // currentTime cada frame, sin suavizado, porque el vídeo sigue y la rueda lo mueve a saltos.

  private scrubRatio() {
    const v = this.video;
    if (!v || !v.duration) return 0;
    return Math.max(0, Math.min(1, v.currentTime / v.duration));
  }

  private scrubTick = (now: number) => {
    this.scrubRaf = 0;
    if (!this.el.scrub.classList.contains(this.cls.scrubVisible)) return;
    let r = this.scrubRatio();
    const k = (now - this.scrubT0) / SCRUB_FILL_MS;
    if (!this.o.reduced && k < 1) r *= 1 - Math.pow(1 - k, 3);
    this.el.scrubFill.style.transform = `scaleX(${r})`;
    this.scrubRaf = requestAnimationFrame(this.scrubTick);
  };

  private showScrub() {
    const { scrub, scrubFill } = this.el;
    if (!scrub.classList.contains(this.cls.scrubVisible)) {
      this.scrubT0 = performance.now();
      scrubFill.style.transform = "scaleX(0)";
      scrub.classList.add(this.cls.scrubVisible);
    }
    if (!this.scrubRaf) this.scrubRaf = requestAnimationFrame(this.scrubTick);
    clearTimeout(this.scrubHide);
    this.scrubHide = window.setTimeout(() => this.hideScrub(), SCRUB_HIDE_MS);
  }

  private hideScrub() {
    clearTimeout(this.scrubHide);
    this.el.scrub.classList.remove(this.cls.scrubVisible);
    cancelAnimationFrame(this.scrubRaf);
    this.scrubRaf = 0;
  }
}
