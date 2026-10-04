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
 * Cada promesa vale 1 y un error cuenta como terminado: una foto rota no puede dejar la web
 * encerrada tras el velo. Singleton de módulo, sin estado React: el loader lo consulta por frame.
 */

interface Entry {
  total: number;
  done: number;
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
  provide(index: number, tasks: readonly Promise<unknown>[]) {
    if (this.provided.has(index)) return;
    const entry: Entry = { total: tasks.length, done: 0 };
    this.provided.set(index, entry);
    const settle = () => {
      entry.done++;
    };
    tasks.forEach((t) => t.then(settle, settle));
  }

  progress() {
    let total = 0;
    let done = 0;
    for (const e of this.provided.values()) {
      total += e.total;
      done += e.done;
    }
    for (const i of this.expected) if (!this.provided.has(i)) total += 1;
    return { done, total };
  }
}

export const assetRegistry = new AssetRegistry();
