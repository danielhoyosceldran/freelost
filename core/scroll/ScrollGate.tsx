"use client";

import { useEffect, useId, useRef } from "react";
import { scrollController } from "./controller";
import { useScene } from "./ScrollScene";

export interface GateOptions {
  /** px de delta acumulados para romper la puerta. */
  target: number;
  /** px/s que se pierden al dejar de insistir: hay que empujar seguido, no rascar. */
  decay: number;
  label: string;
  /** id del elemento al que baja la página al romperla. */
  breakTo?: string;
}

/**
 * Puerta de esfuerzo al final de una escena. Al llegar al 100% la página se clava (pin, no
 * overflow:hidden) y rueda/táctil/teclado se acumulan como esfuerzo; pasado `target`, la
 * puerta se rompe para toda la sesión, suelta el hold de la escena y baja a `breakTo`.
 * Empujar hacia arriba la suelta y devuelve un poco hacia atrás.
 */
export function ScrollGate({ target, decay, label, breakTo }: GateOptions) {
  const scene = useScene();
  const owner = `gate:${useId()}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    if (!root || !fill) return;

    let unlocked = false; // una vez rota, no vuelve a bloquear en toda la sesión
    let locked = false;
    let effort = 0;
    let prevY = window.scrollY;
    let raf = 0;
    let lastTs = 0;
    let releaseInput: (() => void) | null = null;

    const setFill = () => {
      fill.style.width = `${Math.min(100, (effort / target) * 100).toFixed(1)}%`;
    };
    // Solo se ve si el pin que manda es el suyo: con un proyecto abierto encima, no pinta nada.
    const syncVisibility = () => {
      root.style.opacity = locked && scrollController.topPin() === owner ? "1" : "0";
    };

    // El esfuerzo se evapora si se deja de empujar.
    const tick = (ts: number) => {
      const dt = Math.min(0.1, (ts - lastTs) / 1000);
      lastTs = ts;
      if (effort > 0) {
        effort = Math.max(0, effort - decay * dt);
        setFill();
      }
      raf = requestAnimationFrame(tick);
    };

    const latch = () => {
      if (unlocked) return;
      unlocked = true;
      scene.warm();
    };

    const release = () => {
      if (!locked) return;
      locked = false;
      effort = 0;
      cancelAnimationFrame(raf);
      releaseInput?.();
      releaseInput = null;
      scrollController.unpin(owner);
      fill.style.width = "0%";
      syncVisibility();
    };

    const breakThrough = () => {
      latch();
      release();
      const next = breakTo ? document.getElementById(breakTo) : null;
      if (next) scrollController.scrollToElement(next, "smooth");
    };

    const addEffort = (delta: number) => {
      if (!locked) return;
      if (delta < 0) {
        // Empujar hacia arriba = volver a mirar la escena.
        release();
        scrollController.scrollTo(scene.endY() - window.innerHeight * 0.4, "smooth");
        return;
      }
      effort += delta;
      setFill();
      if (effort >= target) breakThrough();
    };

    const engage = () => {
      if (locked || unlocked) return;
      locked = true;
      effort = 0;
      scrollController.pin(owner, scene.endY());
      releaseInput = scrollController.captureInput(addEffort);
      lastTs = performance.now();
      raf = requestAnimationFrame(tick);
      syncVisibility();
    };

    const onScroll = () => {
      const y = window.scrollY;
      const ly = scene.endY();
      // Aterrizar ya pasado (enlace directo, buscar en la página) no debe dejar sin arrancar
      // lo de debajo.
      if (!unlocked && y > ly + window.innerHeight) latch();
      // Solo se engancha viniendo de arriba y sin haberse pasado de largo: un salto de ancla
      // no debe teletransportar hacia atrás.
      if (!unlocked && !locked && y >= ly && prevY <= ly + 4 && y <= ly + window.innerHeight) engage();
      prevY = y;
    };

    const offScroll = scene.subscribe(onScroll);
    const offSeek = scene.onBeforeSeek(release);
    const offPins = scrollController.subscribePins(syncVisibility);
    return () => {
      offScroll();
      offSeek();
      offPins();
      release();
    };
  }, [scene, owner, target, decay, breakTo]);

  return (
    <div
      ref={rootRef}
      className="absolute left-1/2 -translate-x-1/2 bottom-16 z-40 w-64 opacity-0 transition-opacity duration-500 pointer-events-none"
    >
      <div className="h-px w-full bg-white/10 relative overflow-hidden">
        <div ref={fillRef} className="absolute inset-y-0 left-0 w-0 bg-gold-300" />
      </div>
      <p className="mt-5 text-center font-sans text-[10px] uppercase tracking-[0.3em] text-gray-400">{label}</p>
    </div>
  );
}
