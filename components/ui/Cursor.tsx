"use client";

import { useEffect, useRef } from "react";

const HOVER_TARGETS = "button, a, input, textarea, .glass-card";
const EASE = 0.15;

/**
 * Cursor cinematográfico: sigue al puntero con inercia y crece sobre elementos interactivos.
 * Escribe en style directamente (no estado React) porque corre a 60fps.
 *
 * v4 enganchaba mouseenter/mouseleave a los elementos que existían al cargar; aquí se delega
 * en mouseover para que funcione con lo que React monte después. Diferencia menor: al salir
 * de un input dentro de una .glass-card el cursor sigue grande (en v4 encogía).
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = ref.current;
    if (!cursor) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let x = mouseX;
    let y = mouseY;
    let hovering = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onOver = (e: MouseEvent) => {
      const over = e.target instanceof Element && e.target.closest(HOVER_TARGETS) !== null;
      if (over === hovering) return;
      hovering = over;
      const size = over ? "48px" : "32px";
      cursor.style.width = size;
      cursor.style.height = size;
      cursor.style.borderColor = over ? "rgba(238, 214, 127, 0.7)" : "rgba(245, 230, 172, 0.4)";
    };

    const tick = () => {
      x += (mouseX - x) * EASE;
      y += (mouseY - y) * EASE;
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="custom-cursor w-8 h-8 rounded-full border border-gold-300/40 bg-gold-400/5 backdrop-blur-xs flex items-center justify-center text-[9px] font-sans tracking-widest text-gold-200 opacity-0 md:opacity-100 transition-opacity"
    >
      <div className="w-1 h-1 bg-gold-300 rounded-full" />
    </div>
  );
}
