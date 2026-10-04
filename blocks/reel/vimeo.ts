import type Player from "@vimeo/player";

/**
 * Clip de Vimeo para la vista de proyecto. Hace de <video> para project.ts: carga con progreso,
 * reproducción y scrub. El iframe es asíncrono (postMessage), así que el tiempo se lleva en local
 * a partir de timeupdate y se extrapola entre eventos; el scrub nunca espera a una respuesta.
 *
 * El SDK se importa en load() con import() dinámico: el módulo se evalúa también en el build
 * (SSR del bloque) y así solo baja al navegador cuando alguien abre un vídeo.
 */

const STALL_MS = 2500;

export class VimeoClip {
  readonly el: HTMLElement;
  private readonly iframe: HTMLIFrameElement;
  private player: Player | null = null;
  private dead = false;
  private seconds = 0;
  private at = 0;
  private playing = false;
  private dur = 0;
  private seekTarget: number | null = null;
  private seekRaf = 0;

  constructor(id: string, hash: string | undefined, cover: string, className: string) {
    this.el = document.createElement("div");
    this.el.className = className;
    // La portada hace de poster: el iframe va encima, invisible hasta que hay imagen.
    const img = document.createElement("img");
    img.src = cover;
    img.alt = "";
    img.draggable = false;
    this.iframe = document.createElement("iframe");
    const q = new URLSearchParams({
      ...(hash ? { h: hash } : {}),
      autoplay: "0",
      loop: "1",
      muted: "1",
      controls: "0",
      title: "0",
      byline: "0",
      portrait: "0",
      dnt: "1",
      playsinline: "1",
    });
    this.iframe.src = `https://player.vimeo.com/video/${id}?${q}`;
    // Delegar autoplay deja al iframe usar el clic que abrió el proyecto (sonido incluido).
    this.iframe.allow = "autoplay; fullscreen; picture-in-picture";
    this.iframe.tabIndex = -1;
    this.iframe.title = "Vídeo";
    this.el.append(img, this.iframe);
  }

  get duration() {
    return this.dur;
  }

  get currentTime() {
    const t = this.seconds + (this.playing ? (performance.now() - this.at) / 1000 : 0);
    return this.dur ? t % this.dur : t;
  }

  /**
   * Arranca en silencio para que Vimeo llene el búfer y el anillo enseñe el progreso real.
   * Termina con el búfer lleno o tras STALL_MS sin avanzar (el streaming adaptativo no suele
   * bajar el vídeo entero).
   */
  async load(onProgress: (p: number) => void): Promise<void> {
    const { default: VimeoPlayer } = await import("@vimeo/player");
    if (this.dead) return;
    const p = new VimeoPlayer(this.iframe);
    this.player = p;

    p.on("timeupdate", (d: { seconds: number; duration: number }) => {
      this.seconds = d.seconds;
      this.dur = d.duration;
      this.at = performance.now();
    });
    p.on("play", () => {
      this.playing = true;
      this.at = performance.now();
    });
    p.on("pause", () => {
      this.playing = false;
    });
    p.on("playing", () => this.el.classList.add("is-playing"));

    try {
      await p.ready();
      if (this.dead) return;
      const [w, h, d] = await Promise.all([p.getVideoWidth(), p.getVideoHeight(), p.getDuration()]);
      this.dur = d;
      if (w && h) this.el.style.setProperty("--ar", String(w / h));
    } catch (err) {
      // Vídeo privado, borrado o dominio no permitido: se sigue con la portada.
      console.warn("[vimeo] no disponible:", (err as Error).message ?? err);
      onProgress(1);
      return;
    }

    await new Promise<void>((resolve) => {
      let stall = 0;
      const finish = () => {
        clearTimeout(stall);
        p.off("progress", onBuf);
        onProgress(1);
        resolve();
      };
      const onBuf = (d: { percent: number }) => {
        if (this.dead) return finish();
        onProgress(d.percent);
        if (d.percent >= 0.99) return finish();
        clearTimeout(stall);
        stall = window.setTimeout(finish, STALL_MS);
      };
      p.on("progress", onBuf);
      stall = window.setTimeout(finish, STALL_MS);
      p.setMuted(true)
        .then(() => p.play())
        .catch(finish);
    });
  }

  /** Desde el principio y, si el navegador lo deja, con sonido. */
  play() {
    const p = this.player;
    if (!p) return;
    p.setCurrentTime(0).catch(() => {});
    p.setMuted(false).catch(() => p.setMuted(true).catch(() => {}));
    p.play().catch(() => {
      p.setMuted(true)
        .then(() => p.play())
        .catch(() => {});
    });
  }

  /** Salto relativo. Se agrupan los de un mismo frame en un solo setCurrentTime. */
  seekBy(delta: number) {
    const p = this.player;
    const d = this.dur;
    if (!p || !d) return;
    const t = Math.max(0, Math.min(d - 0.05, (this.seekTarget ?? this.currentTime) + delta));
    this.seekTarget = t;
    // Optimista: la línea de tiempo se mueve ya, sin esperar al timeupdate.
    this.seconds = t;
    this.at = performance.now();
    if (!this.seekRaf)
      this.seekRaf = requestAnimationFrame(() => {
        this.seekRaf = 0;
        if (this.seekTarget == null) return;
        p.setCurrentTime(this.seekTarget).catch(() => {});
        this.seekTarget = null;
      });
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    cancelAnimationFrame(this.seekRaf);
    this.player?.destroy().catch(() => {});
    this.player = null;
    this.el.remove();
  }
}
