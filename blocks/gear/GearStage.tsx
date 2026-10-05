"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useScene, useSceneProgress } from "@/core/scroll/ScrollScene";
import { clamp01 } from "@/lib/easing";
import type { GearViewer } from "@/lib/three/GearViewer";
import styles from "./gear.module.css";
import { GearCanvas } from "./GearCanvas";
import type { GearItem } from "./index";

/** Ángulo de reposo (rad): el objeto enseña tres cuartos, no el perfil. */
const SPIN_BASE = -0.6;
/** Cuánto gira cada objeto mientras dura su tramo (rad). */
const SPIN_RANGE = Math.PI * 0.9;

/**
 * Escenario clavado de "Lo que uso". El progreso de la escena se reparte en un tramo por objeto:
 * en el suyo, el objeto ocupa el escenario y gira con el scroll; en el cambio, el que sale sube
 * y se funde mientras el siguiente llega desde abajo. Todo por estilo directo (60 fps, sin
 * re-render); el estado React solo guarda cuál es el actual, para aria-current.
 */
export function GearStage({ title, items }: { title: string; items: GearItem[] }) {
  const scene = useScene();
  const n = items.length;
  const viewers = useRef<(GearViewer | null)[]>([]);
  const boxes = useRef<(HTMLDivElement | null)[]>([]);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const lastP = useRef(0);
  const reduced = useRef(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const apply = useCallback(
    (p: number) => {
      lastP.current = p;
      const k = clamp01(p) * n;
      for (let i = 0; i < n; i++) {
        // Distancia al centro de su tramo. El primero ya está entero al llegar y el último se
        // queda hasta el final: fuera de los extremos no hay con quién fundirse.
        let d = k - (i + 0.5);
        if (i === 0) d = Math.max(d, 0);
        if (i === n - 1) d = Math.min(d, 0);
        const v = clamp01((0.62 - Math.abs(d)) / 0.24);
        const box = boxes.current[i];
        if (box) {
          box.style.opacity = String(v);
          box.style.visibility = v <= 0 ? "hidden" : "";
          box.style.transform = reduced.current
            ? ""
            : `translateY(${(-Math.sign(d) * (1 - v) * 10).toFixed(2)}%) scale(${(0.9 + 0.1 * v).toFixed(4)})`;
        }
        const viewer = viewers.current[i];
        viewer?.setActive(v > 0);
        viewer?.setSpin(reduced.current ? SPIN_BASE : SPIN_BASE + (k - (i + 0.5)) * SPIN_RANGE);
        const fill = fills.current[i];
        if (fill) fill.style.transform = `scaleX(${clamp01(k - i).toFixed(4)})`;
      }
      const idx = Math.min(n - 1, Math.max(0, Math.floor(k)));
      setCurrent((c) => (c === idx ? c : idx));
    },
    [n],
  );

  useSceneProgress(apply);

  // Los visores llegan tarde (three.js se importa al calentar): se colocan con el último progreso.
  const register = (i: number, viewer: GearViewer | null) => {
    viewers.current[i] = viewer;
    if (viewer) apply(lastP.current);
  };

  return (
    <div className={styles.stage}>
      <h2 className={styles.title}>{title}</h2>

      <div className={styles.stack}>
        {items.map((item, i) => (
          <div key={item.name} ref={(el) => void (boxes.current[i] = el)} className={styles.box}>
            <GearCanvas model={item.model} className={styles.viewer} onViewer={(v) => register(i, v)} />
          </div>
        ))}
      </div>

      <ol className={styles.list}>
        {items.map((item, i) => (
          <li key={item.name}>
            <button
              type="button"
              className={styles.item}
              aria-current={current === i ? "step" : undefined}
              onClick={() => scene.seek((i + 0.5) / n)}
            >
              <span className={styles.name}>{item.name}</span>
              <span className={styles.track} aria-hidden="true">
                <span ref={(el) => void (fills.current[i] = el)} className={styles.fill} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
