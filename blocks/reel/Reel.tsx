"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCriticalAssets, useReleaseHold } from "@/core/lifecycle/BlockSlot";
import { useLifecycle } from "@/core/lifecycle/store";
import { scrollController } from "@/core/scroll/controller";
import { pad2 } from "@/lib/easing";
import { FlexCarousel } from "@/lib/webgl/flex-carousel/FlexCarousel";
import type { ReelProps } from "./index";
import { ProjectView } from "./project";
import styles from "./reel.module.css";
import { coverOf } from "./slides";

const PIN_OWNER = "reel:project";
const DIGITS = Array.from({ length: 10 }, (_, n) => n);
/**
 * Llegada a la sección: cuando su borde superior está a esta fracción de pantalla del techo,
 * entra el título; RISE_DELAY ms después, las tarjetas suben (el "rise" de React Bits). La pausa
 * es a propósito: primero se llega a la sección y luego aparece el material.
 */
const ARRIVE_AT = 0.15;
const RISE_DELAY = 550;
/** Lente de los bordes: solo con ratón o trackpad (ordenador), no en táctil. */
const LENS_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * Monta el motor WebGL (FlexCarousel) y la vista de proyecto (ProjectView) y los conecta con el
 * núcleo: llegada → título y rise, pin de la página con un proyecto abierto, y el hold de los
 * bloques de debajo. No re-renderiza nunca: todo lo que cambia va por refs.
 */
export function Reel({ anchor, slides, labels, gap, aspect, lens, liquid, squeeze }: ReelProps) {
  const provide = useCriticalAssets();
  const releaseHold = useReleaseHold();
  const n = slides.length;

  const sectionRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const digitRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const placeRef = useRef<HTMLElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGRectElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);
  const scrubFillRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const viewRef = useRef<ProjectView | null>(null);

  const setCaption = useCallback(
    (i: number) => {
      pad2(i + 1)
        .split("")
        .forEach((d, k) => {
          const reel = digitRefs.current[k];
          if (reel) reel.style.transform = `translateY(${-Number(d) * 10}%)`;
        });
      const place = placeRef.current;
      if (place) {
        place.textContent = slides[i].caption;
        place.classList.remove(styles.enter);
        void place.offsetWidth; // reinicia la animación de entrada del título
        place.classList.add(styles.enter);
      }
      if (liveRef.current) liveRef.current.textContent = `${slides[i].caption}, ${i + 1} ${labels.of} ${n}`;
    },
    [slides, labels.of, n],
  );

  useEffect(() => {
    const root = rootRef.current!;
    const host = hostRef.current!;
    const close = closeRef.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // La vista de proyecto se crea después que el motor (lo necesita), pero el motor ya avisa
    // de las selecciones: se le pasa por esta referencia.
    let select: (i: number) => void = () => {};
    const carousel = FlexCarousel.create(host, {
      covers: slides.map(coverOf),
      lens,
      liquid,
      squeeze,
      gap,
      aspect,
      fallbackAspect: 16 / 9,
      reduced,
      readCardFrac: () => parseFloat(getComputedStyle(root).getPropertyValue("--reel-card")),
      onActive: setCaption,
      onSelect: (i) => select(i),
      onRevealed: () => root.classList.add(styles.revealed),
    });

    if (!carousel) {
      // Sin WebGL2 no hay carrete: queda el título y el pie de la primera, y no se retiene a
      // nadie de debajo.
      console.warn("[carrete] WebGL2 no disponible");
      root.classList.add(styles.arrived, styles.revealed);
      setCaption(0);
      releaseHold();
      return;
    }

    const lensMq = matchMedia(LENS_QUERY);
    const syncLens = () => carousel.setLens(lensMq.matches);
    syncLens();
    lensMq.addEventListener("change", syncLens);

    provide(carousel.loads);

    let releaseInput: (() => void) | null = null;
    const view = new ProjectView(
      {
        root,
        project: projectRef.current!,
        frame: frameRef.current!,
        media: mediaRef.current!,
        bar: barRef.current!,
        ring: ringRef.current!,
        scrub: scrubRef.current!,
        scrubFill: scrubFillRef.current!,
        close,
      },
      {
        splitting: styles.splitting,
        loading: styles.loading,
        inProject: styles.inProject,
        growing: styles.growing,
        fromCard: styles.fromCard,
        current: styles.current,
        scrubVisible: styles.scrubVisible,
      },
      carousel,
      {
        slides,
        reduced,
        // Con un proyecto abierto la página se clava y la rueda pasa a ser scrub del vídeo (con
        // foto no hace nada, pero no mueve la página).
        onOpen: () => {
          scrollController.pin(PIN_OWNER);
          releaseInput = scrollController.captureInput((_delta, e) => view.onInput(e));
        },
        // La tarjeta vista sigue en el centro: solo hay que soltar la página.
        onClose: () => {
          releaseInput?.();
          releaseInput = null;
          scrollController.unpin(PIN_OWNER);
        },
      },
    );
    viewRef.current = view;
    select = (i) => view.enter(i);

    // Llegada: una sola vez. El título entra ya; las tarjetas, tras la pausa. La intro corre con
    // su propio reloj (no la pilota el scroll), así que se ve entera aunque se siga bajando.
    let riseTimer = 0;
    let arrived = false;
    const checkArrival = () => {
      const section = sectionRef.current;
      if (arrived || !section || !useLifecycle.getState().ready) return;
      if (section.getBoundingClientRect().top > window.innerHeight * ARRIVE_AT) return;
      arrived = true;
      root.classList.add(styles.arrived);
      riseTimer = window.setTimeout(() => carousel.start(), RISE_DELAY);
      // Ya estamos aquí: lo de debajo (three.js de "Lo que uso") puede empezar a cargar.
      releaseHold();
    };
    checkArrival();
    const offIntro = scrollController.subscribe(checkArrival);

    // Cursor: "open" sobre la del centro, "seek" sobre una lateral. El arrastre lo marca el motor
    // con data-dragging (y el CSS pone la mano cerrada).
    let hover = "";
    const onPointerMove = (e: PointerEvent) => {
      const hit = host.hasAttribute("data-dragging") ? null : carousel.hitTest(e.clientX, e.clientY);
      const next = hit ? (hit.index === carousel.activeIndex ? "open" : "seek") : "";
      if (next === hover) return;
      hover = next;
      if (hover) host.setAttribute("data-hover", hover);
      else host.removeAttribute("data-hover");
    };
    const onPointerLeave = () => {
      hover = "";
      host.removeAttribute("data-hover");
    };
    const onDocKey = (e: KeyboardEvent) => {
      if (view.isOpen && e.key === "Escape") view.exit();
    };
    const onResize = () => view.onResize();
    const onClose = () => view.exit();

    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("keydown", onDocKey);
    window.addEventListener("resize", onResize);
    close.addEventListener("click", onClose);

    return () => {
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      lensMq.removeEventListener("change", syncLens);
      document.removeEventListener("keydown", onDocKey);
      window.removeEventListener("resize", onResize);
      close.removeEventListener("click", onClose);
      offIntro();
      clearTimeout(riseTimer);
      view.destroy();
      releaseInput?.();
      scrollController.unpin(PIN_OWNER);
      viewRef.current = null;
      carousel.destroy();
      root.classList.remove(styles.revealed, styles.arrived);
    };
  }, [provide, releaseHold, slides, gap, aspect, lens, liquid, squeeze, setCaption]);

  return (
    <section ref={sectionRef} id={anchor} className={styles.section}>
      <div ref={rootRef} className={styles.root}>
      {/* Dentro del root y no fuera: así se apaga con el resto del HUD al entrar en un proyecto. */}
      <h2 className={styles.title}>{labels.title}</h2>

      <div className={styles.marker} />

      {/* El <canvas> lo crea FlexCarousel dentro de este contenedor. */}
      <div
        ref={hostRef}
        className={styles.flex}
        tabIndex={0}
        role="region"
        aria-roledescription="carrusel"
        aria-label={labels.carousel}
      />

      <figure className={styles.caption} aria-hidden="true">
        <div className={styles.count}>
          <span className={styles.digits}>
            {[0, 1].map((k) => (
              <span key={k} className={styles.digit}>
                <span ref={(el) => void (digitRefs.current[k] = el)} className={styles.digitReel}>
                  {DIGITS.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </span>
              </span>
            ))}
          </span>
          <span className={styles.slash}>/</span>
          <span>{pad2(n)}</span>
        </div>
        <figcaption ref={placeRef} className={styles.place} />
      </figure>
      <div ref={liveRef} className={styles.live} aria-live="polite" aria-atomic="true" />

      {/* Vista de proyecto: oculta con [hidden] fuera de un proyecto. La maneja ProjectView. */}
      <section ref={projectRef} className={styles.project} hidden aria-hidden="true" aria-label={labels.project}>
        <div ref={frameRef} className={styles.frame}>
          <div ref={mediaRef} className={styles.media} />
          <div ref={barRef} className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
            <svg className={styles.barProgress}>
              <rect ref={ringRef} />
            </svg>
          </div>
          <div ref={scrubRef} className={styles.scrub} aria-hidden="true">
            <div ref={scrubFillRef} className={styles.scrubFill} />
          </div>
        </div>
      </section>
      <button ref={closeRef} className={styles.close} type="button" inert aria-label={labels.close} />
    </div>
    </section>
  );
}
