"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scrollController } from "@/core/scroll/controller";
import { useScene, useSceneProgress } from "@/core/scroll/ScrollScene";
import { clamp01, easeIn, easeOut, easeOutQuint, segment } from "@/lib/easing";
import type { GearViewer } from "@/lib/three/GearViewer";
import styles from "./gear.module.css";
import { GearCanvas } from "./GearCanvas";
import type { GearItem } from "./index";

/** Ángulo de reposo (rad): el objeto enseña tres cuartos, no el perfil. */
const SPIN_BASE = -0.6;
/** Cuánto gira cada objeto (rad) por cada tramo de scroll mientras está asentado: un giro lento. */
const DRIFT = 0.9;
/** Giro extra (rad) del cambio: el que sale arranca con él y el que llega lo frena hasta el reposo. */
const WHIP = 2.6;
/** Recorrido (% de su caja) del que sale y del que llega durante el cambio. */
const TRAVEL = 28;
/**
 * Reparto del tramo de cada objeto, en distancia a su centro (0 = centro, 0,5 = límite con el
 * vecino): hasta SETTLE el objeto se queda quieto y solo deriva; el cambio ocupa de SETTLE a GONE.
 * Así ~70% del scroll es plano sostenido y ~30% es el barrido.
 */
const SETTLE = 0.35;
const GONE = 0.65;
/** Cuánto se desplazan los nombres (px) con la velocidad máxima del scroll: se quedan atrás. */
const LIST_LAG = 16;

/**
 * El primer tramo de la escena (`entry`, fracción del progreso total) es la llegada: el escenario
 * entero baja desde arriba y se asienta, como una diapositiva nueva. El resto se reparte entre
 * los objetos.
 *
 * Escenario clavado de "Lo que uso". El progreso de la escena se reparte en un tramo por objeto,
 * con tempo desigual: una espera larga con giro lento y un cambio corto con barrido (el que sale
 * acelera hacia arriba y el que llega entra rápido y se asienta). Todo por estilo directo (60 fps,
 * sin re-render); el estado React solo guarda cuál es el actual, para aria-current.
 */
export function GearStage({ title, items, entry }: { title: string; items: GearItem[]; entry: number }) {
  const scene = useScene();
  const n = items.length;
  const viewers = useRef<(GearViewer | null)[]>([]);
  const boxes = useRef<(HTMLDivElement | null)[]>([]);
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
    (sceneP: number) => {
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
      const p = segment(sceneP, entry, 1);
      const k = clamp01(p) * n;
      for (let i = 0; i < n; i++) {
        // Distancia al centro de su tramo. El primero ya está entero al llegar y el último se
        // queda hasta el final: fuera de los extremos no hay con quién cambiar.
        const drift = k - (i + 0.5);
        let d = drift;
        if (i === 0) d = Math.max(d, 0);
        if (i === n - 1) d = Math.min(d, 0);
        const q = segment(Math.abs(d), SETTLE, GONE); // 0 = asentado, 1 = fuera
        const leaving = d > 0;
        // Sale acelerando y llega frenando: cámara que barre y se asienta.
        const disp = leaving ? easeIn(q) : 1 - easeOut(1 - q);
        const sign = Math.sign(d);
        const v = leaving ? 1 - clamp01(q * 1.4) : clamp01((1 - q) * 1.4);
        const box = boxes.current[i];
        if (box) {
          box.style.opacity = String(v);
          box.style.visibility = v <= 0 ? "hidden" : "";
          box.style.transform = reduced.current
            ? ""
            : `translateY(${(-sign * disp * TRAVEL).toFixed(2)}%) scale(${(1 - 0.1 * disp).toFixed(4)})`;
        }
        const viewer = viewers.current[i];
        viewer?.setActive(v > 0);
        viewer?.setSpin(reduced.current ? SPIN_BASE : SPIN_BASE + drift * DRIFT + sign * disp * WHIP);
        const fill = fills.current[i];
        if (fill) fill.style.transform = `scaleX(${clamp01(k - i).toFixed(4)})`;
      }
      const idx = Math.min(n - 1, Math.max(0, Math.floor(k)));
      setCurrent((c) => (c === idx ? c : idx));
    },
    [n, entry],
  );

  useSceneProgress(apply);

  // Los visores llegan tarde (three.js se importa al calentar): se colocan con el último progreso.
  const register = (i: number, viewer: GearViewer | null) => {
    viewers.current[i] = viewer;
    if (viewer) apply(lastP.current);
  };

  return (
    <div ref={stageRef} className={styles.stage}>
      <h2 className={styles.title}>{title}</h2>

      <div className={styles.stack}>
        {items.map((item, i) => (
          <div key={item.name} ref={(el) => void (boxes.current[i] = el)} className={styles.box}>
            <GearCanvas model={item.model} className={styles.viewer} onViewer={(v) => register(i, v)} />
          </div>
        ))}
      </div>

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
          </li>
        ))}
      </ol>
    </div>
  );
}
