"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { scrollController } from "@/core/scroll/controller";
import { clamp01 } from "@/lib/easing";
import type { StoryProps } from "./index";
import styles from "./story.module.css";

/**
 * La pregunta se enciende entre que el bloque asoma (su borde superior a LIT_FROM del alto) y
 * LIT_SPAN pantallas después. Ligado al scroll: se apaga al volver. Es el momento propio del
 * bloque; los apartados solo entran (hilo que crece y texto), sin competir con ella.
 */
const LIT_FROM = 0.75;
const LIT_SPAN = 1.1;

export function Story({ anchor, title, question, parts }: StoryProps) {
  const rootRef = useRef<HTMLElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const words = question.split(/\s+/);

  // Progreso de la pregunta (--r, 0→1). Cada palabra lo lee con su índice (--i) en CSS.
  useEffect(() => {
    const root = rootRef.current;
    const q = questionRef.current;
    if (!root || !q) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      q.style.setProperty("--r", "1");
      return;
    }
    let last = "";
    const update = () => {
      const vh = window.innerHeight;
      const top = root.getBoundingClientRect().top;
      const r = clamp01((vh * LIT_FROM - top) / (vh * LIT_SPAN)).toFixed(3);
      if (r === last) return;
      last = r;
      q.style.setProperty("--r", r);
    };
    // Si se llega con el bloque ya en pantalla (volviendo de un proyecto), sin scroll que avise.
    update();
    return scrollController.subscribe(update);
  }, []);

  // Los apartados entran una vez, al asomar: no hay nada que rebobinar en un hilo y un párrafo.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLElement>("[data-part]")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -18% 0px" },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section ref={rootRef} id={anchor} className={styles.story}>
      <h2 className={styles.title}>{title}</h2>

      <div className={styles.grid}>
        <div className={styles.aside}>
          <p ref={questionRef} className={styles.question} style={{ "--n": words.length } as CSSProperties}>
            {/* Frase entera para lectores de pantalla; las palabras sueltas solo cambian de tono. */}
            <span className={styles.sr}>{question}</span>
            <span aria-hidden="true">
              {words.map((w, i) => (
                <span key={i} className={styles.word} style={{ "--i": i } as CSSProperties}>
                  {w}{" "}
                </span>
              ))}
            </span>
          </p>
        </div>

        <ol className={styles.parts}>
          {parts.map((p) => (
            <li key={p.heading} className={styles.part} data-part>
              <h3 className={styles.heading}>{p.heading}</h3>
              <p className={styles.text}>{p.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
