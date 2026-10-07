"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useCriticalAssets } from "@/core/lifecycle/BlockSlot";
import { useLifecycle, useReady } from "@/core/lifecycle/store";
import { ScrollScene, useSceneProgress } from "@/core/scroll/ScrollScene";
import { easeIn, easeInOut, easeOut, segment } from "@/lib/easing";
import { LOGO_F, LOGO_L, LOGO_VIEWBOX } from "@/lib/brand/logo";
import type { HeroProps } from "./index";
import styles from "./hero.module.css";

/** Segundos de película cargados desde el principio para dar el loader por terminado. */
const BUFFER_S = 6;

/** ids de las máscaras del eslogan: la tinta con las letras agujereadas y las letras solas. Hay un
 * solo hero por página. */
const INK_MASK = "hero-slogan-ink";
const FILL_MASK = "hero-slogan-fill";

/**
 * Tramos de la salida sobre el progreso de la escena. Primero se va la interfaz (0–0,2); el
 * eslogan entra cuando ya no queda nada encima del plano y crece hasta 0,86. El resto es un
 * respiro sobre el último fotograma antes de que la escena se suelte.
 */
const SLOGAN_IN: [number, number] = [0.16, 0.3];
const SLOGAN_GROW: [number, number] = [0.3, 0.86];
/** Lo de fuera de las letras pasa a tinta… */
const INK: [number, number] = [0.36, 0.7];
/** …mientras el relleno de papel se aparta y deja ver la película por dentro. */
const FILL_OUT: [number, number] = [0.4, 0.66];
/**
 * Al final del crecimiento las letras vuelven a papel: el último fotograma es el eslogan en blanco
 * sobre tinta, y es lo que se lleva la escena al soltarse. Corto (unos 20vh de scroll) y con
 * curva de entrada y salida: suave, sin hacerse esperar.
 */
const FILL_BACK: [number, number] = [0.82, 0.91];
/** El velo también se va: por dentro de las letras la película se ve limpia. */
const SCRIM_OUT: [number, number] = [0.5, 0.8];

/** Dos líneas de largo parecido: en una sola, las letras serían demasiado bajas para enseñar plano. */
function balance(text: string) {
  const words = text.split(/\s+/);
  let best = 1;
  let diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (d < diff) [diff, best] = [d, i];
  }
  return words.length < 2 ? [text] : [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/** Hasta dónde llega el tramo cargado que empieza en 0 (el que importa para arrancar). */
function bufferedFromStart(v: HTMLVideoElement) {
  const b = v.buffered;
  for (let i = 0; i < b.length; i++) if (b.start(i) <= 0.25) return b.end(i);
  return 0;
}

/**
 * La primera pantalla es un cartón de título: el rótulo «free lost» manda, y la
 * película queda detrás, oscurecida. Al bajar, los créditos no se apagan a la vez: cada pieza se va
 * por su lado y a su hora, y el plano se queda solo. Entonces aparece el eslogan en el centro y
 * crece; mientras crece, la pantalla se cierra a tinta alrededor de las letras y la película queda
 * dentro de ellas, en cámara lenta. Después la escena se suelta y llega el carrete.
 */
export function Hero({ exit, ...stage }: HeroProps) {
  return (
    <ScrollScene height={exit.height} className="bg-ink">
      <HeroStage {...stage} exit={exit} />
    </ScrollScene>
  );
}

function HeroStage({ studio, name, role, slogan, film, labels, languages, exit }: HeroProps) {
  // Cada palabra de la marca es una línea con su máscara: son las que se abren al salir.
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  // El eslogan se pinta dos veces con la misma transformación, las dos como máscara: una agujerea
  // la tinta y la otra recorta el papel que se lee antes de que la tinta llegue y al final.
  const sloganRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const maskTextRef = useRef<SVGGElement>(null);
  const fillTextRef = useRef<SVGGElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const inkRef = useRef<SVGRectElement>(null);
  /** Medida del eslogan a cuerpo 100: `fit` es la escala con la que llena la pantalla justa. */
  const fitRef = useRef({ vw: 0, vh: 0, fit: 0, cx: 0, cy: 0 });
  const reduceRef = useRef(false);
  const provide = useCriticalAssets();
  const ready = useReady();
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(true);

  // Carga: el loader se llena con lo que lleva el vídeo, no con un temporizador.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceRef.current = reduce;
    if (reduce) {
      // Sin reproducción automática: se queda el póster y el botón de play. El loader solo
      // espera a esa imagen.
      v.preload = "metadata";
      const img = new Image();
      img.src = film.poster;
      provide([img.decode()]);
      return;
    }

    let resolve!: () => void;
    const done = new Promise<void>((r) => (resolve = r));
    const check = () => {
      const target = Math.min(BUFFER_S, v.duration || BUFFER_S);
      if (v.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA || bufferedFromStart(v) >= target) resolve();
    };
    // Sin limpiar a propósito: con StrictMode el registro se queda con la tarea del primer
    // montaje, y si sus oyentes se quitaran nunca terminaría. Viven lo que vive el <video>.
    for (const e of ["progress", "canplaythrough", "loadeddata", "timeupdate"]) v.addEventListener(e, check);
    v.addEventListener("error", () => resolve());
    provide([{ done, progress: () => bufferedFromStart(v) / BUFFER_S }]);

    // Reproducir ya, en silencio y detrás del velo, obliga a cargar (iOS ignora preload). Si
    // el navegador lo impide (ahorro de energía), no se espera: queda el póster y el play.
    v.play().catch(() => resolve());
  }, [provide, film.poster]);

  // El velo se abre: la película empieza desde su primer plano, no a mitad.
  useEffect(() => {
    const v = videoRef.current;
    if (!ready || !v || reduceRef.current) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  }, [ready]);

  // Fuera de pantalla (el visitante ya está en el carrete) se pausa: no tiene sentido descodificar
  // 1080p detrás de otra escena WebGL. Al volver sigue, salvo que la pausa fuera del visitante.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let autoPaused = false;
    const io = new IntersectionObserver(([entry]) => {
      if (!useLifecycle.getState().ready) return;
      if (!entry.isIntersecting && !v.paused) {
        autoPaused = true;
        v.pause();
      } else if (entry.isIntersecting && autoPaused) {
        autoPaused = false;
        v.play().catch(() => {});
      }
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  // La medida del eslogan depende de la fuente (Instrument Serif no se precarga) y de la pantalla:
  // se rehace cuando la fuente llega y, en la salida, cuando cambia el tamaño.
  const measure = () => {
    const t = textRef.current;
    if (!t) return;
    const b = t.getBBox();
    if (!b.width) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    fitRef.current = { vw, vh, fit: Math.min(vw / b.width, vh / b.height), cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
  };
  const measureRef = useRef(measure);
  useEffect(() => {
    measureRef.current = measure;
  });
  useEffect(() => {
    const again = () => measureRef.current();
    document.fonts.ready.then(again);
    document.fonts.addEventListener("loadingdone", again);
    return () => document.fonts.removeEventListener("loadingdone", again);
  }, []);

  // Salida: el progreso de la escena monta el plano. Estilo directo, sin re-render.
  useSceneProgress((p) => {
    const v = videoRef.current;
    const top = topRef.current;
    const credits = creditsRef.current;
    const svg = sloganRef.current;
    const maskText = maskTextRef.current;
    const fill = fillRef.current;
    const fillText = fillTextRef.current;
    const ink = inkRef.current;
    const scrim = scrimRef.current;
    if (!top || !credits || !svg || !maskText || !fillText || !fill || !ink || !scrim) return;
    const calm = reduceRef.current;

    // El eslogan: aparece, crece y se vuelve ventana. El plano de detrás no se toca.
    if (fitRef.current.vw !== window.innerWidth || fitRef.current.vh !== window.innerHeight) measure();
    const { vw, vh, fit, cx, cy } = fitRef.current;
    const enter = easeOut(segment(p, ...SLOGAN_IN));
    const grow = easeInOut(segment(p, ...SLOGAN_GROW));
    // Crecimiento geométrico: a ritmo constante el ojo lo lee como un acercamiento uniforme, sin
    // que el final se dispare. Al entrar arranca un 6 % por debajo (nunca desde cero). Con
    // movimiento reducido no crece: aparece ya a su tamaño final y solo cambian las opacidades.
    const scale = calm
      ? exit.to * fit
      : exit.from * fit * Math.pow(exit.to / exit.from, grow) * (0.94 + 0.06 * enter);
    const transform = `translate(${(vw / 2).toFixed(1)} ${(vh / 2).toFixed(1)}) scale(${scale.toFixed(4)}) translate(${(-cx).toFixed(1)} ${(-cy).toFixed(1)})`;
    maskText.setAttribute("transform", transform);
    fillText.setAttribute("transform", transform);
    const paper = 1 - easeInOut(segment(p, ...FILL_OUT)) + easeInOut(segment(p, ...FILL_BACK));
    fill.style.opacity = (enter * Math.min(1, paper)).toFixed(3);
    ink.style.opacity = easeInOut(segment(p, ...INK)).toFixed(3);
    scrim.style.opacity = (1 - easeInOut(segment(p, ...SCRIM_OUT))).toFixed(3);
    // Oculto (no display:none) antes de entrar: así getBBox sigue midiendo.
    svg.style.visibility = enter > 0 ? "" : "hidden";

    // Cámara lenta mientras crece; vuelve a 1 al rebobinar.
    if (v && !calm) {
      const rate = 1 + (exit.slowTo - 1) * grow;
      if (Math.abs(v.playbackRate - rate) > 0.02) v.playbackRate = rate;
    }

    // La marca se abre por la costura, como el velo del loader: «free» sube y «lost» baja. Luego
    // se van los créditos.
    const away = (el: HTMLElement, t: number, x: number, y: number) => {
      el.style.opacity = t > 0 ? String(1 - t) : "";
      el.style.transform = t > 0 && !calm ? `translate(${(x * t).toFixed(2)}vw, ${(y * t).toFixed(2)}vh)` : "";
      el.style.visibility = t >= 1 ? "hidden" : "";
    };
    away(top, easeInOut(segment(p, 0, 0.12)), 0, -5);
    away(credits, easeIn(segment(p, 0.02, 0.16)), -8, 0);
    wordRefs.current.forEach((w, i) => w && away(w, easeIn(segment(p, 0.03, 0.2)), 0, i % 2 === 0 ? -26 : 26));
  });

  // El estado de los botones sale del propio vídeo, no de lo que se pidió.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => {
      setPaused(v.paused);
      setMuted(v.muted);
    };
    for (const e of ["play", "pause", "volumechange"]) v.addEventListener(e, sync);
    return () => {
      for (const e of ["play", "pause", "volumechange"]) v.removeEventListener(e, sync);
    };
  }, []);

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.paused) v.play().catch(() => {});
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const words = studio.split(/\s+/);
  const lines = balance(slogan.text);
  // Las mismas líneas para la máscara y para el relleno. Cuerpo 100: la escala la pone la salida.
  const sloganText = (ref?: typeof textRef) => (
    <text ref={ref} fontSize={100} textAnchor="middle">
      {lines.map((l, i) => (
        <tspan key={i} x={0} dy={i === 0 ? 0 : "0.92em"}>
          {l}
        </tspan>
      ))}
    </text>
  );

  return (
    <div className={styles.hero} data-ready={ready || undefined}>
      <div className={styles.frame}>
      <video
        ref={videoRef}
        className={styles.film}
        muted
        playsInline
        loop
        preload="auto"
        poster={film.poster}
        aria-label={film.label}
      >
        {film.sources.map((s) => (
          <source key={s.src} src={s.src} media={s.media} type="video/mp4" />
        ))}
      </video>
        <div ref={scrimRef} className={styles.scrim} aria-hidden="true" />
      </div>

      {/* El eslogan de la salida: tinta con las letras recortadas encima de la película, y las
          mismas letras en papel para antes de que llegue la tinta y para el final. Lo lee el <p>
          oculto. */}
      <svg ref={sloganRef} className={styles.slogan} aria-hidden="true" style={{ visibility: "hidden" }}>
        <defs>
          <mask id={INK_MASK}>
            <rect width="100%" height="100%" fill="white" />
            <g ref={maskTextRef} fill="black">
              {sloganText()}
            </g>
          </mask>
          <mask id={FILL_MASK}>
            <rect width="100%" height="100%" fill="black" />
            <g ref={fillTextRef} fill="white">
              {sloganText()}
            </g>
          </mask>
        </defs>
        {/* Sin pintar y sin transformar: solo para medir (getBBox no mide dentro de <defs>). */}
        <g fill="none">{sloganText(textRef)}</g>
        <rect ref={inkRef} className={styles.ink} width="100%" height="100%" mask={`url(#${INK_MASK})`} opacity={0} />
        <rect ref={fillRef} className={styles.sloganFill} width="100%" height="100%" mask={`url(#${FILL_MASK})`} opacity={0} />
      </svg>
      <p className="sr-only" lang={slogan.lang}>
        {slogan.text}
      </p>

      {/* Créditos y controles: cada pieza sale por su lado (ver useSceneProgress). */}
      <div className={styles.chrome}>
      <header ref={topRef} className={styles.top}>
        {/* La marca nace ya en la esquina: el velo la descubre ahí, sin vuelo desde el centro
            (en el centro taparía a quien sale en el plano). */}
        <svg className={styles.mark} viewBox={LOGO_VIEWBOX} aria-hidden="true">
          <path d={LOGO_F} />
          <path d={LOGO_L} />
        </svg>
        <div className={styles.controls}>
          {/* Navegación normal (recarga): cada idioma es su propia página prerenderizada. */}
          <nav className={styles.langs} aria-label={labels.language}>
            {languages.map((l) => (
              <a
                key={l.code}
                href={l.href}
                hrefLang={l.code}
                lang={l.code}
                className={styles.lang}
                aria-current={l.current ? "page" : undefined}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <button type="button" className={styles.control} onClick={toggleSound} aria-pressed={!muted}>
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            <span>{labels.sound}</span>
          </button>
          <button
            type="button"
            className={styles.control}
            onClick={togglePlay}
            aria-label={paused ? labels.play : labels.pause}
          >
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* La marca es la protagonista: el rótulo del film, centrado. El eslogan no está al
          principio: llega con el scroll, cuando el rótulo ya se ha ido. */}
      <div className={styles.title}>
        <h1 className={styles.brand}>
          {/* El espacio va fuera de cada palabra: dentro de un inline-block se recortaría. */}
          {words.map((w, i) => (
            <Fragment key={i}>
              {i > 0 && " "}
              <span ref={(el) => void (wordRefs.current[i] = el)} className={`${styles.line} ${styles.negative}`}>
                <span className={styles.word} style={{ "--i": i, "--dir": i % 2 === 0 ? -1 : 1 } as CSSProperties}>
                  {w}
                </span>
              </span>
            </Fragment>
          ))}
        </h1>
      </div>

      <div ref={creditsRef} className={styles.credits}>
        <p className={styles.name}>{name}</p>
        <p className={styles.role}>{role}</p>
      </div>
      </div>
    </div>
  );
}
