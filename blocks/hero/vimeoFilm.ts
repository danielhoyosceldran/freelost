import type Player from "@vimeo/player";

/**
 * La película del hero servida por Vimeo, vestida de <video>: expone lo que Hero.tsx usa del
 * elemento (paused, muted, playbackRate, currentTime, buffered, readyState, play/pause y los
 * eventos play/pause/volumechange/progress/canplaythrough), así el hero no cambia. El iframe va sin
 * la interfaz de Vimeo (controls=0); los botones son los nuestros y hablan con la API.
 *
 * El iframe es asíncrono (postMessage): el estado se guarda en local y se corrige con los eventos.
 * No se destruye en el desmontaje: el registro del loader se queda con la tarea del primer montaje
 * de StrictMode y sus oyentes tienen que seguir vivos (como con el <video>). @vimeo/player ya
 * devuelve la misma instancia para el mismo iframe.
 */

/** Sin avance del búfer tras empezar a sonar, se da por cargado (el streaming adaptativo no baja todo). */
const STALL_MS = 2500;

export class VimeoFilm extends EventTarget {
  private player: Promise<Player>;
  private _paused = true;
  private _muted = true;
  private _rate = 1;
  private loadedTo = 0;
  private _ready = 0;
  duration = NaN;
  /** Sin efecto: Vimeo decide cuánto carga. Está para que el hero pueda asignarlo. */
  preload = "auto";

  constructor(readonly el: HTMLElement, iframe: HTMLIFrameElement) {
    super();
    this.player = import("@vimeo/player").then(({ default: VimeoPlayer }) => {
      const p = new VimeoPlayer(iframe);
      let stall = 0;
      const enough = () => {
        if (this._ready) return;
        this._ready = HTMLMediaElement.HAVE_ENOUGH_DATA;
        this.emit("canplaythrough");
      };
      p.on("play", () => this.state(false));
      p.on("pause", () => this.state(true));
      p.on("ended", () => this.state(true));
      p.on("playing", () => {
        // Hasta que hay imagen se ve el póster (ver .vimeo[data-playing] en el CSS).
        el.dataset.playing = "";
        clearTimeout(stall);
        stall = window.setTimeout(enough, STALL_MS);
      });
      p.on("progress", (d: { percent: number; duration: number }) => {
        this.duration = d.duration;
        this.loadedTo = d.percent * d.duration;
        this.emit("progress");
        if (d.percent >= 1) enough();
        else if (el.dataset.playing !== undefined) {
          clearTimeout(stall);
          stall = window.setTimeout(enough, STALL_MS);
        }
      });
      p.on("error", () => this.emit("error"));
      p.ready().then(
        async () => {
          const [w, h] = await Promise.all([p.getVideoWidth(), p.getVideoHeight()]);
          if (w && h) el.style.setProperty("--ar", String(w / h));
        },
        // Vídeo privado, borrado o dominio no permitido: queda el póster y el loader no espera.
        () => this.emit("error"),
      );
      return p;
    });
  }

  get paused() {
    return this._paused;
  }

  get muted() {
    return this._muted;
  }

  set muted(m: boolean) {
    this._muted = m;
    this.emit("volumechange");
    void this.player.then((p) => p.setMuted(m)).catch(() => {});
  }

  get playbackRate() {
    return this._rate;
  }

  /** Por pasos de 0,05: cada cambio es un mensaje al iframe y la salida lo pide en cada fotograma. */
  set playbackRate(r: number) {
    const q = Math.round(r * 20) / 20;
    if (q === this._rate) return;
    this._rate = q;
    void this.player.then((p) => p.setPlaybackRate(q)).catch(() => {});
  }

  set currentTime(t: number) {
    void this.player.then((p) => p.setCurrentTime(t)).catch(() => {});
  }

  get readyState() {
    return this._ready;
  }

  /** El tramo cargado desde el principio, con la forma de TimeRanges que lee el hero. */
  get buffered() {
    const end = this.loadedTo;
    return { length: end > 0 ? 1 : 0, start: () => 0, end: () => end };
  }

  async play() {
    const p = await this.player;
    await p.play();
  }

  pause() {
    void this.player.then((p) => p.pause()).catch(() => {});
  }

  private state(paused: boolean) {
    this._paused = paused;
    this.emit(paused ? "pause" : "play");
  }

  private emit(type: string) {
    this.dispatchEvent(new Event(type));
  }
}

/** URL del iframe sin la interfaz de Vimeo: ni barra, ni título, ni logo. Arranca el hero, no Vimeo. */
export function vimeoSrc(id: string, hash?: string) {
  const q = new URLSearchParams({
    ...(hash ? { h: hash } : {}),
    autoplay: "0",
    loop: "1",
    muted: "1",
    controls: "0",
    title: "0",
    byline: "0",
    portrait: "0",
    badge: "0",
    autopause: "0",
    dnt: "1",
    playsinline: "1",
  });
  return `https://player.vimeo.com/video/${id}?${q}`;
}
