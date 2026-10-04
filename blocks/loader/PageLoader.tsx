"use client";

import { useEffect, useRef, useState } from "react";
import { assetRegistry } from "@/core/assets/registry";
import { useLifecycle } from "@/core/lifecycle/store";
import { scrollController } from "@/core/scroll/controller";
import type { LoaderProps } from "./index";

const EASE = 8; // 1/s — suavizado de lo mostrado hacia lo real

// Timecode a 25 fps del tiempo de carga, en el idioma de la web (HH:MM:SS:FF).
const pad2 = (n: number) => String(n).padStart(2, "0");
const timecode = (ms: number) => {
  const f = Math.floor(ms / 40);
  return `${pad2(Math.floor(f / 90000))}:${pad2(Math.floor(f / 1500) % 60)}:${pad2(Math.floor(f / 25) % 60)}:${pad2(f % 25)}`;
};

/**
 * Círculo negro (box-start.svg) que se llena de amarillo (box-end.svg) con el progreso REAL:
 * lo que aportan los bloques críticos (assetRegistry) y las fuentes. Nada de lo diferido
 * (three.js, .glb, vídeos) cuenta. Se renderiza en el HTML estático, así que tapa la página
 * desde el primer frame, antes de hidratar.
 */
export function PageLoader({ minMs, maxMs, fonts, color }: LoaderProps) {
  const [gone, setGone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<SVGRectElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    if (!root || !fill) return;

    const { markReady } = useLifecycle.getState();

    let fontsDone = !fonts || !document.fonts;
    if (!fontsDone) document.fonts.ready.then(() => (fontsDone = true), () => (fontsDone = true));

    const t0 = performance.now();
    let lastTs = t0;
    let shown = 0;
    let raf = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      // Arriba del todo antes de destapar: la primera escena empieza en su 0%.
      scrollController.scrollTo(0, "instant");
      root.classList.add("is-done");
      root.addEventListener("transitionend", () => setGone(true), { once: true });
      markReady();
    };

    const frame = (ts: number) => {
      const elapsed = ts - t0;
      const dt = Math.min(0.1, (ts - lastTs) / 1000);
      lastTs = ts;

      const assets = assetRegistry.progress();
      const total = Math.max(1, assets.total + (fonts ? 1 : 0));
      const done = assets.done + (fonts && fontsDone ? 1 : 0);

      // Lo real, pero sin poder ir más rápido que minMs: así el relleno siempre se ve subir
      // aunque todo venga de caché. Pasado maxMs se da por cargado.
      const real = elapsed >= maxMs ? 1 : done / total;
      const target = Math.min(real, elapsed / minMs);
      shown += (target - shown) * (1 - Math.exp(-EASE * dt));
      if (target >= 1 && 1 - shown < 0.004) shown = 1;

      const pct = Math.round(shown * 100);
      fill.setAttribute("y", (100 * (1 - shown)).toFixed(2));
      if (pctRef.current) pctRef.current.textContent = `${String(pct).padStart(3, "0")}%`;
      if (tcRef.current) tcRef.current.textContent = timecode(elapsed);
      root.setAttribute("aria-valuenow", String(pct));

      if (shown >= 1) return finish();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [minMs, maxMs, fonts]);

  if (gone) return null;

  return (
    <div
      ref={rootRef}
      id="page-loader"
      role="progressbar"
      aria-label="Cargando"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <clipPath id="pl-clip">
            <rect width="100" height="100" rx="50" fill="white" />
          </clipPath>
        </defs>
        <g clipPath="url(#pl-clip)">
          <rect width="100" height="100" rx="50" fill="black" />
          <rect ref={fillRef} y="100" width="100" height="100" fill={color} />
        </g>
      </svg>
      <div className="pl-readout">
        <span ref={tcRef}>00:00:00:00</span>
        <span ref={pctRef} className="pl-pct" style={{ color }}>
          000%
        </span>
      </div>
    </div>
  );
}
