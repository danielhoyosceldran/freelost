"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useCriticalAssets } from "@/core/lifecycle/BlockSlot";
import { useLifecycle, useReady } from "@/core/lifecycle/store";
import { ScrollScene, useSceneProgress } from "@/core/scroll/ScrollScene";
import { easeIn, easeInOut, easeOut, segment } from "@/lib/easing";
import { LOGO_F, LOGO_L, LOGO_VIEWBOX } from "@/lib/brand/logo";
import { morphWord } from "@/lib/morph/letters";
import type { HeroProps } from "./index";
import styles from "./hero.module.css";

/** Segundos de película cargados desde el principio para dar el loader por terminado. */
const BUFFER_S = 6;

/** ids de las máscaras del eslogan: la tinta con las letras agujereadas y las letras solas. Hay un
 * solo hero por página. */
const INK_MASK = "hero-slogan-ink";
const FILL_MASK = "hero-slogan-fill";

/**
 * Tramos de la salida sobre el progreso de la escena. Primero se va la interfaz (0–0,16) y, a la
 * vez, el rótulo se convierte en el eslogan: cada letra de «FREE» y «LOST» se transforma en la suya
 * de «free» y «lost.» mientras viaja a su sitio en la frase (`MORPH`), y el resto de la frase
 * aparece alrededor (`REST_IN`). Con el eslogan completo, crece hasta 0,86. El resto es un respiro
 * sobre el último fotograma antes de que la escena se suelte.
 */
const MORPH: [number, number] = [0.03, 0.26];
const REST_IN: [number, number] = [0.14, 0.28];
const SLOGAN_GROW: [number, number] = [0.3, 0.86];
/**
 * Dentro del viaje (0–1), relevo del rótulo al dibujo que se transforma. El rótulo se pinta en
 * `difference` y el morph en papel: un fundido corto tapa el cambio de mezcla.
 */
const HANDOFF = 0.08;
/** Cada letra empieza un poco después que la anterior: la palabra se transforma de izquierda a derecha. */
const STAGGER = 0.06;
/**
 * Composición del eslogan, en las unidades de sus SVG (salieron a cuerpo 100): espacio entre las
 * cajas de dos palabras e interlineado entre líneas base.
 */
const WORD_GAP = 24;
const LEADING = 92;
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

type Word = HeroProps["studioArt"][number];
type SloganWord = HeroProps["slogan"]["lines"][number][number];

/** La caja de mayúscula de una palabra del rótulo, sin rebases: es lo que se alinea y se mide. */
const capBox = (w: Word) => [w.box[0], w.capTop, w.box[2], w.baseline - w.capTop] as const;

/**
 * El eslogan compuesto: cada palabra con su desplazamiento (de sus unidades a las del eslogan),
 * líneas centradas y apoyadas en su base. `frame` es la caja de la palabra en sus unidades (para
 * normalizar el morph) y `at`, su centro ya en el eslogan.
 */
function layoutSlogan(lines: SloganWord[][]) {
  let key = 0;
  const words = lines.flatMap((line, li) => {
    const width = line.reduce((s, w) => s + w.box[2], 0) + WORD_GAP * (line.length - 1);
    let x = -width / 2;
    return line.map((w) => {
      const ox = x - w.box[0];
      const oy = li * LEADING - w.baseline;
      x += w.box[2] + WORD_GAP;
      const [bx, by, bw, bh] = w.box;
      const frame = { cx: bx + bw / 2, cy: by + bh / 2, size: Math.sqrt(bw * bh) };
      return { ...w, key: key++, ox, oy, frame, at: [frame.cx + ox, frame.cy + oy] as const };
    });
  });
  const x0 = Math.min(...words.map((w) => w.box[0] + w.ox));
  const y0 = Math.min(...words.map((w) => w.box[1] + w.oy));
  const x1 = Math.max(...words.map((w) => w.box[0] + w.box[2] + w.ox));
  const y1 = Math.max(...words.map((w) => w.box[1] + w.box[3] + w.oy));
  return { words, box: { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 } };
}

/** Posición de `el` dentro de `root` sumando offsets: sin transformaciones, la caja en reposo. */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
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

function HeroStage({ studio, studioArt, name, role, slogan, film, labels, languages, exit }: HeroProps) {
  // Cada palabra de la marca es una línea con su máscara: son las que se abren al salir.
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  // Palabras del eslogan en la máscara de relleno (se encienden por separado) y las letras que se
  // transforman, una <path> por letra de cada palabra del rótulo.
  const sloganWordRefs = useRef<(SVGGElement | null)[]>([]);
  const morphRef = useRef<SVGGElement>(null);
  const letterRefs = useRef<(SVGPathElement | null)[][]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  // El eslogan se pinta dos veces con la misma transformación, las dos como máscara: una agujerea
  // la tinta y la otra recorta el papel que se lee antes de que la tinta llegue y al final.
  const sloganRef = useRef<SVGSVGElement>(null);
  const maskTextRef = useRef<SVGGElement>(null);
  const fillTextRef = useRef<SVGGElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const inkRef = useRef<SVGRectElement>(null);
  /**
   * Medidas que dependen de la pantalla: `fit` es la escala con la que el eslogan la llena justa, y
   * `title`, la caja en px de cada palabra del rótulo en reposo (centro y tamaño), de donde sale
   * su morph.
   */
  const fitRef = useRef({ vw: 0, vh: 0, fit: 0, title: [] as { cx: number; cy: number; size: number }[] });
  const reduceRef = useRef(false);
  const layout = useMemo(() => layoutSlogan(slogan.lines), [slogan.lines]);
  // Lo caro del morph (remuestrear, emparejar huecos, alinear contornos) una sola vez.
  const morphs = useMemo(
    () =>
      studioArt.map((t, i) => {
        const target = layout.words.find((w) => w.from === i);
        if (!target) return null;
        const [x, y, w, h] = capBox(t);
        const frame = { cx: x + w / 2, cy: y + h / 2, size: Math.sqrt(w * h) };
        return { target, letters: morphWord({ letters: t.letters, frame }, { letters: target.letters, frame: target.frame }) };
      }),
    [studioArt, layout],
  );
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

  // Todo es dibujo, sin fuentes que esperar: la medida solo depende de la pantalla y se rehace en
  // la salida cuando cambia el tamaño.
  const measure = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hero = heroRef.current;
    // De dónde sale cada morph: la palabra del rótulo en reposo (los offsets ignoran la
    // transformación de su entrada). Su caja es la de mayúscula, así que `k` son px por unidad.
    const title = studioArt.map((t, i) => {
      const word = wordRefs.current[i]?.firstElementChild as HTMLElement | null | undefined;
      if (!word || !hero) return { cx: 0, cy: 0, size: 0 };
      const o = offsetIn(word, hero);
      const [, , w, h] = capBox(t);
      const k = word.offsetHeight / h;
      return { cx: o.x + word.offsetWidth / 2, cy: o.y + word.offsetHeight / 2, size: Math.sqrt(w * h) * k };
    });
    fitRef.current = { vw, vh, fit: Math.min(vw / layout.box.w, vh / layout.box.h), title };
  };

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
    const { vw, vh, fit, title } = fitRef.current;
    const { cx, cy } = layout.box;
    const grow = easeInOut(segment(p, ...SLOGAN_GROW));
    // Crecimiento geométrico: a ritmo constante el ojo lo lee como un acercamiento uniforme, sin
    // que el final se dispare. Durante el viaje está quieto en `from`: las palabras aterrizan en un
    // sitio fijo. Con movimiento reducido no crece: aparece ya a su tamaño final y solo cambian
    // las opacidades.
    const base = exit.from * fit;
    const scale = calm ? exit.to * fit : base * Math.pow(exit.to / exit.from, grow);
    const transform = `translate(${(vw / 2).toFixed(1)} ${(vh / 2).toFixed(1)}) scale(${scale.toFixed(4)}) translate(${(-cx).toFixed(1)} ${(-cy).toFixed(1)})`;
    maskText.setAttribute("transform", transform);
    fillText.setAttribute("transform", transform);
    const paper = 1 - easeInOut(segment(p, ...FILL_OUT)) + easeInOut(segment(p, ...FILL_BACK));
    fill.style.opacity = Math.min(1, paper).toFixed(3);
    ink.style.opacity = easeInOut(segment(p, ...INK)).toFixed(3);
    scrim.style.opacity = (1 - easeInOut(segment(p, ...SCRIM_OUT))).toFixed(3);
    svg.style.visibility = p > MORPH[0] ? "" : "hidden";

    // El morph. `e` lleva el viaje; las palabras de destino solo se encienden en el eslogan al
    // aterrizar, cuando el dibujo que se transforma ya es exactamente ellas. Con movimiento
    // reducido no hay morph: el rótulo se funde y la frase entera aparece con el resto.
    const e = easeInOut(segment(p, ...MORPH));
    const rest = easeOut(segment(p, ...REST_IN));
    const travels = (i?: number) => !calm && i !== undefined && !!morphs[i] && title[i]?.size > 0;
    for (const w of layout.words) {
      const o = travels(w.from) ? (e >= 1 ? 1 : 0) : rest;
      sloganWordRefs.current[w.key]?.setAttribute("fill-opacity", o.toFixed(3));
    }
    const morphing = !calm && e > 0 && e < 1;
    if (morphRef.current) {
      morphRef.current.style.visibility = morphing ? "" : "hidden";
      morphRef.current.style.opacity = segment(e, 0, HANDOFF).toFixed(3);
    }
    if (morphing) {
      morphs.forEach((m, i) => {
        if (!m || !travels(i)) return;
        // La palabra viaja como una caja: el centro en línea recta y el tamaño en progresión
        // geométrica (a ritmo constante el ojo lo lee como un alejamiento uniforme). Dentro de la
        // caja, cada letra pasa de su forma a la otra, en coordenadas normalizadas de palabra.
        const from = title[i];
        const tx = vw / 2 + base * (m.target.at[0] - cx);
        const ty = vh / 2 + base * (m.target.at[1] - cy);
        const px = from.cx + (tx - from.cx) * e;
        const py = from.cy + (ty - from.cy) * e;
        const size = from.size * Math.pow((base * m.target.frame.size) / from.size, e);
        const n = m.letters.length;
        m.letters.forEach((rings, j) => {
          const path = letterRefs.current[i]?.[j];
          if (!path) return;
          const t = easeInOut(segment(e, j * STAGGER, 1 - (n - 1 - j) * STAGGER));
          let d = "";
          for (const { a, b } of rings) {
            for (let k = 0; k < a.length; k += 2) {
              const x = px + size * (a[k] + (b[k] - a[k]) * t);
              const y = py + size * (a[k + 1] + (b[k + 1] - a[k + 1]) * t);
              d += `${k === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
            }
            d += "Z";
          }
          path.setAttribute("d", d);
        });
      });
    }

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
    wordRefs.current.forEach((line, i) => {
      if (!line) return;
      // Sin pareja en el eslogan (o sin movimiento): se abre por la costura.
      if (!travels(i)) return away(line, easeIn(segment(p, 0.03, 0.2)), 0, i % 2 === 0 ? -26 : 26);
      // Con pareja, el rótulo le pasa el relevo al dibujo que se transforma, que arranca encima.
      const out = segment(e, 0, HANDOFF);
      line.style.opacity = out > 0 ? String(1 - out) : "";
      line.style.visibility = out >= 1 ? "hidden" : "";
    });
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

  // El mismo dibujo para la máscara y para el relleno, en las unidades del eslogan: la escala la pone
  // la salida. Solo el relleno guarda sus palabras, que son las que se encienden.
  const sloganArt = (fill?: boolean) =>
    layout.words.map((w) => (
      <g
        key={w.key}
        ref={fill ? (el) => void (sloganWordRefs.current[w.key] = el) : undefined}
        transform={`translate(${w.ox.toFixed(2)} ${w.oy.toFixed(2)})`}
        fillOpacity={fill ? 0 : undefined}
      >
        {w.letters.map((d, j) => (
          <path key={j} d={d} />
        ))}
      </g>
    ));

  return (
    <div ref={heroRef} className={styles.hero} data-ready={ready || undefined}>
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
              {sloganArt()}
            </g>
          </mask>
          <mask id={FILL_MASK}>
            <rect width="100%" height="100%" fill="black" />
            <g ref={fillTextRef} fill="white">
              {sloganArt(true)}
            </g>
          </mask>
        </defs>
        <rect ref={inkRef} className={styles.ink} width="100%" height="100%" mask={`url(#${INK_MASK})`} opacity={0} />
        <rect ref={fillRef} className={styles.sloganFill} width="100%" height="100%" mask={`url(#${FILL_MASK})`} opacity={0} />
        {/* Las letras del rótulo transformándose en las del eslogan, en px de pantalla. Su `d` la
            escribe la salida en cada fotograma. */}
        <g ref={morphRef} className={styles.sloganFill} style={{ visibility: "hidden" }}>
          {morphs.map((m, i) =>
            m?.letters.map((_, j) => (
              <path
                key={`${i}-${j}`}
                ref={(el) => void ((letterRefs.current[i] ??= [])[j] = el)}
              />
            )),
          )}
        </g>
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
          <span className="sr-only">{studio}</span>
          {/* Dibujado (Druk Wide, a contornos): la caja de cada palabra es su altura de mayúscula. */}
          {studioArt.map((w, i) => (
            <span
              key={i}
              ref={(el) => void (wordRefs.current[i] = el)}
              className={`${styles.line} ${styles.negative}`}
              aria-hidden="true"
            >
              <span className={styles.word} style={{ "--i": i, "--dir": i % 2 === 0 ? -1 : 1 } as CSSProperties}>
                <svg className={styles.glyphs} viewBox={capBox(w).join(" ")}>
                  {w.letters.map((d, j) => (
                    <path key={j} d={d} />
                  ))}
                </svg>
              </span>
            </span>
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
