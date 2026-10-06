"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scrollController } from "@/core/scroll/controller";
import { useScene, useSceneProgress } from "@/core/scroll/ScrollScene";
import { clamp01, easeOutQuint, segment } from "@/lib/easing";
import type { GearMorph } from "@/lib/three/GearMorph";
import styles from "./gear.module.css";
import { GearCanvas } from "./GearCanvas";
import type { GearItem } from "./index";

/** Cuánto se desplazan los nombres (px) con la velocidad máxima del scroll: se quedan atrás. */
const LIST_LAG = 16;

/**
 * Escenario clavado de "Lo que uso".
 *
 * El primer tramo de la escena (`entry`, fracción del progreso total) es la llegada: el escenario
 * entero baja desde arriba y se asienta, como una diapositiva nueva. El resto se reparte en un
 * tramo por objeto. El scroll solo elige el objeto; la metamorfosis de uno a otro la reproduce el
 * motor en el tiempo y siempre se completa (ver GearMorph). Todo por estilo directo (60 fps, sin
 * re-render); el estado React solo guarda cuál es el actual, para aria-current.
 */
export function GearStage({ title, items, entry }: { title: string; items: GearItem[]; entry: number }) {
  const scene = useScene();
  const n = items.length;
  const morph = useRef<GearMorph | null>(null);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const listRef = useRef<HTMLOListElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastP = useRef(0);
  const reduced = useRef(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Con velocidad los nombres se quedan atrás (sentido contrario al scroll): profundidad barata.
  useEffect(
    () =>
      scrollController.subscribeVelocity((v) => {
        const list = listRef.current;
        if (list) list.style.transform = v === 0 ? "" : `translateY(${(v * LIST_LAG).toFixed(2)}px)`;
      }),
    [],
  );

  const apply = useCallback(
    (sceneP: number, instant = false) => {
      lastP.current = sceneP;
      // Llegada: baja desde arriba con curva de frenado largo. Con movimiento reducido, fundido.
      const stage = stageRef.current;
      if (stage) {
        const arrive = easeOutQuint(segment(sceneP, 0, entry));
        // Antes de clavarse (progreso 0) el escenario no existe: no tapa ni intercepta el carrete.
        stage.style.visibility = sceneP <= 0 ? "hidden" : "";
        stage.style.opacity = reduced.current ? String(arrive) : "";
        stage.style.transform = reduced.current || arrive >= 1 ? "" : `translateY(${(-(1 - arrive) * 100).toFixed(2)}%)`;
      }
      const k = clamp01(segment(sceneP, entry, 1)) * n;
      for (let i = 0; i < n; i++) {
        const fill = fills.current[i];
        if (fill) fill.style.transform = `scaleX(${clamp01(k - i).toFixed(4)})`;
      }
      const idx = Math.min(n - 1, Math.max(0, Math.floor(k)));
      morph.current?.setActive(sceneP > 0);
      morph.current?.setTarget(idx, instant);
      setCurrent((c) => (c === idx ? c : idx));
    },
    [n, entry],
  );

  useSceneProgress(apply);

  // El motor llega tarde (three.js se importa al calentar): arranca ya en el objeto que toca, sin
  // metamorfosis desde el primero.
  const register = useCallback(
    (m: GearMorph | null) => {
      morph.current = m;
      if (m) apply(lastP.current, true);
    },
    [apply],
  );

  return (
    <div ref={stageRef} className={styles.stage}>
      <h2 className={styles.title}>{title}</h2>

      <div className={styles.stack}>
        <GearCanvas models={items.map((item) => item.model)} className={styles.viewer} onMorph={register} />
      </div>
      <div className={styles.vignette} aria-hidden="true" />

      <ol ref={listRef} className={styles.list}>
        {items.map((item, i) => (
          <li key={item.name}>
            <button
              type="button"
              className={styles.item}
              aria-current={current === i ? "step" : undefined}
              onClick={() => scene.seek(entry + (1 - entry) * ((i + 0.5) / n))}
            >
              <span className={styles.name}>{item.name}</span>
              <span className={styles.track} aria-hidden="true">
                <span ref={(el) => void (fills.current[i] = el)} className={styles.fill} />
              </span>
            </button>
            {/* Fuera del botón: una lista no puede ir dentro de él. Siempre en el DOM (el lector
                de pantalla las lee todas); el CSS solo despliega las del actual. */}
            {item.tags.length > 0 && (
              <div className={styles.tagsWrap}>
                <ul className={styles.tags}>
                  {item.tags.map((tag) => (
                    <li key={tag} className={styles.tag}>
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
