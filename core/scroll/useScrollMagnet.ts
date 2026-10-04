"use client";

import { useEffect, useRef } from "react";
import { scrollController } from "./controller";
import { useScene } from "./ScrollScene";

const SNAP_DELAY = 120;

interface Options {
  /** Número de paradas: la escena se reparte en count-1 tramos iguales. */
  count: () => number;
  /** Guarda extra del bloque (p. ej. proyecto abierto). Los pins ya los mira el controlador. */
  enabled?: () => boolean;
  delay?: number;
}

/**
 * Imán de centrado (docs/sticky.txt de v4): tras cualquier gesto, si el scroll se para
 * `delay` ms, la página se termina de desplazar hasta la parada más cercana.
 *
 * El debounce va sobre el scroll de la página, no por gesto: cubre rueda, táctil, teclado,
 * barra e inercia sin duplicar lógica. La propia animación del imán reinicia el debounce,
 * pero al terminar ya está a <1px del objetivo y no vuelve a animar.
 *
 * Tira de window.scrollY y no del contenido de la escena: la página es el único motor, y
 * mover el contenido directamente lo desincronizaría del siguiente evento de scroll.
 */
export function useScrollMagnet({ count, enabled, delay = SNAP_DELAY }: Options) {
  const scene = useScene();
  const opts = useRef({ count, enabled });
  useEffect(() => {
    opts.current = { count, enabled };
  });

  useEffect(() => {
    let timer = 0;

    const snap = () => {
      // La puerta y el proyecto clavan la página por su cuenta; el imán no se pelea con ellos.
      if (scrollController.isPinned()) return;
      const { count, enabled } = opts.current;
      if (enabled && !enabled()) return;

      const n = count();
      const span = scene.span();
      if (n < 2 || span <= 0) return;

      // Solo dentro del recorrido: fuera, centrar una parada teletransportaría al usuario
      // de vuelta a la escena (p. ej. justo después de romper la puerta).
      const y = window.scrollY;
      if (y <= scene.top() || y >= scene.endY()) return;

      const idx = Math.min(n - 1, Math.max(0, Math.round(scene.progress() * (n - 1))));
      const target = scene.yAt(idx / (n - 1));
      if (Math.abs(target - y) < 1) return;
      scrollController.scrollTo(target, "motion");
    };

    const off = scrollController.subscribe(() => {
      clearTimeout(timer);
      timer = window.setTimeout(snap, delay);
    });
    // Un pin nuevo (puerta, proyecto) cancela cualquier imán pendiente.
    const offPins = scrollController.subscribePins(() => {
      if (scrollController.isPinned()) clearTimeout(timer);
    });
    return () => {
      off();
      offPins();
      clearTimeout(timer);
    };
  }, [scene, delay]);
}
