"use client";

import { useRef, type CSSProperties } from "react";
import { ScrollScene, useSceneProgress } from "@/core/scroll/ScrollScene";
import type { MissionProps } from "./index";
import styles from "./mission.module.css";

/**
 * Tramos de la escena (progreso 0→1 del spacer). La frase sube primero; cada línea del eslogan sube
 * detrás, escalonada; con las dos arriba, las letras se rellenan de papel. El último tramo es el
 * fotograma quieto antes de soltar, para que el contacto no pise el cierre.
 */
const STATEMENT = [0, 0.22] as const;
const LINES = [0.12, 0.42] as const;
const LINE_STAGGER = 0.1;
const FILL = [0.42, 0.78] as const;

const span = (p: number, [a, b]: readonly [number, number]) => Math.min(1, Math.max(0, (p - a) / (b - a)));

function Stage({ title, statement, slogan }: Omit<MissionProps, "anchor" | "height">) {
  const rootRef = useRef<HTMLDivElement>(null);
  const last = useRef("");

  // Todo va en variables CSS escritas directamente desde el scroll: nada de re-render por píxel.
  useSceneProgress((p) => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = reduce ? 1 : span(p, STATEMENT);
    const fill = reduce ? 1 : span(p, FILL);
    const lines = slogan.lines.map((_, i) =>
      reduce ? 1 : span(p, [LINES[0] + i * LINE_STAGGER, LINES[1] + i * LINE_STAGGER]),
    );
    const key = [s, fill, ...lines].map((v) => v.toFixed(3)).join();
    if (key === last.current) return;
    last.current = key;
    root.style.setProperty("--s", s.toFixed(3));
    root.style.setProperty("--fill", fill.toFixed(3));
    lines.forEach((v, i) => root.style.setProperty(`--l${i}`, v.toFixed(3)));
  });

  return (
    <div ref={rootRef} className={styles.stage}>
      <h2 className={styles.sr}>{title}</h2>

      <p className={styles.statement}>
        <span className={styles.mask}>
          <span className={styles.rise} style={{ "--k": "var(--s)" } as CSSProperties}>
            {statement}
          </span>
        </span>
      </p>

      {/* El eslogan se lee entero; las líneas dibujadas son imagen. */}
      <p className={styles.slogan} lang={slogan.lang}>
        <span className={styles.sr}>{slogan.text}</span>
        {slogan.lines.map((line, i) => (
          <span
            key={i}
            className={styles.mask}
            style={{ marginTop: i ? `${(line.gap / line.box[2]) * 100}%` : undefined } as CSSProperties}
            aria-hidden="true"
          >
            <svg
              className={styles.line}
              viewBox={line.box.join(" ")}
              style={{ "--k": `var(--l${i}, 0)` } as CSSProperties}
            >
              {line.words.map((w, j) => (
                <g key={j} transform={`translate(${w.x} ${w.y})`}>
                  {w.letters.map((d, k) => (
                    <path key={k} d={d} />
                  ))}
                </g>
              ))}
            </svg>
          </span>
        ))}
      </p>
    </div>
  );
}

export function Mission({ anchor, height, ...rest }: MissionProps) {
  return (
    <ScrollScene anchor={anchor} height={height} className="bg-ink">
      <Stage {...rest} />
    </ScrollScene>
  );
}
