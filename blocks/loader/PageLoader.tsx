"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { assetRegistry } from "@/core/assets/registry";
import { useLifecycle } from "@/core/lifecycle/store";
import { scrollController } from "@/core/scroll/controller";
import { handoff } from "@/core/transition/handoff";
import { LOGO_F, LOGO_L, LOGO_VIEWBOX } from "@/lib/brand/logo";
import type { LoaderProps } from "./index";

// Los dos trazos miden lo mismo en vertical (la F de 80 a 1227, la L de 370 a 1517, en unidades
// del viewBox): el relleno de la F baja desde su punta y el de la L sube desde la suya, y
// llegan a la vez.
const F_TOP = 80;
const L_BOTTOM = 1517;
const SPAN = 1147;

/**
 * La marca se monta delante de la película.
 * 1. Entrada (CSS, arranca con el primer pintado, antes de hidratar): la F cae desde arriba y
 *    la L sube desde abajo, deslizando por la costura que las separa, y encajan.
 * 2. Relleno (JS): los trazos se llenan del color de acento con el progreso REAL, lo que aportan
 *    los bloques críticos (el vídeo del hero) y las fuentes. No empieza hasta que han encajado.
 * 3. Apertura (CSS): el velo se parte por la costura y cada mitad sale en la dirección de su
 *    trazo, la izquierda hacia arriba y la derecha hacia abajo. La marca del hero, idéntica y en
 *    el mismo sitio, queda debajo; esta se desvanece encima y el acento pasa a blanco.
 */
export function PageLoader({ minMs, maxMs, fonts, color, label }: LoaderProps) {
  // Al volver de una página con una transición que se deshace (todos los proyectos), la página
  // entra tapada por esa transición y no hay nada que cargar a la vista: sin loader.
  const pathname = usePathname();
  const [covered] = useState(() => !!handoff.pending(pathname));
  const [gone, setGone] = useState(covered);
  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const fRef = useRef<SVGRectElement>(null);
  const lRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    if (covered) {
      useLifecycle.getState().markReady();
      return;
    }
    const root = rootRef.current;
    const mark = markRef.current;
    const fClip = fRef.current;
    const lClip = lRef.current;
    if (!root || !mark || !fClip || !lClip) return;

    const { markReady } = useLifecycle.getState();
    let alive = true;

    let fontsDone = !fonts || !document.fonts;
    if (!fontsDone) document.fonts.ready.then(() => (fontsDone = true), () => (fontsDone = true));

    // La entrada es una animación CSS que puede haber acabado antes de hidratar; si es así (o
    // con movimiento reducido, sin animación) la lista llega vacía y el relleno arranca ya.
    let fillFrom = -1;
    const entries = Array.from(mark.querySelectorAll(".pl-blade")).flatMap((b) => b.getAnimations());
    const startFill = () => {
      if (alive) fillFrom = performance.now();
    };
    Promise.all(entries.map((a) => a.finished)).then(startFill, startFill);

    const t0 = performance.now();
    let lastTs = t0;
    let shown = 0;
    let raf = 0;
    let finished = false;
    let fallback = 0;

    const onMarkFaded = (e: TransitionEvent) => {
      if (e.target === mark && e.propertyName === "opacity") setGone(true);
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      scrollController.scrollTo(0, "instant");
      root.classList.add("is-done");
      markReady();
      mark.addEventListener("transitionend", onMarkFaded);
      // Por si transitionend no llega (pestaña en segundo plano): nunca dejar el velo montado.
      fallback = window.setTimeout(() => setGone(true), 3500);
    };

    const frame = (ts: number) => {
      const elapsed = ts - t0;
      const dt = Math.min(0.1, (ts - lastTs) / 1000);
      lastTs = ts;

      const assets = assetRegistry.progress();
      const total = Math.max(1, assets.total + (fonts ? 1 : 0));
      const done = assets.done + (fonts && fontsDone ? 1 : 0);

      // Lo real, pero sin pasar de una velocidad fija desde que encajan: con caché llena el
      // relleno se ve subir en minMs. Va a velocidad constante y llega al 1 sin frenar, para que
      // la apertura lo continúe en vez de esperar a una cola. Pasado maxMs se da por cargado.
      const target = elapsed >= maxMs ? 1 : done / total;
      if (fillFrom >= 0) shown = Math.min(target, shown + (1000 / minMs) * dt);

      const h = (shown * SPAN).toFixed(1);
      fClip.setAttribute("height", h);
      lClip.setAttribute("y", (L_BOTTOM - shown * SPAN).toFixed(1));
      lClip.setAttribute("height", h);
      root.setAttribute("aria-valuenow", String(Math.round(shown * 100)));

      if (shown >= 1) return finish();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      mark.removeEventListener("transitionend", onMarkFaded);
    };
  }, [minMs, maxMs, fonts, covered]);

  if (gone) return null;

  return (
    <div
      ref={rootRef}
      id="page-loader"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <div className="pl-veil pl-veil-l" />
      <div className="pl-veil pl-veil-r" />
      <div ref={markRef} className="pl-mark brand-mark" aria-hidden="true">
        <div className="pl-blade pl-blade-f">
          <svg viewBox={LOGO_VIEWBOX}>
            <clipPath id="pl-fill-f">
              <rect ref={fRef} x="566" y={F_TOP} width="422" height="0" />
            </clipPath>
            <path className="pl-outline" d={LOGO_F} />
            <path d={LOGO_F} style={{ fill: color }} clipPath="url(#pl-fill-f)" />
          </svg>
        </div>
        <div className="pl-blade pl-blade-l">
          <svg viewBox={LOGO_VIEWBOX}>
            <clipPath id="pl-fill-l">
              <rect ref={lRef} x="566" y={L_BOTTOM} width="422" height="0" />
            </clipPath>
            <path className="pl-outline" d={LOGO_L} />
            <path d={LOGO_L} style={{ fill: color }} clipPath="url(#pl-fill-l)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
