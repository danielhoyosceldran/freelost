"use client";

import { useEffect, useRef } from "react";
import { scrollController } from "@/core/scroll/controller";
import { useReady } from "@/core/lifecycle/store";
import styles from "./page-progress.module.css";

/** Fotogramas por segundo del timecode, y píxeles de scroll que dura cada fotograma. */
const FPS = 24;
const PX_PER_FRAME = 12;

const two = (n: number) => String(n).padStart(2, "0");

function timecode(scrollY: number) {
  const f = Math.floor(Math.max(0, scrollY) / PX_PER_FRAME);
  const s = Math.floor(f / FPS);
  return `${two(Math.floor(s / 3600))}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}:${two(f % FPS)}`;
}

/**
 * Posición en la película que es la página: un hilo de 1px ember con el progreso total (ember =
 * progreso) y un timecode que cuenta fotogramas con el scroll. Bajar rápido hace volar los
 * fotogramas: es la señal más legible del tempo. Los dos se escriben directo desde el
 * controlador, sin re-render, y se apartan con un proyecto abierto (la página queda clavada).
 */
export function PageProgress() {
  const ready = useReady();
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLSpanElement>(null);

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
    });
    const offPins = scrollController.subscribePins(() => {
      if (scrollController.isPinned()) root.setAttribute("data-away", "");
      else root.removeAttribute("data-away");
    });
    return () => {
      off();
      offPins();
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.root} data-ready={ready || undefined} aria-hidden="true">
      <div ref={barRef} className={styles.bar} />
      <span ref={codeRef} className={styles.code}>
        {timecode(0)}
      </span>
    </div>
  );
}
