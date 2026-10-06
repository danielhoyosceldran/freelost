import { z } from "zod";

// Contrato de datos de una diapositiva del carrete. Fichero aparte de slides.ts a propósito: los
// módulos de cliente (Reel, project) solo necesitan los helpers, y si importaran esto arrastrarían
// zod entero al bundle del navegador. Solo lo importa el manifest (servidor).
//
// `caption` es el pie que se lee bajo la tarjeta del centro y el nombre del proyecto al abrirlo.

export const slideSchema = z.discriminatedUnion("kind", [
  /**
   * Película en MP4 directo (public/ o un CDN, ver lib/media.ts). La portada se pinta en la cinta
   * (textura WebGL: mismo origen o CORS) y la película se reproduce entera al abrir el proyecto.
   */
  z.object({ kind: z.literal("film"), cover: z.string(), src: z.string(), caption: z.string() }),
  /**
   * Vídeo de Vimeo: la portada se pinta en la cinta y el vídeo se reproduce al abrir. La portada
   * sale del proveedor de imágenes, no de Vimeo: la textura WebGL necesita mismo origen o CORS, y
   * las miniaturas de Vimeo no lo garantizan. `vimeo` es el id numérico; `hash`, el parámetro h
   * de los vídeos ocultos ("unlisted"), si lo tiene.
   */
  z.object({
    kind: z.literal("video"),
    cover: z.string(),
    vimeo: z.string().regex(/^\d+$/),
    hash: z.string().optional(),
    caption: z.string(),
  }),
  /**
   * Foto: `src` es la ruta en el proveedor de imágenes (lib/media.ts), que la sirve al ancho de la
   * cinta y al de pantalla completa. Tiene que mandar CORS (textura WebGL).
   */
  z.object({ kind: z.literal("photo"), src: z.string(), caption: z.string() }),
]);
