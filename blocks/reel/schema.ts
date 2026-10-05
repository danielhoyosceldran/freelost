import { z } from "zod";

// Contrato de datos de una diapositiva del carrete. Fichero aparte de slides.ts a propósito: los
// módulos de cliente (Reel, project) solo necesitan los helpers, y si importaran esto arrastrarían
// zod entero al bundle del navegador. Solo lo importa el manifest (servidor).
//
// `caption` es el pie que se lee bajo la tarjeta del centro y el nombre del proyecto al abrirlo.

export const slideSchema = z.discriminatedUnion("kind", [
  /**
   * Película servida desde el propio sitio (public/). La portada se pinta en la cinta (textura
   * WebGL: mismo origen) y la película se reproduce entera al abrir el proyecto.
   */
  z.object({ kind: z.literal("film"), cover: z.string(), src: z.string(), caption: z.string() }),
  /**
   * Vídeo de Vimeo: la portada (local, la textura WebGL necesita mismo origen o CORS) se pinta en
   * la cinta y el vídeo se reproduce al abrir. `vimeo` es el id numérico; `hash`, el parámetro h
   * de los vídeos ocultos ("unlisted"), si lo tiene.
   */
  z.object({
    kind: z.literal("video"),
    cover: z.string(),
    vimeo: z.string().regex(/^\d+$/),
    hash: z.string().optional(),
    caption: z.string(),
  }),
  /** Foto de Pexels: el id es la ruta tras /photos/ sin extensión. Pexels sirve CORS. */
  z.object({ kind: z.literal("photo"), pexels: z.string(), caption: z.string() }),
]);
