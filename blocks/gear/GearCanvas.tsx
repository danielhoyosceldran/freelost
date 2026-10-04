"use client";

import { useEffect, useRef } from "react";
import { useWarm } from "@/core/lifecycle/BlockSlot";
import type { GearModel } from "@/lib/three/GearViewer";

/**
 * Hueco del visor. Mientras el bloque no está 'warm' (el acto I aún no ha llegado al 75%) no
 * pide nada; cuando lo está, importa three.js (chunk aparte, ~700 KB) y crea el visor, que a su
 * vez solo descarga el .glb cuando se acerca al viewport.
 */
export function GearCanvas({ model, className }: { model: GearModel; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const warm = useWarm();

  useEffect(() => {
    if (!warm) return;
    let cancelled = false;
    let viewer: { destroy(): void } | null = null;
    import("@/lib/three/GearViewer")
      .then(({ GearViewer }) => {
        if (cancelled || !hostRef.current) return;
        viewer = new GearViewer(hostRef.current, model);
      })
      .catch((err) => console.error("No se pudo arrancar la sección 3D", err));
    return () => {
      cancelled = true;
      viewer?.destroy();
    };
  }, [warm, model]);

  return <div ref={hostRef} className={className} />;
}
