"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { preconnect } from "react-dom";
import { useCriticalAssets, useReleaseHold } from "@/core/lifecycle/BlockSlot";
import { useLifecycle } from "@/core/lifecycle/store";
import { scrollController } from "@/core/scroll/controller";
import { handoff } from "@/core/transition/handoff";
import { easeOut, pad2 } from "@/lib/easing";
import { FlexCarousel } from "@/lib/webgl/flex-carousel/FlexCarousel";
import type { ReelProps } from "./index";
import { ProjectView } from "./project";
import styles from "./reel.module.css";
import { coverOf } from "./slides";

const PIN_OWNER = "reel:project";
const LEAVE_OWNER = "reel:leave";
/**
 * Salida a "todos los proyectos": la cinta avanza al menos SWEEP_MIN tarjetas (o todas, si hay
 * más) en SWEEP_S segundos y detrás llega el recuadro naranja al centro; luego crece (su
 * transición está en el CSS) y se navega. BOX_FALLBACK_MS cubre
 * un transitionend que no llegue.
 */
const SWEEP_MIN = 15;
const SWEEP_S = 1.15;
const BOX_FALLBACK_MS = 1200;
/**
 * Vuelta: el recuadro encoge de pantalla entera a 0,5 en SHRINK_S y, sin pausa, la cinta entra
 * en BACK_S. Los dos con ease-out: arrancan lanzados, sin el arranque lento de un ease-in-out.
 * MAX_DT es el máximo que avanza el encogido por fotograma (el mismo límite que el motor).
 */
const SHRINK_S = 0.55;
const BACK_S = 0.9;
const MAX_DT = 0.05;
const DIGITS = Array.from({ length: 10 }, (_, n) => n);
/**
 * Llegada a la sección: cuando su borde superior está a esta fracción de pantalla del techo,
 * entra el título; RISE_DELAY ms después, las tarjetas suben (el "rise" de React Bits). La pausa
 * es a propósito: primero se llega a la sección y luego aparece el material. Se llega pronto (la
 * sección aún va por debajo de media pantalla) y con poca pausa: sin hueco de tinta entre el plano
 * del hero y las tarjetas.
 */
const ARRIVE_AT = 0.45;
const RISE_DELAY = 200;
/** Ms sin cambios de tarjeta antes de que el título del pie vuelva a entrar. */
const SWAP_SETTLE_MS = 80;
/** Píxeles que avanza la cinta por cada píxel de scroll mientras el carrete está clavado. */
const SCROLL_FOLLOW = 0.9;

/**
 * Monta el motor WebGL (FlexCarousel) y la vista de proyecto (ProjectView) y los conecta con el
 * núcleo: llegada → título y rise, pin de la página con un proyecto abierto, y el hold de los
 * bloques de debajo. No re-renderiza nunca: todo lo que cambia va por refs.
 */
export function Reel({ anchor, slides, labels, more, gap, aspect, squeeze }: ReelProps) {
  const router = useRouter();
  const pathname = usePathname();
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
  const moreRef = useRef<HTMLAnchorElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ProjectView | null>(null);
  const swapTimer = useRef(0);

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
        place.classList.add(styles.swapping);
        clearTimeout(swapTimer.current);
        // Se suelta tras el último cambio: con la cinta rápida el título espera y entra al asentarse.
        swapTimer.current = window.setTimeout(() => place.classList.remove(styles.swapping), SWAP_SETTLE_MS);
      }
      if (liveRef.current) liveRef.current.textContent = `${slides[i].caption}, ${i + 1} ${labels.of} ${n}`;
    },
    [slides, labels.of, n],
  );

  // Vuelta de todos los proyectos: antes del primer pintado la página ya está donde se dejó y el
  // recuadro tapa la pantalla entera, igual que la página de la que se viene. El efecto de abajo
  // lo encoge y trae la cinta; también quita lo puesto aquí al desmontar.
  useLayoutEffect(() => {
    const back = handoff.pending(pathname);
    if (!back) return;
    scrollController.pin(LEAVE_OWNER, back.scrollY);
    sectionRef.current!.classList.add(styles.leaving, styles.opening);
  }, [pathname]);

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
      // Una vuelta de todos los proyectos sin carrete: solo se destapa.
      if (handoff.pending(pathname)) {
        handoff.done();
        sectionRef.current!.classList.remove(styles.leaving, styles.opening);
        scrollController.unpin(LEAVE_OWNER);
      }
      return;
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
    const back = handoff.pending(pathname);
    // De vuelta ya se llegó una vez: ni título que esperar ni rise (la cinta entra barriendo).
    let arrived = !!back;
    if (back) {
      root.classList.add(styles.arrived);
      releaseHold();
    }
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
    // Mientras el carrete está clavado, el scroll de la página también mueve la cinta (el
    // arrastre sigue funcionando). Se suman los deltas de scrollY solo con la sección clavada; sin
    // movimiento reducido, que no ata el carrete al scroll.
    let lastY = window.scrollY;
    const followScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      const section = sectionRef.current;
      if (reduced || !section) return;
      const r = section.getBoundingClientRect();
      // Clavado = el techo de la sección ya pasó y su pie aún no ha subido de la pantalla.
      if (r.top <= 0 && r.bottom >= window.innerHeight) carousel.nudge(dy * SCROLL_FOLLOW);
    };
    const offIntro = scrollController.subscribe(() => {
      checkArrival();
      followScroll();
    });

    // Cursor: "open" sobre la del centro, "seek" sobre una lateral. El arrastre lo marca el motor
    // con data-dragging (y el CSS pone la mano cerrada).
    let hover = "";
    const onPointerMove = (e: PointerEvent) => {
      const hit = host.hasAttribute("data-dragging") ? null : carousel.hitTest(e.clientX, e.clientY);
      const next = hit ? (hit.index === carousel.activeIndex ? "open" : "seek") : "";
      if (hit && next === "open") {
        // Posición del cursor sobre la tarjeta, de -1 (borde) a 1 (borde opuesto).
        const r = host.getBoundingClientRect();
        const dx = (e.clientX - r.left - (hit.x0 + hit.x1) / 2) / ((hit.x1 - hit.x0) / 2);
        const dy = (e.clientY - r.top - (hit.y0 + hit.y1) / 2) / ((hit.y1 - hit.y0) / 2);
        carousel.setLean(Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy)), true);
      } else carousel.setLean(0, 0, false);
      if (next === hover) return;
      hover = next;
      if (hover) host.setAttribute("data-hover", hover);
      else host.removeAttribute("data-hover");
    };
    const onPointerLeave = () => {
      hover = "";
      carousel.setLean(0, 0, false);
      host.removeAttribute("data-hover");
    };

    // Salida a "todos los proyectos". Es un <a> de verdad: sin JS, o con modificadores (pestaña
    // nueva…), navega como cualquier enlace.
    const section = sectionRef.current!;
    const link = moreRef.current;
    const box = boxRef.current!;
    const cards = Math.max(n, SWEEP_MIN);
    let leaving = false;
    let boxTimer = 0;
    let onBoxDone: (() => void) | null = null;
    /** Espera a que acabe la transición del recuadro (crecer o encoger). */
    const afterBox = (then: () => void) => {
      const done = () => {
        if (onBoxDone !== done) return;
        onBoxDone = null;
        clearTimeout(boxTimer);
        box.removeEventListener("transitionend", done);
        then();
      };
      onBoxDone = done;
      box.addEventListener("transitionend", done);
      boxTimer = window.setTimeout(done, BOX_FALLBACK_MS);
    };
    // El recuadro es la pantalla entera a escala 0,5 (50vw × 50vh), centrado sobre el carrete
    // (que puede no estar justo en el centro de la pantalla si la sección no está clavada) y
    // desplazado `x` px con la cola de la cinta.
    const placeBox = () => {
      const r = root.getBoundingClientRect();
      const vp = document.documentElement;
      box.style.setProperty("--leave-x", `${r.left + r.width / 2 - vp.clientWidth / 2}px`);
      box.style.setProperty("--leave-y", `${r.top + r.height / 2 - vp.clientHeight / 2}px`);
    };
    const moveBox = (x: number) => box.style.setProperty("--sweep-x", `${x}px`);

    const onMore = (e: MouseEvent) => {
      if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (leaving || view.isOpen) return;
      leaving = true;
      const href = link.getAttribute("href")!;
      router.prefetch(href);
      // Lo que la vuelta necesita para deshacer la salida. Se guarda ya: durante el barrido la
      // tarjeta del centro cambia.
      const leave = { path: pathname, scrollY: window.scrollY, index: Math.max(0, carousel.activeIndex) };
      const go = () => {
        handoff.leave(leave);
        router.push(href);
      };
      if (reduced) return go();
      // La página se queda quieta durante toda la salida.
      scrollController.pin(LEAVE_OWNER);
      placeBox();
      // sweep() coloca la cola (fuera, a la derecha) antes de que el recuadro se vea.
      const swept = carousel.sweep({ cards, seconds: SWEEP_S, onFrame: moveBox });
      section.classList.add(styles.leaving);
      void swept.then(() => {
        if (!leaving) return;
        section.classList.add(styles.opening);
        afterBox(go);
      });
    };

    // Vuelta, la salida al revés: el recuadro encoge de pantalla entera a 0,5 sobre el carrete
    // y, en el mismo fotograma en que acaba, la cinta entra por la izquierda y lo empuja fuera
    // por la derecha hasta dejar en el centro la tarjeta que se dejó. El encogido lo pinta el JS
    // (--box-k: 0 = pantalla entera, 1 = escala 0,5) con su propio bucle y dt limitado, como el
    // motor: al volver, el montaje de la home atasca el hilo principal cientos de ms, y una
    // transición CSS o un reloj de pared habrían acabado de encoger antes del primer fotograma
    // pintado (no se vería encoger).
    let shrinkRaf = 0;
    const finishReturn = () => {
      handoff.done();
      section.classList.remove(styles.leaving, styles.closing);
      box.style.removeProperty("--sweep-x");
      box.style.removeProperty("--box-k");
      scrollController.unpin(LEAVE_OWNER);
    };
    if (back) {
      // Lo pone ya el layout effect, pero si este efecto se vuelve a montar (StrictMode, o un
      // render nuevo de la página al volver) su limpieza lo ha quitado: sin `leaving` el recuadro
      // no se ve y solo entraría la cinta.
      scrollController.pin(LEAVE_OWNER, back.scrollY);
      section.classList.add(styles.leaving);
      if (reduced) {
        section.classList.remove(styles.opening);
        void carousel.sweep({ cards, seconds: 0, back: back.index, onFrame: moveBox }).then(finishReturn);
      } else {
        placeBox();
        moveBox(0);
        box.style.setProperty("--box-k", "0");
        // closing no tiene transición: el cambio de clase no mueve nada, parte de pantalla entera.
        section.classList.add(styles.closing);
        section.classList.remove(styles.opening);
        let k = 0;
        let last = -1;
        const shrink = (now: number) => {
          // El primer fotograma pinta la pantalla entera; desde ahí, como mucho MAX_DT por fotograma.
          const dt = last < 0 ? 0 : Math.min(MAX_DT, (now - last) / 1000);
          last = now;
          k = Math.min(1, k + dt / SHRINK_S);
          box.style.setProperty("--box-k", String(easeOut(k)));
          if (k < 1) {
            shrinkRaf = requestAnimationFrame(shrink);
            return;
          }
          shrinkRaf = 0;
          void carousel.sweep({ cards, seconds: BACK_S, back: back.index, onFrame: moveBox }).then(finishReturn);
        };
        shrinkRaf = requestAnimationFrame(shrink);
      }
    }

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
    link?.addEventListener("click", onMore);

    return () => {
      link?.removeEventListener("click", onMore);
      if (onBoxDone) box.removeEventListener("transitionend", onBoxDone);
      onBoxDone = null;
      clearTimeout(boxTimer);
      cancelAnimationFrame(shrinkRaf);
      leaving = false;
      scrollController.unpin(LEAVE_OWNER);
      // Sin restos de la salida ni de la vuelta. (En StrictMode el efecto se monta dos veces: el
      // relevo sigue ahí hasta que la vuelta acaba, y el layout effect vuelve a tapar.)
      section.classList.remove(styles.leaving, styles.opening, styles.closing);
      box.style.removeProperty("--leave-x");
      box.style.removeProperty("--leave-y");
      box.style.removeProperty("--sweep-x");
      box.style.removeProperty("--box-k");
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("keydown", onDocKey);
      window.removeEventListener("resize", onResize);
      close.removeEventListener("click", onClose);
      offIntro();
      clearTimeout(riseTimer);
      clearTimeout(swapTimer.current);
      view.destroy();
      releaseInput?.();
      scrollController.unpin(PIN_OWNER);
      viewRef.current = null;
      carousel.destroy();
      root.classList.remove(styles.revealed, styles.arrived);
    };
  }, [provide, releaseHold, router, pathname, n, slides, gap, aspect, squeeze, setCaption]);

  // Con películas en Vimeo, el anillo de carga del proyecto no debería esperar al handshake ni al
  // SDK: se abre la conexión con el player y su CDN, y el SDK (~8 KB) se baja cuando el hilo
  // está libre. Sin diapositivas de Vimeo no se toca la red.
  useEffect(() => {
    if (!slides.some((s) => s.kind === "video")) return;
    preconnect("https://player.vimeo.com");
    preconnect("https://f.vimeocdn.com");
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => void import("@vimeo/player"));
    return () => cancel(id);
  }, [slides]);

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

      {more && (
        <a ref={moreRef} href={more.href} className={styles.more}>
          {more.label}
        </a>
      )}
      {/* Recuadro naranja de la salida a "todos los proyectos": llega detrás de la última tarjeta. */}
      <div ref={boxRef} className={styles.box} aria-hidden="true" />

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
