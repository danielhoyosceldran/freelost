"use client";

import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { assetRegistry } from "@/core/assets/registry";
import { useLifecycle } from "./store";

interface Slot {
  /** Posición del bloque en la página (before, main y after seguidos). */
  index: number;
  /** Índices de los bloques con holdsBelow que tiene por encima. */
  heldBy: readonly number[];
}

const SlotContext = createContext<Slot>({ index: -1, heldBy: [] });

/** Lo pone BlockRenderer alrededor de cada bloque; los bloques no lo usan directamente. */
export function BlockSlot({ index, heldBy, critical, children }: Slot & { critical: boolean; children: ReactNode }) {
  // En el primer commit, aunque el bloque cargue su código más tarde: el loader no puede
  // llegar al 100% sin saber que este bloque existe.
  useEffect(() => {
    if (!critical) return;
    assetRegistry.expect(index);
    return () => assetRegistry.unexpect(index);
  }, [critical, index]);

  return <SlotContext.Provider value={{ index, heldBy }}>{children}</SlotContext.Provider>;
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
  return () => release(index);
}

/**
 * Para bloques `critical`: entrega las promesas que la pantalla de carga debe esperar.
 * Solo cuenta la primera llamada.
 */
export function useCriticalAssets() {
  const { index } = useBlockSlot();
  return useCallback((tasks: readonly Promise<unknown>[]) => assetRegistry.provide(index, tasks), [index]);
}
