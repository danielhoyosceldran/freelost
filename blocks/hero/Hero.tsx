"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useCriticalAssets } from "@/core/lifecycle/BlockSlot";
import { useReady } from "@/core/lifecycle/store";
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

export function Hero({ studio, name, role, slogan, sloganLang, film, labels }: HeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const markRef = useRef<SVGSVGElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const reduceRef = useRef(false);
  const flownRef = useRef(false);
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

  // La marca vive en la esquina, junto al nombre del estudio, pero arranca en el centro, justo
  // debajo de la del loader (el hueco .brand-mark da esa geometría). Mientras carga se mantiene
  // ahí con un transform inverso (FLIP), recalculado si cambia el viewport; al abrirse el velo
  // vuela a su sitio. En el centro taparía a quien sale en el plano durante toda la película.
  useEffect(() => {
    const mark = markRef.current;
    const slot = slotRef.current;
    if (!mark || !slot || reduceRef.current) return;
    const place = () => {
      // Ya en la esquina, el layout manda: un resize no puede devolverla al centro.
      if (flownRef.current) return;
      mark.style.transform = "none";
      const home = mark.getBoundingClientRect();
      const center = slot.getBoundingClientRect();
      const s = center.height / home.height;
      const dx = center.left + center.width / 2 - (home.left + home.width / 2);
      const dy = center.top + center.height / 2 - (home.top + home.height / 2);
      mark.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  useEffect(() => {
    const mark = markRef.current;
    if (!ready || !mark || reduceRef.current) return;
    // La clase pone la transición (con su retardo: primero sale el velo y se funde la marca
    // del loader); quitar el transform en el frame siguiente la dispara.
    flownRef.current = true;
    mark.classList.add(styles.markFlying);
    const raf = requestAnimationFrame(() => (mark.style.transform = ""));
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  // El velo se abre: la película empieza desde su primer plano, no a mitad.
  useEffect(() => {
    const v = videoRef.current;
    if (!ready || !v || reduceRef.current) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  }, [ready]);

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

  const words = name.split(/\s+/);

  return (
    <section className={styles.hero} data-ready={ready || undefined}>
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

      {/* Hueco invisible con la geometría de la marca del loader: el punto de partida del vuelo. */}
      <span ref={slotRef} className="brand-mark" aria-hidden="true" />

      <header className={styles.top}>
        <div className={styles.lockup}>
          <svg ref={markRef} className={styles.mark} viewBox={LOGO_VIEWBOX} aria-hidden="true">
            <path d={LOGO_F} />
            <path d={LOGO_L} />
          </svg>
          <p className={styles.studio}>{studio}</p>
        </div>
        <div className={styles.controls}>
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

      <div className={styles.credits}>
        <div>
          <h1 className={styles.name}>
            {/* El espacio va fuera de cada palabra: dentro de un inline-block se recortaría. */}
            {words.map((w, i) => (
              <Fragment key={i}>
                {i > 0 && " "}
                <span className={styles.line}>
                  <span className={styles.word} style={{ "--i": i } as CSSProperties}>
                    {w}
                  </span>
                </span>
              </Fragment>
            ))}
          </h1>
          <p className={styles.role}>{role}</p>
        </div>
        <p className={styles.slogan} lang={sloganLang}>
          {slogan}
        </p>
      </div>
    </section>
  );
}
