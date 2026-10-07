"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useCriticalAssets } from "@/core/lifecycle/BlockSlot";
import { useLifecycle, useReady } from "@/core/lifecycle/store";
import { ScrollScene, useSceneProgress } from "@/core/scroll/ScrollScene";
import { easeIn, easeInOut, segment } from "@/lib/easing";
import { LOGO_F, LOGO_L, LOGO_VIEWBOX } from "@/lib/brand/logo";
import type { HeroProps } from "./index";
import styles from "./hero.module.css";

/** Segundos de película cargados desde el principio para dar el loader por terminado. */
const BUFFER_S = 6;

/** Hasta dónde llega el tramo cargado que empieza en 0 (el que importa para arrancar). */
function bufferedFromStart(v: HTMLVideoElement) {
  const b = v.buffered;
  for (let i = 0; i < b.length; i++) if (b.start(i) <= 0.25) return b.end(i);
  return 0;
}

/**
 * La primera pantalla es un cartón de título: el rótulo «free lost» manda, y la
 * película queda detrás, oscurecida. Es una escena corta con ritmo de montaje: el plano sostiene, acelera
 * (encoge, se ladea y la película entra en cámara lenta) y corta. Los créditos no se apagan a la
 * vez: cada pieza se va por su lado y a su hora. Después la escena se suelta y llega el carrete.
 */
export function Hero({ exit, ...stage }: HeroProps) {
  return (
    <ScrollScene height={exit.height} className="bg-ink">
      <HeroStage {...stage} exit={exit} />
    </ScrollScene>
  );
}

function HeroStage({ studio, name, role, film, labels, languages, exit }: HeroProps) {
  // Cada palabra de la marca es una línea con su máscara: son las que se abren al salir.
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);
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

  // Salida: el progreso de la escena monta el plano. Estilo directo, sin re-render.
  useSceneProgress((p) => {
    const frame = frameRef.current;
    const v = videoRef.current;
    const top = topRef.current;
    const credits = creditsRef.current;
    if (!frame || !top || !credits) return;
    const calm = reduceRef.current;

    // El plano no desaparece: encoge hasta `scale` y se queda. Luego la escena se suelta y sube
    // con la página, pegado al carrete.
    const ramp = easeInOut(segment(p, exit.hold, 1));
    const scale = 1 - (1 - exit.scale) * ramp;
    frame.style.transform = calm || ramp <= 0 ? "" : `scale(${scale.toFixed(4)})`;

    // Cámara lenta mientras encoge; vuelve a 1 al rebobinar.
    if (v && !calm) {
      const rate = 1 + (exit.slowTo - 1) * ramp;
      if (Math.abs(v.playbackRate - rate) > 0.02) v.playbackRate = rate;
    }

    // La marca se abre por la costura, como el velo del loader: «free» sube y «lost» baja. Luego
    // se van los créditos.
    const away = (el: HTMLElement, t: number, x: number, y: number) => {
      el.style.opacity = t > 0 ? String(1 - t) : "";
      el.style.transform = t > 0 && !calm ? `translate(${(x * t).toFixed(2)}vw, ${(y * t).toFixed(2)}vh)` : "";
      el.style.visibility = t >= 1 ? "hidden" : "";
    };
    away(top, easeInOut(segment(p, 0, 0.3)), 0, -5);
    away(credits, easeIn(segment(p, 0.05, 0.45)), -8, 0);
    wordRefs.current.forEach((w, i) => w && away(w, easeIn(segment(p, 0.08, 0.6)), 0, i % 2 === 0 ? -26 : 26));
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

  return (
    <div className={styles.hero} data-ready={ready || undefined}>
      <div ref={frameRef} className={styles.frame}>
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
        <div className={styles.scrim} aria-hidden="true" />
      </div>

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

      {/* La marca es la protagonista: el rótulo del film, centrado. El eslogan no va aquí: se
          descubre más abajo (bloque `slogan`). */}
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
