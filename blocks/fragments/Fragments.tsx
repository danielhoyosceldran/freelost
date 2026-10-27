"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { scrollController } from "@/core/scroll/controller";
import type { FragmentsProps } from "./index";
import styles from "./fragments.module.css";

/** Recorrido del parallax: fracción del alto del marco que la foto se desplaza de punta a punta. */
const PARALLAX = 0.08;
const PIN_OWNER = "fragments:lightbox";

export function Fragments({ anchor, title, intro, photos, labels }: FragmentsProps) {
  const rootRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // La foto abierta. Estado de React a propósito: cambia con un clic, no con cada píxel de scroll.
  const [open, setOpen] = useState<number | null>(null);
  // A qué foto volver el foco al cerrar.
  const returnRef = useRef<HTMLButtonElement | null>(null);

  // Revelado (una vez, al asomar) y parallax (solo de las que están en pantalla).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const frames = [...root.querySelectorAll<HTMLElement>("[data-frame]")];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const visible = new Set<HTMLElement>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) {
            visible.add(el);
            el.setAttribute("data-in", "");
          } else visible.delete(el);
        }
        update();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    // Cada foto se desplaza según dónde está su marco respecto al centro de la pantalla: arriba del
    // todo va adelantada, abajo retrasada. Directo al estilo, sin re-render.
    const update = () => {
      if (reduce) return;
      const vh = window.innerHeight;
      for (const el of visible) {
        const r = el.getBoundingClientRect();
        const t = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
        el.style.setProperty("--py", (t * PARALLAX * 50).toFixed(2) + "%");
      }
    };

    frames.forEach((f) => io.observe(f));
    const off = scrollController.subscribe(update);
    return () => {
      io.disconnect();
      off();
    };
  }, []);

  const show = useCallback((i: number, from: HTMLButtonElement) => {
    returnRef.current = from;
    setOpen(i);
  }, []);

  const close = useCallback(() => dialogRef.current?.close(), []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  // Abrir y cerrar el <dialog> modal (foco atrapado, Esc y capa superior los da el navegador). La
  // página queda clavada mientras tanto: el muelle de la rueda del controlador seguiría moviéndola
  // por debajo aunque el body no tenga scroll.
  const isOpen = open !== null;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    dialog.showModal();
    scrollController.pin(PIN_OWNER);
    const releaseInput = scrollController.captureInput(() => {});
    const onClose = () => {
      setOpen(null);
      returnRef.current?.focus({ preventScroll: true });
    };
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("close", onClose);
      releaseInput();
      scrollController.unpin(PIN_OWNER);
    };
  }, [isOpen]);

  // Flechas para pasar de foto. Las teclas no salen del diálogo: el controlador escucha en window
  // y se comería el espacio sobre los botones.
  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    e.stopPropagation();
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
  };

  const current = open === null ? null : photos[open];

  return (
    <section ref={rootRef} id={anchor} className={styles.fragments}>
      <header className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {intro && <p className={styles.intro}>{intro}</p>}
      </header>

      <ul className={styles.sheet}>
        {photos.map((p, i) => (
          <li key={p.src} className={styles.item}>
            <figure>
              <button
                type="button"
                className={styles.frame}
                style={{ aspectRatio: p.ratio } as CSSProperties}
                onClick={(e) => show(i, e.currentTarget)}
                aria-label={`${labels.open}: ${p.alt}`}
                data-frame
              >
                <span className={styles.shift}>
                  {/* El export estático no optimiza imágenes: el ancho lo pide lib/media.ts. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.img} src={p.src} alt="" loading="lazy" decoding="async" />
                </span>
              </button>
              <figcaption className={styles.caption}>{p.caption}</figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className={styles.lightbox}
        aria-label={current?.alt}
        onKeyDown={onKeyDown}
        // Clic en el fondo (fuera de la foto y de los controles) cierra.
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).hasAttribute("data-backdrop")) close();
        }}
      >
        {current && open !== null && (
          <>
            <div className={styles.stage} data-backdrop>
              {/* key: cada foto entra con su propia animación al pasar con las flechas. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={current.src} className={styles.full} src={current.src} alt={current.alt} />
            </div>
            <div className={styles.bar}>
              <p className={styles.count}>
                <span>{current.caption}</span>
                <span className={styles.of}>
                  {open + 1} {labels.of} {photos.length}
                </span>
              </p>
              <div className={styles.controls}>
                <button type="button" className={styles.control} onClick={() => step(-1)} aria-label={labels.prev}>
                  <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" />
                </button>
                <button type="button" className={styles.control} onClick={() => step(1)} aria-label={labels.next}>
                  <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
                </button>
                <button type="button" className={styles.control} onClick={close} aria-label={labels.close} autoFocus>
                  <X size={18} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
