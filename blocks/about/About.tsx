"use client";

import { Fragment, useEffect, useRef } from "react";
import { scrollController } from "@/core/scroll/controller";
import { clamp01 } from "@/lib/easing";
import type { AboutProps } from "./index";
import styles from "./about.module.css";

/**
 * Tramo de pantalla en el que se revela cada párrafo: empieza cuando su borde superior pasa por
 * REVEAL_FROM del alto y acaba en REVEAL_TO. Ligado al scroll (se rebobina), no disparado una vez.
 */
const REVEAL_FROM = 0.92;
const REVEAL_TO = 0.5;

/**
 * Cada palabra es una máscara, pero se mueven por líneas: tras maquetar se agrupan por su altura
 * (`--l`, índice de línea; `--n`, líneas del párrafo) y el CSS sube cada línea cuando el progreso
 * del párrafo (`--r`) llega a ella. Es la máscara de línea del sistema sin partir el texto a mano,
 * que se rompería al cambiar el ancho.
 */
function Lines({ text }: { text: string }) {
  // La raya va pegada a la palabra anterior (espacio irrompible) para que nunca abra línea.
  const words = text.split(/\s+/).reduce<string[]>((acc, w) => {
    if (w === "—" && acc.length) acc[acc.length - 1] += "\u00a0—";
    else acc.push(w);
    return acc;
  }, []);
  return (
    <>
      {/* Los lectores de pantalla leen la frase entera; las palabras sueltas son solo imagen. */}
      <span className={styles.sr}>{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <Fragment key={i}>
            {i > 0 && " "}
            <span className={styles.mask}>
              <span className={styles.word}>{w}</span>
            </span>
          </Fragment>
        ))}
      </span>
    </>
  );
}

export function About({ anchor, title, lead, body, closing, credit }: AboutProps) {
  const rootRef = useRef<HTMLElement>(null);

  // Índices de línea: al montar y cada vez que cambia el ancho (cambia dónde se parte el texto).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const blocks = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    const measure = () => {
      for (const block of blocks) {
        const masks = [...block.querySelectorAll<HTMLElement>(`.${styles.mask}`)];
        // offsetTop no lo altera el translate de la palabra: es la línea real de maquetación.
        const tops = [...new Set(masks.map((m) => m.offsetTop))].sort((a, b) => a - b);
        masks.forEach((m) => m.style.setProperty("--l", String(tops.indexOf(m.offsetTop))));
        block.style.setProperty("--n", String(Math.max(1, tops.length)));
      }
    };
    measure();
    // Las fuentes llegan después del primer pintado y cambian dónde se parten las líneas.
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // Progreso de cada párrafo según su posición en pantalla. Estilo directo, sin re-render.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const blocks = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      blocks.forEach((b) => b.style.setProperty("--r", "1"));
      return;
    }
    // Último valor escrito por párrafo: --r lo hereda cada palabra, así que reescribirlo igual
    // recalcula el estilo de todas. Fuera de su tramo (0 o 1) no se toca.
    const last = blocks.map(() => "");
    const update = () => {
      const vh = window.innerHeight;
      blocks.forEach((b, i) => {
        const top = b.getBoundingClientRect().top;
        const r = clamp01((vh * REVEAL_FROM - top) / (vh * (REVEAL_FROM - REVEAL_TO))).toFixed(3);
        if (r === last[i]) return;
        last[i] = r;
        b.style.setProperty("--r", r);
      });
    };
    // El controlador solo avisa al moverse: si se llega con el About ya en pantalla (volviendo de
    // un proyecto, por ejemplo), sin esto el texto seguiría oculto hasta el primer scroll.
    update();
    return scrollController.subscribe(update);
  }, []);

  return (
    <section ref={rootRef} id={anchor} className={styles.about}>
      <h2 className={styles.title}>{title}</h2>

      <p className={styles.lead} data-reveal>
        <Lines text={lead} />
      </p>

      <div className={styles.body}>
        {body.map((p, i) => (
          <p key={i} data-reveal>
            <Lines text={p} />
          </p>
        ))}
      </div>

      <p className={styles.closing} data-reveal>
        <Lines text={closing} />
      </p>

      <p className={styles.credit} data-reveal>
        <Lines text={credit} />
      </p>
    </section>
  );
}
