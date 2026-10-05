"use client";

import { useEffect, useRef } from "react";
import { useWarm } from "@/core/lifecycle/BlockSlot";
import type { GearModel, GearViewer } from "@/lib/three/GearViewer";

/**
 * Hueco del visor. Mientras el bloque no está 'warm' (el carrete aún no ha llegado a su warmAt)
 * no pide nada; cuando lo está, importa three.js (chunk aparte, ~700 KB) y crea el visor, que a
 * su vez solo descarga el .glb cuando se acerca al viewport. `onViewer` entrega el visor (y null
 * al desmontar) para que la escena lo pilote.
 */
export function GearCanvas({
  model,
  className,
  onViewer,
}: {
  model: GearModel;
  className?: string;
  onViewer?: (viewer: GearViewer | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onViewerRef = useRef(onViewer);
  useEffect(() => {
    onViewerRef.current = onViewer;
  });
  const warm = useWarm();

  useEffect(() => {
    if (!warm) return;
    let cancelled = false;
    let viewer: GearViewer | null = null;
    import("@/lib/three/GearViewer")
      .then(({ GearViewer }) => {
        if (cancelled || !hostRef.current) return;
        viewer = new GearViewer(hostRef.current, model);
        onViewerRef.current?.(viewer);
      })
      .catch((err) => console.error("No se pudo arrancar la sección 3D", err));
    return () => {
      cancelled = true;
      if (viewer) onViewerRef.current?.(null);
      viewer?.destroy();
    };
  }, [warm, model]);

  return <div ref={hostRef} className={className} />;
}
