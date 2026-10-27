"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type CSSProperties } from "react";
import { Media } from "@/components/media/Media";
import { trail } from "@/core/transition/trail";
import type { ProjectProps } from "./index";
import styles from "./project.module.css";

/**
 * Vista de un proyecto: el cartón de título del sistema llevado a una página. Primer viewport,
 * la portada a sangre con el título abajo a la izquierda y la vuelta arriba; después la ficha,
 * la película y la secuencia de fotos y clips, que se revela al entrar en pantalla.
 */
export function Project({
  back,
  counter,
  title,
  meta,
  description,
  pending,
  cover,
  film,
  media,
  credits,
  next,
  mediaLabels,
}: ProjectProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLAnchorElement>(null);

  // Volver: atrás si se vino del índice (core/transition/trail.ts), al índice si se entró directo.
  useEffect(() => {
    const leave = () => (trail.cameFrom(back.href) ? router.back() : router.push(back.href));
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

  // Revelado de la película y la secuencia. Solo se arman los que aún están por debajo de la
  // pantalla: lo que ya se ve no parpadea, y sin JS (o antes de hidratar) todo está a la vista.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = [...root.querySelectorAll<HTMLElement>("[data-develop]")].filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight,
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    for (const el of els) {
      el.setAttribute("data-armed", "");
      io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  const words = title.split(/\s+/);

  return (
    <article ref={rootRef} className={styles.root}>
      <header className={styles.opening}>
        <Media item={cover} labels={mediaLabels} fill eager className={styles.cover} />
        <div className={styles.scrim} aria-hidden="true" />

        <nav className={styles.bar}>
          <a ref={backRef} href={back.href} className={styles.back}>
            <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
            {back.label}
          </a>
          <span className={styles.counter}>{counter}</span>
        </nav>

        <h1 className={styles.title}>
          {words.map((w, i) => (
            <span key={i} className={styles.mask}>
              <span className={styles.word} style={{ "--i": i } as CSSProperties}>
                {w}
              </span>{" "}
            </span>
          ))}
        </h1>
      </header>

      <section className={styles.info}>
        {description ? (
          <p className={styles.lead}>{description}</p>
        ) : (
          <p className={`${styles.lead} ${styles.pending}`}>{pending}</p>
        )}

        {meta.length > 0 && (
          <dl className={styles.meta}>
            {meta.map((m) => (
              <div key={m.label} className={styles.fact}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <div className={styles.film} data-develop>
        <Media item={film} labels={mediaLabels} />
      </div>

      <ul className={styles.sequence}>
        {media.map((m, i) => (
          <li key={i} className={styles.shot} data-size={m.size} data-develop>
            <Media item={m} labels={mediaLabels} />
            {m.caption && <p className={styles.caption}>{m.caption}</p>}
          </li>
        ))}
      </ul>

      {credits && (
        <section className={styles.credits}>
          <h2 className={styles.creditsTitle}>{credits.title}</h2>
          <dl className={styles.creditList}>
            {credits.items.map((c, i) => (
              <div key={i} className={styles.fact}>
                <dt>{c.role}</dt>
                <dd>{c.name}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* replace: pasar de proyecto en proyecto no apila historial, así «volver» y atrás siguen
          llevando al índice. */}
      <Link href={next.href} replace className={styles.next}>
        <span className={styles.nextLabel}>{next.label}</span>
        <span className={styles.nextTitle}>
          {next.title}
          <ArrowRight className={styles.nextArrow} strokeWidth={1.5} aria-hidden="true" />
        </span>
      </Link>
    </article>
  );
}
