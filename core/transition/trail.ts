/**
 * De qué página del archivo se llegó a una vista de proyecto. Si se vino del índice, «volver»
 * es atrás en el historial (y no un push): así el índice sigue debajo de la home y su cruz puede
 * deshacer la salida del carrete (core/transition/handoff.ts). Entrando directo no hay rastro y
 * «volver» navega al índice. Memoria de módulo, como el relevo: no sobrevive a una recarga.
 */
let from: string | null = null;

export const trail = {
  /** El índice lo marca al abrir un proyecto. */
  leave(path: string) {
    from = path;
  },
  cameFrom(path: string) {
    return from === path;
  },
};
