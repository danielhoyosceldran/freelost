"use client";

import { useEffect, useRef } from "react";
import { useWarm } from "@/core/lifecycle/BlockSlot";
import type { GearMorph } from "@/lib/three/GearMorph";
import type { GearModelKey } from "@/lib/three/gearModels";

/**
 * Hueco del lienzo. Mientras el bloque no está 'warm' (el carrete aún no ha llegado a su warmAt)
 * no pide nada; cuando lo está, importa three.js (chunk aparte) y crea el motor, que modela los
 * objetos por código: no hay nada más que descargar. `onMorph` entrega el motor (y null al
 * desmontar) para que la escena lo pilote.
 */
export function GearCanvas({
  models,
  className,
  onMorph,
}: {
  models: readonly GearModelKey[];
  className?: string;
  onMorph?: (morph: GearMorph | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onMorphRef = useRef(onMorph);
  useEffect(() => {
    onMorphRef.current = onMorph;
  });
  const warm = useWarm();
  // Clave estable: el array llega nuevo en cada render y no debe recrear la escena.
  const key = models.join(",");

  useEffect(() => {
    if (!warm) return;
    let cancelled = false;
    let morph: GearMorph | null = null;
    import("@/lib/three/GearMorph")
      .then(({ GearMorph }) => {
        if (cancelled || !hostRef.current) return;
        morph = new GearMorph(hostRef.current, key.split(",") as GearModelKey[]);
        onMorphRef.current?.(morph);
      })
      .catch((err) => console.error("No se pudo arrancar la sección 3D", err));
    return () => {
      cancelled = true;
      if (morph) onMorphRef.current?.(null);
      morph?.destroy();
    };
  }, [warm, key]);

  return <div ref={hostRef} className={className} />;
}
