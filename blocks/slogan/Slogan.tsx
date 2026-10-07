"use client";

import { useCallback, useEffect, useRef } from "react";
import { scrollController } from "@/core/scroll/controller";
import { ScrollScene, useSceneProgress } from "@/core/scroll/ScrollScene";
import { easeOut, segment } from "@/lib/easing";
import type { SloganProps } from "./index";
import styles from "./slogan.module.css";

/** Opacidad máxima: papel secundario, no blanco entero. Discreto. */
const MAX = 0.72;
/**
 * Lo que se apaga con la velocidad: quien baja despacio o se para lo ve entero; quien pasa rápido
 * lo ve tenue (nunca desaparece del todo, no se puede perder). Es el "descubrir" del encargo.
 */
const SPEED_DIM = 0.5;
/** Subida (px) mientras aparece. Poca: es un susurro, no una entrada. */
const RISE = 10;

export function Slogan({ text, lang, height }: SloganProps) {
  return (
    <ScrollScene height={height} className="bg-ink">
      <SloganStage text={text} lang={lang} />
    </ScrollScene>
  );
}

function SloganStage({ text, lang }: Pick<SloganProps, "text" | "lang">) {
  const ref = useRef<HTMLParagraphElement>(null);
  const progress = useRef(0);
  const speed = useRef(0);
  const calm = useRef(false);

  // Una sola función para las dos fuentes (posición y velocidad). Estilo directo, sin re-render.
  const apply = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const p = progress.current;
    // Aparece en el tramo central de la escena y se apaga al salir.
    const shown = easeOut(segment(p, 0.25, 0.5)) * (1 - segment(p, 0.8, 1));
    const dim = calm.current ? 1 : 1 - SPEED_DIM * Math.min(1, Math.abs(speed.current));
    el.style.opacity = (MAX * shown * dim).toFixed(3);
    el.style.transform = calm.current ? "" : `translateY(${((1 - shown) * RISE).toFixed(2)}px)`;
  }, []);

  useEffect(() => {
    calm.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    return scrollController.subscribeVelocity((v) => {
      speed.current = v;
      apply();
    });
  }, [apply]);

  useSceneProgress((p) => {
    progress.current = p;
    apply();
  });

  return (
    <div className={styles.stage}>
      <p ref={ref} className={styles.slogan} lang={lang}>
        {text}
      </p>
    </div>
  );
}
