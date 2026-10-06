"use client";

import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { assetRegistry, type AssetTask } from "@/core/assets/registry";
import { useLifecycle } from "./store";

interface Slot {
  /** Posición del bloque en la página (before, main y after seguidos). */
  index: number;
  /** Índices de los bloques con holdsBelow que tiene por encima. */
  heldBy: readonly number[];
  /** El manifest lo marca `critical`: la pantalla de carga lo espera. */
  critical: boolean;
}

const SlotContext = createContext<Slot>({ index: -1, heldBy: [], critical: false });

/** Lo pone BlockRenderer alrededor de cada bloque; los bloques no lo usan directamente. */
export function BlockSlot({ index, heldBy, critical, children }: Slot & { children: ReactNode }) {
  // En el primer commit, aunque el bloque cargue su código más tarde: el loader no puede
  // llegar al 100% sin saber que este bloque existe.
  useEffect(() => {
    if (!critical) return;
    assetRegistry.expect(index);
    return () => assetRegistry.unexpect(index);
  }, [critical, index]);

  return <SlotContext.Provider value={{ index, heldBy, critical }}>{children}</SlotContext.Provider>;
}

export function useBlockSlot() {
  return useContext(SlotContext);
}

/** true cuando el bloque puede empezar a cargar lo pesado (para preload: 'onWarm'). */
export function useWarm() {
  const { heldBy } = useBlockSlot();
  return useLifecycle((s) => heldBy.every((i) => s.released[i]));
}

/** Suelta el hold de este bloque: los 'onWarm' de debajo pueden arrancar. Idempotente. */
export function useReleaseHold() {
  const { index } = useBlockSlot();
  const release = useLifecycle((s) => s.release);
  // Estable entre renders: los bloques la ponen en las dependencias de sus efectos, y una
  // función nueva en cada render los desmontaría y volvería a montar (el carrete entero).
  return useCallback(() => release(index), [release, index]);
}

/**
 * Para bloques `critical`: entrega las tareas que la pantalla de carga debe esperar (promesas, o
 * `{ done, progress }` si el bloque sabe cuánto lleva). Solo cuenta la primera llamada.
 *
 * Si el manifest no es `critical` no hace nada: así un bloque puede ir arriba (crítico) o más
 * abajo en la página (no crítico, el carrete tras el hero) sin tocar su código.
 */
export function useCriticalAssets() {
  const { index, critical } = useBlockSlot();
  return useCallback(
    (tasks: readonly (Promise<unknown> | AssetTask)[]) => {
      if (critical) assetRegistry.provide(index, tasks);
    },
    [index, critical],
  );
}
