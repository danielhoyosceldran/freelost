"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useReleaseHold } from "@/core/lifecycle/BlockSlot";
import { docTop, scrollController, type ScrollMode } from "./controller";

/**
 * Escena de scroll: spacer alto + hijo sticky de una pantalla, el patrón de todas las secciones
 * animadas de v4. El progreso 0→1 se deriva de la posición del spacer, así que cambiar `height`
 * cambia el ritmo de toda la escena.
 *
 * El progreso NO es estado de React: se publica por suscripción (useSceneProgress) porque
 * cambia en cada píxel de scroll y re-renderizar a 60fps no tiene sentido.
 */
export interface SceneHandle {
  /** Y absoluta del inicio de la escena. */
  top(): number;
  /** Recorrido en px (alto del spacer menos una pantalla). */
  span(): number;
  /** Y en la que la escena llega al 100% y el sticky va a soltarse. */
  endY(): number;
  progress(): number;
  /** Y de la página que corresponde a un progreso dado (inversa de progress). */
  yAt(p: number): number;
  subscribe(cb: (p: number) => void): () => void;
  /** Mueve la página a un progreso; antes avisa a onBeforeSeek (la puerta se suelta). */
  seek(p: number, mode?: ScrollMode): void;
  onBeforeSeek(cb: () => void): () => void;
  /** Suelta el hold del bloque: los bloques 'onWarm' de debajo empiezan a cargar. */
  warm(): void;
}

const SceneContext = createContext<SceneHandle | null>(null);

export function useScene() {
  const scene = useContext(SceneContext);
  if (!scene) throw new Error("useScene() fuera de <ScrollScene>");
  return scene;
}

/** Llama a cb con el progreso al montar y en cada scroll/resize. cb puede cambiar sin resuscribir. */
export function useSceneProgress(cb: (p: number) => void) {
  const scene = useScene();
  const cbRef = useRef(cb);
  useEffect(() => {
    cbRef.current = cb;
  });
  useEffect(() => scene.subscribe((p) => cbRef.current(p)), [scene]);
}

interface Props {
  /** id del <section>. */
  anchor?: string;
  /** Alto del spacer, p. ej. "700vh". */
  height: string;
  /** Progreso a partir del cual se suelta el hold (v4: WARM_AT = 0.75). Sin él, solo lo suelta warm(). */
  warmAt?: number;
  /** Margen superior (negativo) para que la escena empiece sobre el final de la anterior. */
  overlap?: string;
  className?: string;
  stageClassName?: string;
  children: ReactNode;
}

export function ScrollScene({ anchor, height, warmAt, overlap, className = "", stageClassName = "", children }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const releaseHold = useReleaseHold();
  const releaseRef = useRef(releaseHold);
  useEffect(() => {
    releaseRef.current = releaseHold;
  });

  const scene = useMemo<SceneHandle>(() => {
    const seekListeners = new Set<() => void>();
    const el = () => sectionRef.current;
    const top = () => (el() ? docTop(el()!) : 0);
    const span = () => (el() ? el()!.offsetHeight - window.innerHeight : 0);
    const progress = () => {
      const s = span();
      if (s <= 0) return 0;
      return Math.min(1, Math.max(0, (window.scrollY - top()) / s));
    };
    const handle: SceneHandle = {
      top,
      span,
      endY: () => top() + span(),
      progress,
      yAt: (p) => top() + p * span(),
      subscribe(cb) {
        cb(progress());
        return scrollController.subscribe(() => cb(progress()));
      },
      seek(p, mode = "motion") {
        seekListeners.forEach((l) => l());
        // Otro pin (un proyecto abierto) sigue mandando: no se mueve nada.
        if (scrollController.isPinned() || span() <= 0) return;
        scrollController.scrollTo(handle.yAt(p), mode);
      },
      onBeforeSeek(cb) {
        seekListeners.add(cb);
        return () => {
          seekListeners.delete(cb);
        };
      },
      warm: () => releaseRef.current(),
    };
    return handle;
  }, []);

  useEffect(() => {
    if (warmAt === undefined) return;
    return scene.subscribe((p) => {
      if (p >= warmAt) scene.warm();
    });
  }, [scene, warmAt]);

  return (
    <SceneContext.Provider value={scene}>
      <section ref={sectionRef} id={anchor} className={`relative ${className}`} style={{ height, marginTop: overlap }}>
        <div className={`sticky top-0 h-screen w-full overflow-hidden ${stageClassName}`}>{children}</div>
      </section>
    </SceneContext.Provider>
  );
}
