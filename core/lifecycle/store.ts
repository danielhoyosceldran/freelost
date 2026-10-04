import { create } from "zustand";

/**
 * Ciclo de vida de la página. Sustituye a los CustomEvent de v4 ('loader:done', 'actone:warm',
 * 'actone:done').
 *
 * ready: la página está a la vista (el loader se ha levantado). Las intros esperan a esto: si
 * arrancaran antes se gastarían enteras detrás del velo. Lo pone el bloque con `ownsReady` (el
 * loader) o, si la página no tiene ninguno, PageReady al hidratar.
 *
 * Holds: un bloque con `holdsBelow` (una escena larga como el acto I) retiene la carga de los
 * bloques `preload: 'onWarm'` que tiene debajo hasta que llama a release(su índice). El gear de
 * v4 esperaba a 'actone:warm'; aquí espera a que no quede ningún hold sin soltar por encima,
 * sin saber qué bloque es. Sin holds por encima (acto I quitado o movido) arranca directo.
 */
interface LifecycleState {
  ready: boolean;
  released: Record<number, true>;
  markReady: () => void;
  release: (index: number) => void;
}

export const useLifecycle = create<LifecycleState>((set) => ({
  ready: false,
  released: {},
  markReady: () => set({ ready: true }),
  release: (index) =>
    set((s) => (s.released[index] ? s : { released: { ...s.released, [index]: true } })),
}));

export const useReady = () => useLifecycle((s) => s.ready);
