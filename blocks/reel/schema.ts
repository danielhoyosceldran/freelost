import { z } from "zod";

// Contrato de datos de una diapositiva del carrete. Fichero aparte de slides.ts a propósito: los
// módulos de cliente (Reel, project) solo necesitan los helpers, y si importaran esto arrastrarían
// zod entero al bundle del navegador. Solo lo importa el manifest (servidor).

export const slideSchema = z.discriminatedUnion("kind", [
  /** Foto de Pexels: el id es la ruta tras /photos/ sin extensión. Pexels sirve CORS. */
  z.object({ kind: z.literal("photo"), pexels: z.string(), place: z.string() }),
  /** Vídeo local: la portada se pinta en la cinta y el vídeo se reproduce al abrir. */
  z.object({ kind: z.literal("video"), cover: z.string(), video: z.string(), place: z.string() }),
]);
