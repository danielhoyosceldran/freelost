"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { handoff } from "@/core/transition/handoff";
import type { ProjectsProps } from "./index";
import styles from "./projects.module.css";

/**
 * Página naranja: es el recuadro de la salida del carrete ya a pantalla completa. La cruz vuelve
 * atrás; si se llegó desde el carrete, la home encuentra el relevo y deshace la animación.
 */
export function Projects({ back }: ProjectsProps) {
  const router = useRouter();
  const backRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Atrás (y no push) si se vino del carrete: la entrada del historial es esa, y así el botón
    // atrás del navegador y la cruz hacen lo mismo. Entrando directo no hay relevo: a la home.
    const leave = () => (handoff.pending(back.href) ? router.back() : router.push(back.href));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leave();
    };
    const link = backRef.current;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      leave();
    };
    link?.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      link?.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [router, back.href]);

  return (
    <section className={styles.root}>
      <a ref={backRef} href={back.href} className={styles.close} aria-label={back.label} />
    </section>
  );
}
