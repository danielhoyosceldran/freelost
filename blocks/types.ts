import type { ComponentType } from "react";
import type { z } from "zod";

/**
 * Cuándo debe empezar a cargar un bloque sus recursos pesados.
 * - eager: al montar la página.
 * - onWarm: cuando el orquestador avisa de que el bloque se acerca (sustituye a 'actone:warm').
 * - onVisible: cuando entra en el viewport.
 */
export type Preload = "eager" | "onWarm" | "onVisible";

export interface BlockManifest<S extends z.ZodType = z.ZodType> {
  type: string;
  /** Valida los props de la config; un bloque mal configurado rompe el build, no la pantalla. */
  schema: S;
  Component: ComponentType<z.output<S>>;
  preload?: Preload;
  /** El loader de página espera a los bloques críticos antes de emitir 'ready'. */
  critical?: boolean;
  /**
   * Retiene la carga de los bloques 'onWarm' que tiene debajo hasta que suelta su hold
   * (ScrollScene con warmAt, o la puerta al romperse). Para escenas largas que deben tener
   * la red para ellas solas, como el acto I.
   */
  holdsBelow?: boolean;
  /**
   * El bloque decide cuándo la página está 'ready' (la pantalla de carga) y llamará a markReady().
   * Sin ningún bloque así, la página está ready al hidratar.
   */
  ownsReady?: boolean;
}

/** Helper de inferencia: conserva el tipo exacto del schema para el registry. */
export function defineBlock<S extends z.ZodType>(manifest: BlockManifest<S>) {
  return manifest;
}
