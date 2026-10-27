"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type CSSProperties } from "react";
import { Media } from "@/components/media/Media";
import { handoff } from "@/core/transition/handoff";
import { trail } from "@/core/transition/trail";
import type { ProjectsProps } from "./index";
import styles from "./projects.module.css";

/** Separación (px) entre el puntero y la vista previa, y suavizado de su persecución (0–1). */
const PREVIEW_GAP = 28;
const PREVIEW_EASE = 0.2;

/**
 * Página naranja: es el recuadro de la salida del carrete ya a pantalla completa, y encima el
 * índice del archivo, una línea por proyecto. Con puntero fino, la portada del que se señala sigue
 * al puntero. La cruz vuelve atrás; si se llegó desde el carrete, la home encuentra el relevo y
 * deshace la animación.
 */
export function Projects({ back, title, count, head, rows, mediaLabels }: ProjectsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const backRef = useRef<HTMLAnchorElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

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

  // Vista previa: solo con puntero fino. Posición por estilo directo en un rAF que solo corre
  // mientras persigue al puntero; qué portada se ve, por atributo (sin re-render).
  useEffect(() => {
    const list = listRef.current;
    const preview = previewRef.current;
    if (!list || !preview || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const snap = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pos = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let active = "";

    const place = () => {
      // A la derecha del puntero; si no cabe, a la izquierda. Centrada en vertical y dentro de
      // la pantalla.
      const w = preview.offsetWidth;
      const h = preview.offsetHeight;
      const left = pos.x + PREVIEW_GAP + w > window.innerWidth ? pos.x - PREVIEW_GAP - w : pos.x + PREVIEW_GAP;
      const top = Math.min(Math.max(pos.y - h / 2, 12), window.innerHeight - h - 12);
      preview.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    };
    const tick = () => {
      pos.x += (pos.tx - pos.x) * PREVIEW_EASE;
      pos.y += (pos.ty - pos.y) * PREVIEW_EASE;
      place();
      raf = Math.abs(pos.tx - pos.x) + Math.abs(pos.ty - pos.y) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const covers = [...preview.querySelectorAll<HTMLElement>("[data-cover]")];
    const show = (i: string) => {
      if (i === active) return;
      active = i;
      // Al salir de la lista se queda la última portada mientras el marco se cierra.
      if (i) covers.forEach((c) => c.toggleAttribute("data-on", c.dataset.cover === i));
      preview.toggleAttribute("data-shown", !!i);
    };

    const onMove = (e: PointerEvent) => {
      pos.tx = e.clientX;
      pos.ty = e.clientY;
      // Al aparecer, sin persecución: nace donde está el puntero.
      if (!active || snap) {
        pos.x = pos.tx;
        pos.y = pos.ty;
        place();
      } else if (!raf) raf = requestAnimationFrame(tick);
      const row = (e.target as Element).closest<HTMLElement>("[data-row]");
      show(row?.dataset.row ?? "");
    };
    const onLeave = () => show("");

    list.addEventListener("pointermove", onMove);
    list.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      list.removeEventListener("pointermove", onMove);
      list.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section className={styles.root}>
      <a ref={backRef} href={back.href} className={styles.close} aria-label={back.label} />

      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.mask}>
            <span className={styles.line}>{title}</span>
          </span>
        </h1>
        <p className={styles.count}>{count}</p>
      </header>

      <div className={styles.table} style={{ "--cols": head.length - 1 } as CSSProperties}>
        <div className={styles.head} aria-hidden="true">
          {head.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>

        <ol ref={listRef} className={styles.list}>
          {rows.map((row, i) => (
            <li key={row.href} className={styles.item} style={{ "--i": i } as CSSProperties}>
              <Link href={row.href} className={styles.row} data-row={i} onClick={() => trail.leave(pathname)}>
                <span className={styles.name}>
                  <span className={styles.mask}>
                    <span className={styles.line}>{row.title}</span>
                  </span>
                </span>
                <span className={styles.cells}>
                  {row.cells.map((c, j) => (
                    <span key={j} className={styles.cell}>
                      {c}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {/* Una portada por fila, apiladas; se ve la de data-on. Decorativa: el enlace ya dice
          a dónde va. */}
      <div ref={previewRef} className={styles.preview} aria-hidden="true">
        {rows.map((row, i) => (
          <div key={row.href} className={styles.cover} data-cover={i}>
            <Media item={row.cover} labels={mediaLabels} fill />
          </div>
        ))}
      </div>
    </section>
  );
}
