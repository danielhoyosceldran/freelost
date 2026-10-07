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
/** Prefijo de los desenfoques de las palabras que viajan (uno por palabra: cada una va a su escala). */
const MORPH_BLUR = "hero-morph-blur";

/**
 * Tramos de la salida sobre el progreso de la escena. Primero se va la interfaz (0–0,16) y, a la
 * vez, el rótulo se convierte en el eslogan: «FREE» y «LOST» viajan hasta su sitio en «Feel free to
 * get lost.» y cambian de fuente por el camino (`MORPH`), mientras el resto de la frase aparece
 * alrededor (`REST_IN`). Con el eslogan completo, crece hasta 0,86. El resto es un respiro sobre el
 * último fotograma antes de que la escena se suelte.
 */
const MORPH: [number, number] = [0.03, 0.26];
const REST_IN: [number, number] = [0.14, 0.28];
const SLOGAN_GROW: [number, number] = [0.3, 0.86];
/**
 * Dentro del viaje (0–1): la palabra en la fuente de título se apaga y se desenfoca mientras su
 * gemela en cursiva se enfoca encima. Se solapan: no hay instante sin palabra.
 */
const TITLE_OUT: [number, number] = [0.2, 0.6];
const SERIF_IN: [number, number] = [0.35, 0.8];
/** Desenfoque máximo del relevo, en px de pantalla. */
const MORPH_BLUR_PX = 14;
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

/** Un trozo de una línea del eslogan. `match` es la palabra del rótulo que viaja hasta aquí. */
type Seg = { text: string; key: number; at: number; match?: number };

const norm = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/**
 * Las líneas del eslogan en trozos: cada palabra del rótulo que aparece en él (sin la puntuación:
 * «lost.» casa con LOST y el punto se queda con el resto) queda suelta, para medirla y para
 * encenderla aparte. `at` es su primer carácter en el texto entero, que es lo que pide
 * getStartPositionOfChar.
 */
function segmentLines(lines: string[], title: string[]) {
  const used = new Set<number>();
  let key = 0;
  let at = 0;
  return lines.map((line) => {
    const segs: Seg[] = [];
    const push = (text: string) => {
      if (!text) return;
      const last = segs.at(-1);
      if (last && last.match === undefined) last.text += text;
      else segs.push({ text, key: key++, at });
      at += text.length;
    };
    line.split(" ").forEach((word, wi) => {
      if (wi > 0) push(" ");
      const n = norm(word);
      const ti = title.findIndex((t, i) => !used.has(i) && !!n && norm(t) === n);
      if (ti < 0) return push(word);
      used.add(ti);
      const m = word.toLowerCase().indexOf(n);
      push(word.slice(0, m));
      segs.push({ text: word.slice(m, m + n.length), key: key++, at, match: ti });
      at += n.length;
      push(word.slice(m + n.length));
    });
    return segs;
  });
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

type Box = { cx: number; cy: number; w: number; h: number };
/**
 * Lo que necesita el viaje de una palabra: su caja en el rótulo, el origen de su línea (que es lo
 * que se transforma) y la caja de su gemela en cursiva en las coordenadas del eslogan a cuerpo 100.
 */
type Morph = { from: Box; origin: { x: number; y: number }; to: Box };

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
  const heroRef = useRef<HTMLDivElement>(null);
  // Trozos del eslogan en la máscara de relleno (se encienden por separado) y las copias en
  // cursiva que viajan desde el rótulo, con su desenfoque.
  const segRefs = useRef<(SVGTSpanElement | null)[]>([]);
  const copyRefs = useRef<(SVGTextElement | null)[]>([]);
  const blurRefs = useRef<(SVGFEGaussianBlurElement | null)[]>([]);
  const morphRef = useRef<(Morph | undefined)[]>([]);
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
  const words = studio.split(/\s+/);
  const segLines = segmentLines(balance(slogan.text), words);
  const segs = segLines.flat();
  const travellers = segs.filter((s) => s.match !== undefined);
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

    // Cada palabra que viaja: de dónde sale (la del rótulo, en reposo) y adónde llega (su gemela,
    // puesta en el primer carácter de su trozo para que al aterrizar coincida píxel a píxel).
    const hero = heroRef.current;
    morphRef.current = [];
    if (!hero) return;
    for (const s of segs) {
      if (s.match === undefined) continue;
      const line = wordRefs.current[s.match];
      const word = line?.firstElementChild as HTMLElement | null;
      const copy = copyRefs.current[s.match];
      if (!line || !word || !copy) continue;
      let pt: DOMPoint;
      try {
        pt = t.getStartPositionOfChar(s.at);
      } catch {
        continue;
      }
      copy.setAttribute("x", pt.x.toFixed(2));
      copy.setAttribute("y", pt.y.toFixed(2));
      const c = copy.getBBox();
      const w = offsetIn(word, hero);
      morphRef.current[s.match] = {
        from: { cx: w.x + word.offsetWidth / 2, cy: w.y + word.offsetHeight / 2, w: word.offsetWidth, h: word.offsetHeight },
        origin: offsetIn(line, hero),
        to: { cx: c.x + c.width / 2, cy: c.y + c.height / 2, w: c.width, h: c.height },
      };
    }
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
    // Oculto (no display:none) antes de entrar: así getBBox sigue midiendo.
    svg.style.visibility = p > MORPH[0] ? "" : "hidden";

    // El morph. `e` lleva el viaje; las palabras que viajan solo se encienden en el eslogan al
    // aterrizar, cuando su copia está exactamente encima. Con movimiento reducido no viajan: el
    // rótulo se funde y la frase entera aparece con el resto.
    const e = easeInOut(segment(p, ...MORPH));
    const rest = easeOut(segment(p, ...REST_IN));
    const morphs = morphRef.current;
    const travels = (i?: number) => !calm && i !== undefined && !!morphs[i];
    for (const s of segs) {
      const o = travels(s.match) ? (e >= 1 ? 1 : 0) : rest;
      segRefs.current[s.key]?.setAttribute("fill-opacity", o.toFixed(3));
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
      const m = morphs[i];
      const copy = copyRefs.current[i];
      if (!travels(i) || !m) {
        // Sin gemela en el eslogan (o sin movimiento): se abre por la costura como antes.
        if (copy) copy.style.visibility = "hidden";
        return away(line, easeIn(segment(p, 0.03, 0.2)), 0, i % 2 === 0 ? -26 : 26);
      }
      // Una caja virtual viaja del rótulo a la cursiva: el centro en línea recta y el tamaño en
      // progresión geométrica, con `k` (media de la razón de anchos y de altos) como salto total.
      // Las dos fuentes tienen proporciones muy distintas y ninguna medida sola vale para las dos.
      const tx = vw / 2 + base * (m.to.cx - cx);
      const ty = vh / 2 + base * (m.to.cy - cy);
      const k = Math.sqrt(((base * m.to.w) / m.from.w) * ((base * m.to.h) / m.from.h));
      const g = Math.pow(k, e);
      const x = m.from.cx + (tx - m.from.cx) * e;
      const y = m.from.cy + (ty - m.from.cy) * e;

      // La palabra del rótulo, escalada desde la esquina de su línea (que es lo que se transforma).
      const out = segment(e, ...TITLE_OUT);
      line.style.transformOrigin = "0 0";
      line.style.transform =
        e > 0
          ? `translate(${(x - m.origin.x - g * (m.from.cx - m.origin.x)).toFixed(2)}px, ${(y - m.origin.y - g * (m.from.cy - m.origin.y)).toFixed(2)}px) scale(${g.toFixed(4)})`
          : "";
      line.style.opacity = out > 0 ? String(1 - out) : "";
      line.style.filter = out > 0 ? `blur(${((out * MORPH_BLUR_PX) / g).toFixed(2)}px)` : "";
      line.style.visibility = out >= 1 ? "hidden" : "";

      // Su gemela en cursiva, en la misma caja. Al aterrizar le pasa el relevo a su trozo del eslogan.
      if (!copy) return;
      const inn = segment(e, ...SERIF_IN);
      const sc = (base * g) / k;
      copy.setAttribute(
        "transform",
        `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc.toFixed(4)}) translate(${(-m.to.cx).toFixed(1)} ${(-m.to.cy).toFixed(1)})`,
      );
      copy.style.opacity = inn.toFixed(3);
      copy.style.visibility = inn > 0 && e < 1 ? "" : "hidden";
      // El desenfoque se aplica antes de la escala del texto: se divide para que en pantalla mida
      // lo mismo a cualquier tamaño.
      blurRefs.current[i]?.setAttribute("stdDeviation", (((1 - inn) * MORPH_BLUR_PX) / sc).toFixed(2));
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

  // Las mismas líneas, en los mismos trozos, para medir, para la máscara y para el relleno: así los
  // glifos caen en el mismo sitio en las tres. Cuerpo 100: la escala la pone la salida. Solo el
  // relleno guarda sus trozos, que son los que se encienden.
  const sloganText = (ref?: typeof textRef, fill?: boolean) => (
    <text ref={ref} fontSize={100} textAnchor="middle">
      {segLines.map((line, i) => (
        <tspan key={i} x={0} dy={i === 0 ? 0 : "0.92em"}>
          {line.map((s) => (
            <tspan
              key={s.key}
              ref={fill ? (el) => void (segRefs.current[s.key] = el) : undefined}
              fillOpacity={fill ? 0 : undefined}
            >
              {s.text}
            </tspan>
          ))}
        </tspan>
      ))}
    </text>
  );

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
              {sloganText()}
            </g>
          </mask>
          <mask id={FILL_MASK}>
            <rect width="100%" height="100%" fill="black" />
            <g ref={fillTextRef} fill="white">
              {sloganText(undefined, true)}
            </g>
          </mask>
          {travellers.map((s) => (
            <filter key={s.match} id={`${MORPH_BLUR}-${s.match}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur ref={(el) => void (blurRefs.current[s.match!] = el)} stdDeviation={0} />
            </filter>
          ))}
        </defs>
        {/* Sin pintar y sin transformar: solo para medir (getBBox no mide dentro de <defs>). */}
        <g fill="none">{sloganText(textRef)}</g>
        <rect ref={inkRef} className={styles.ink} width="100%" height="100%" mask={`url(#${INK_MASK})`} opacity={0} />
        <rect ref={fillRef} className={styles.sloganFill} width="100%" height="100%" mask={`url(#${FILL_MASK})`} opacity={0} />
        {/* Las palabras del rótulo en cursiva, de viaje hacia su sitio en el eslogan. */}
        {travellers.map((s) => (
          <text
            key={s.match}
            ref={(el) => void (copyRefs.current[s.match!] = el)}
            className={styles.sloganFill}
            fontSize={100}
            filter={`url(#${MORPH_BLUR}-${s.match})`}
            style={{ visibility: "hidden" }}
          >
            {s.text}
          </text>
        ))}
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
