"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCriticalAssets } from "@/core/lifecycle/BlockSlot";
import { useLifecycle } from "@/core/lifecycle/store";
import { scrollController } from "@/core/scroll/controller";
import { ScrollGate } from "@/core/scroll/ScrollGate";
import { ScrollScene, useScene } from "@/core/scroll/ScrollScene";
import { useScrollMagnet } from "@/core/scroll/useScrollMagnet";
import { clamp01, pad2 } from "@/lib/easing";
import { FlexCarousel } from "@/lib/webgl/flex-carousel/FlexCarousel";
import type { ReelProps } from "./index";
import { ProjectView } from "./project";
import styles from "./reel.module.css";
import { coverOf } from "./slides";

const PIN_OWNER = "reel:project";
const DIGITS = Array.from({ length: 10 }, (_, n) => n);

export function Reel({ anchor, height, warmAt, gate, ...stage }: ReelProps) {
  return (
    <ScrollScene anchor={anchor} height={height} warmAt={warmAt} className="bg-void">
      <ReelStage {...stage} />
      {gate && <ScrollGate {...gate} />}
    </ScrollScene>
  );
}

type StageProps = Omit<ReelProps, "anchor" | "height" | "warmAt" | "gate">;

/**
 * Monta el motor WebGL (FlexCarousel) y la vista de proyecto (ProjectView) y los conecta con el
 * núcleo: progreso de la escena → cinta, imán, pin de la página con un proyecto abierto, y la
 * intro esperando a 'ready'. No re-renderiza nunca: todo lo que cambia va por refs.
 */
function ReelStage({ slides, labels, lens, liquid, squeeze }: StageProps) {
  const scene = useScene();
  const provide = useCriticalAssets();
  const n = slides.length;

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
        place.textContent = slides[i].place;
        place.classList.remove(styles.enter);
        void place.offsetWidth; // reinicia la animación de entrada del título
        place.classList.add(styles.enter);
      }
      if (liveRef.current) liveRef.current.textContent = `${slides[i].place}, ${i + 1} ${labels.of} ${n}`;
    },
    [slides, labels.of, n],
  );

  useScrollMagnet({ count: () => n, enabled: () => !viewRef.current?.isOpen });

  useEffect(() => {
    const root = rootRef.current!;
    const host = hostRef.current!;
    const close = closeRef.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const carousel = FlexCarousel.create(host, {
      covers: slides.map(coverOf),
      lens,
      liquid,
      squeeze,
      reduced,
      readCardFrac: () => parseFloat(getComputedStyle(root).getPropertyValue("--reel-card")),
      onActive: setCaption,
      onRevealed: () => root.classList.add(styles.revealed),
    });

    if (!carousel) {
      // Sin WebGL2 no hay carrete, pero la escena (y la puerta) tienen que seguir funcionando:
      // el pie de foto sigue al scroll y no hay nada que esperar.
      console.warn("[carrete] WebGL2 no disponible");
      root.classList.add(styles.revealed);
      provide([]);
      let last = -1;
      return scene.subscribe((p) => {
        const i = Math.round(clamp01(p) * (n - 1));
        if (i !== last) setCaption((last = i));
      });
    }

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
        // Con un proyecto abierto la página se clava: el scroll ya no pilota la cinta. La rueda
        // pasa a ser scrub del vídeo (y con foto no hace nada, pero no mueve la página).
        onOpen: () => {
          scrollController.pin(PIN_OWNER);
          releaseInput = scrollController.captureInput((_delta, e) => view.onInput(e));
        },
        // Al salir, la página vuelve al punto que deja centrada la foto vista, en vez de
        // recolocar la cinta: la página es el motor.
        onClose: (i) => {
          releaseInput?.();
          releaseInput = null;
          scrollController.unpin(PIN_OWNER);
          scrollController.scrollTo(scene.yAt(n > 1 ? i / (n - 1) : 0), "instant");
          carousel.applyProgress(scene.progress());
        },
      },
    );
    viewRef.current = view;

    // Motor único: el avance de la escena ES la posición de la cinta.
    const offProgress = scene.subscribe((p) => carousel.applyProgress(p));

    // La intro espera a que se levante la pantalla de carga.
    const startIfReady = (ready: boolean) => ready && carousel.start();
    startIfReady(useLifecycle.getState().ready);
    const offReady = useLifecycle.subscribe((s) => startIfReady(s.ready));

    let hover = "";
    const onPointerMove = (e: PointerEvent) => {
      const hit = carousel.hitTest(e.clientX, e.clientY);
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
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) return; // un gesto, no un clic
      const hit = carousel.hitTest(e.clientX, e.clientY);
      if (!hit) return;
      // La del centro abre su proyecto; cualquier otra lleva la PÁGINA hasta ella (mover la
      // cinta directamente la desincronizaría del scroll).
      if (hit.index === carousel.activeIndex) view.enter(hit.index);
      else scene.seek(n > 1 ? hit.index / (n - 1) : 0);
    };
    const onHostKey = (e: KeyboardEvent) => {
      if (view.isOpen || !carousel.introDone) return;
      if (e.key === "Enter" || e.key === " ") {
        view.enter(Math.max(carousel.activeIndex, 0));
        e.preventDefault();
      }
    };
    const onDocKey = (e: KeyboardEvent) => {
      if (view.isOpen && e.key === "Escape") view.exit();
    };
    const onResize = () => view.onResize();
    const onClose = () => view.exit();

    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("keydown", onHostKey);
    document.addEventListener("keydown", onDocKey);
    window.addEventListener("resize", onResize);
    close.addEventListener("click", onClose);

    return () => {
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("keydown", onHostKey);
      document.removeEventListener("keydown", onDocKey);
      window.removeEventListener("resize", onResize);
      close.removeEventListener("click", onClose);
      offProgress();
      offReady();
      view.destroy();
      releaseInput?.();
      scrollController.unpin(PIN_OWNER);
      viewRef.current = null;
      carousel.destroy();
      root.classList.remove(styles.revealed);
    };
  }, [scene, provide, slides, lens, liquid, squeeze, n, setCaption]);

  return (
    <div ref={rootRef} className={styles.root}>
      {/* Dentro del root y no fuera: así se apaga con el resto del HUD al entrar en un proyecto. */}
      <span className={styles.seq}>{labels.sequence}</span>

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
  );
}
