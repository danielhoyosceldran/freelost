/**
 * Recuento de lo que la pantalla de carga debe esperar. Sustituye a window.aocCarrusel.loads de
 * v4, que ataba el loader al carrete: aquí cualquier bloque con `critical: true` aporta sus
 * promesas y el loader no sabe de quién son.
 *
 * Dos pasos, porque un bloque puede montarse tarde (import dinámico) y el loader no puede
 * llegar al 100% antes de saber que existe:
 * - expect(i): lo hace BlockSlot en el primer commit, para todo bloque crítico.
 * - provide(i, promesas): lo hace el bloque cuando ya sabe qué carga.
 * Un bloque esperado que aún no ha aportado nada cuenta como 1 tarea pendiente.
 *
 * Cada tarea vale 1 y un error cuenta como terminado: una foto rota no puede dejar la web
 * encerrada tras el velo. Una tarea puede traer además `progress()` (0..1) para que el loader
 * avance mientras está a medias, p. ej. lo que lleva cargado el vídeo del hero; sin él vale 0
 * hasta que termina. Singleton de módulo, sin estado React: el loader lo consulta por frame.
 */

export interface AssetTask {
  done: Promise<unknown>;
  progress?: () => number;
}

interface Entry {
  total: number;
  done: number;
  partial: (() => number)[];
}

class AssetRegistry {
  private expected = new Set<number>();
  private provided = new Map<number, Entry>();

  expect(index: number) {
    this.expected.add(index);
  }

  unexpect(index: number) {
    this.expected.delete(index);
  }

  /** Solo cuenta la primera llamada por bloque (StrictMode monta los efectos dos veces). */
  provide(index: number, tasks: readonly (Promise<unknown> | AssetTask)[]) {
    if (this.provided.has(index)) return;
    const entry: Entry = { total: tasks.length, done: 0, partial: [] };
    this.provided.set(index, entry);
    tasks.forEach((t) => {
      const task = t instanceof Promise ? { done: t } : t;
      let settled = false;
      const settle = () => {
        settled = true;
        entry.done++;
      };
      task.done.then(settle, settle);
      const progress = task.progress;
      if (progress) entry.partial.push(() => (settled ? 0 : Math.min(0.999, Math.max(0, progress()))));
    });
  }

  progress() {
    let total = 0;
    let done = 0;
    for (const e of this.provided.values()) {
      total += e.total;
      done += e.done;
      for (const p of e.partial) done += p();
    }
    for (const i of this.expected) if (!this.provided.has(i)) total += 1;
    return { done, total };
  }
}

export const assetRegistry = new AssetRegistry();
