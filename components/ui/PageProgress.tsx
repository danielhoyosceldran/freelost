"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { docTop, scrollController } from "@/core/scroll/controller";
import { useReady } from "@/core/lifecycle/store";
import type { Chapter } from "@/content/chapters";
import styles from "./page-progress.module.css";

/** Fotogramas por segundo del timecode, y píxeles de scroll que dura cada fotograma. */
const FPS = 24;
const PX_PER_FRAME = 12;

/** Un capítulo pasa a ser el actual cuando su borde superior cruza esta fracción de la pantalla. */
const CHAPTER_LINE = 0.4;

const two = (n: number) => String(n).padStart(2, "0");

function timecode(scrollY: number) {
  const f = Math.floor(Math.max(0, scrollY) / PX_PER_FRAME);
  const s = Math.floor(f / FPS);
  return `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}:${two(f % FPS)}`;
}

interface Props {
  /** Capítulos de la página, en orden (content/chapters.ts). Los que no tienen ancla aquí no salen. */
  chapters?: Chapter[];
  labels: { index: string; current: string };
}

/** Un capítulo resuelto en esta página: su elemento (o null = arriba del todo) y su Y. */
type Placed = Chapter & { el: Element | null; y: number };

/**
 * Posición en la película que es la página: un hilo de 1px ember con el progreso total (ember =
 * progreso), un timecode que cuenta fotogramas con el scroll y, a su lado, el capítulo en el que
 * estás. Las marcas sobre el hilo son el inicio de cada capítulo; el nombre abre el índice para
 * saltar a cualquiera. Hilo y timecode se escriben directo desde el controlador; el capítulo es
 * estado de React porque solo cambia al cruzar una frontera. Todo se aparta con la página clavada
 * (un proyecto abierto, la vista en grande de una foto).
 */
export function PageProgress({ chapters = [], labels }: Props) {
  const ready = useReady();
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const listId = useId();

  const [placed, setPlaced] = useState<Placed[]>([]);
  const [ticks, setTicks] = useState<number[]>([]);
  const [active, setActive] = useState(0);
  // Sentido del último cambio de capítulo: el nombre nuevo entra desde abajo al bajar y desde
  // arriba al subir, como un rótulo que pasa.
  const [dir, setDir] = useState<1 | -1>(1);
  const [open, setOpen] = useState(false);
  const placedRef = useRef<Placed[]>([]);
  const activeRef = useRef(0);

  // Dónde empieza cada capítulo. Se mide tras pintar y cada vez que cambia el alto de la página
  // (fuentes, imágenes, escenas que crecen); los bloques no avisan, se observa el documento.
  useEffect(() => {
    if (!chapters.length) return;
    const measure = () => {
      const found = chapters
        .map((c): Placed | null => {
          const el = c.anchor ? document.getElementById(c.anchor) : null;
          if (c.anchor && !el) return null;
          return { ...c, el, y: el ? docTop(el) : 0 };
        })
        .filter((c): c is Placed => c !== null);
      // Con menos de dos no hay nada que indicar (la vista de proyectos, por ejemplo).
      const list = found.length >= 2 ? found : [];
      placedRef.current = list;
      setPlaced(list);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setTicks(max > 0 ? list.slice(1).map((c) => Math.min(1, c.y / max)) : []);
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [chapters]);

  useEffect(() => {
    const root = rootRef.current;
    const bar = barRef.current;
    const code = codeRef.current;
    if (!root || !bar || !code) return;
    let last = "";
    const off = scrollController.subscribe(() => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, y / max)).toFixed(4) : 0})`;
      const tc = timecode(y);
      if (tc !== last) {
        last = tc;
        code.textContent = tc;
      }
      // Capítulo actual: el último cuyo inicio ya pasó por la línea. Al final de la página manda el
      // último aunque no llegue a la línea (el contacto es más bajo que la pantalla).
      const list = placedRef.current;
      if (!list.length) return;
      const line = y + window.innerHeight * CHAPTER_LINE;
      let i = 0;
      list.forEach((c, k) => {
        if (c.y <= line) i = k;
      });
      if (max > 0 && y >= max - 2) i = list.length - 1;
      if (i !== activeRef.current) {
        setDir(i > activeRef.current ? 1 : -1);
        activeRef.current = i;
        setActive(i);
      }
    });
    const offPins = scrollController.subscribePins(() => {
      if (scrollController.isPinned()) {
        root.setAttribute("data-away", "");
        setOpen(false);
      } else root.removeAttribute("data-away");
    });
    return () => {
      off();
      offPins();
    };
  }, []);

  // El índice se cierra con Esc (el foco vuelve al botón) o con un clic fuera.
  useEffect(() => {
    if (!open) return;
    const nav = navRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      nav?.querySelector<HTMLButtonElement>("button")?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (nav && !nav.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const go = (c: Placed) => {
    setOpen(false);
    if (c.el) scrollController.scrollToElement(c.el);
    else scrollController.scrollTo(0);
  };

  const current = placed[active];

  return (
    <div ref={rootRef} className={styles.root} data-ready={ready || undefined}>
      <div className={styles.track} aria-hidden="true">
        <div ref={barRef} className={styles.bar} />
        {ticks.map((t, i) => (
          <span
            key={i}
            className={styles.tick}
            style={{ left: `${t * 100}%` }}
            data-passed={i < active || undefined}
          />
        ))}
      </div>

      <div className={styles.slate} data-first={active === 0 || undefined}>
        <span ref={codeRef} className={styles.code} aria-hidden="true">
          {timecode(0)}
        </span>

        {current && (
          <nav ref={navRef} className={styles.nav} aria-label={labels.index}>
            <button
              type="button"
              className={styles.current}
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => setOpen((o) => !o)}
            >
              <span className={styles.sr}>{labels.current}: </span>
              <span className={styles.window}>
                {/* key: cada capítulo nuevo entra con su propia animación. */}
                <span key={current.label} className={styles.name} data-dir={dir}>
                  {current.label}
                </span>
              </span>
              <ChevronDown className={styles.chevron} size={13} strokeWidth={1.5} aria-hidden="true" />
            </button>

            <ol id={listId} className={styles.list} hidden={!open}>
              {placed.map((c, i) => (
                <li key={c.label}>
                  <button
                    type="button"
                    className={styles.item}
                    aria-current={i === active ? "location" : undefined}
                    onClick={() => go(c)}
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
    </div>
  );
}
