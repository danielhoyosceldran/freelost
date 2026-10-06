/**
 * Relevo entre páginas para las transiciones que cruzan una navegación: la salida del carrete a
 * todos los proyectos y su vuelta. La página que sale deja aquí lo que hace falta para deshacer
 * la animación al volver (scroll, tarjeta del centro). Vive en la memoria del módulo: sobrevive
 * a la navegación de cliente y no a una recarga, y sin relevo se entra como siempre (con loader).
 * Sin zod ni React: lo importan módulos de cliente.
 */
export interface Handoff {
  /** Ruta de la página que salió: solo ella deshace la salida. */
  path: string;
  scrollY: number;
  /** Tarjeta que estaba en el centro del carrete. */
  index: number;
}

let current: Handoff | null = null;

export const handoff = {
  leave(h: Handoff) {
    current = h;
  },
  /** La salida pendiente de deshacer en `path`, o null. */
  pending(path: string) {
    return current && current.path === path ? current : null;
  },
  /** Vuelta terminada: la próxima entrada en esa página es normal. */
  done() {
    current = null;
  },
};
