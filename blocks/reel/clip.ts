/**
 * Lo que la vista de proyecto (project.ts) necesita de un vídeo, venga de donde venga: carga con
 * progreso, reproducción desde el principio, scrub y limpieza. Lo cumplen VimeoClip (vimeo.ts)
 * y LocalClip (aquí).
 */
export interface Clip {
  readonly el: HTMLElement;
  readonly duration: number;
  readonly currentTime: number;
  load(onProgress: (p: number) => void): Promise<void>;
  play(): void;
  seekBy(delta: number): void;
  destroy(): void;
}

/** Segundos cargados desde el principio para dar la carga por buena y abrir el marco. */
const BUFFER_S = 8;

/**
 * Película servida desde el propio sitio, en un <video>. Mismo envoltorio que VimeoClip (un div
 * con la portada debajo) para que el CSS del marco no distinga entre los dos.
 */
export class LocalClip implements Clip {
  readonly el: HTMLElement;
  private readonly video: HTMLVideoElement;
  private dead = false;

  constructor(src: string, cover: string, className: string) {
    this.el = document.createElement("div");
    this.el.className = className;
    const img = document.createElement("img");
    img.src = cover;
    img.alt = "";
    img.draggable = false;
    const v = document.createElement("video");
    v.playsInline = true;
    v.loop = true;
    v.muted = true;
    v.preload = "auto";
    v.poster = cover;
    v.src = src;
    v.tabIndex = -1;
    v.addEventListener("playing", () => this.el.classList.add("is-playing"));
    this.video = v;
    this.el.append(img, v);
  }

  get duration() {
    return Number.isFinite(this.video.duration) ? this.video.duration : 0;
  }

  get currentTime() {
    return this.video.currentTime;
  }

  /**
   * Arranca en silencio para forzar la descarga (iOS ignora preload) y termina cuando hay
   * BUFFER_S segundos desde el principio, o cuando el navegador dice que llega sin cortes.
   */
  load(onProgress: (p: number) => void): Promise<void> {
    const v = this.video;
    return new Promise((resolve) => {
      const head = () => {
        const b = v.buffered;
        for (let i = 0; i < b.length; i++) if (b.start(i) <= 0.25) return b.end(i);
        return 0;
      };
      const off = () => {
        for (const e of ["progress", "timeupdate", "canplaythrough", "loadeddata"]) v.removeEventListener(e, check);
        v.removeEventListener("error", done);
      };
      const done = () => {
        off();
        onProgress(1);
        resolve();
      };
      const check = () => {
        if (this.dead) return done();
        const target = Math.min(BUFFER_S, this.duration || BUFFER_S);
        const p = head() / target;
        onProgress(Math.min(1, p));
        if (p >= 1 || v.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) done();
      };
      for (const e of ["progress", "timeupdate", "canplaythrough", "loadeddata"]) v.addEventListener(e, check);
      v.addEventListener("error", done);
      v.play().catch(() => {});
      check();
    });
  }

  /** Desde el principio y, si el navegador lo deja, con sonido (el clic que abrió cuenta). */
  play() {
    const v = this.video;
    v.currentTime = 0;
    v.muted = false;
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
    });
  }

  seekBy(delta: number) {
    const d = this.duration;
    if (!d) return;
    this.video.currentTime = Math.max(0, Math.min(d - 0.05, this.video.currentTime + delta));
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    const v = this.video;
    v.pause();
    // Soltar el src corta la descarga en curso; sin esto el navegador seguiría bajando la película.
    v.removeAttribute("src");
    v.load();
    this.el.remove();
  }
}
