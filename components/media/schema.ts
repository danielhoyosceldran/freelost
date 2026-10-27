import { z } from "zod";

/**
 * Un medio de un proyecto: foto o vídeo. Sin `src` es un hueco: se pinta el marcador con su
 * proporción, así la maqueta de la página ya es la definitiva y llenarla es pegar la URL en
 * content/, sin tocar el bloque. Las URLs salen de lib/media.ts (o de Vimeo, más adelante).
 *
 * `size` decide cuánto ocupa en la secuencia de la vista de proyecto (rejilla de 12 columnas):
 * full a sangre, wide 8 columnas, half la mitad, narrow 4 columnas pegadas a la derecha.
 */
export const mediaSchema = z.object({
  kind: z.enum(["photo", "video"]),
  /** Proporción como en CSS aspect-ratio ("16/9", "4/5"). */
  ratio: z.string().regex(/^\d+(\.\d+)?\/\d+(\.\d+)?$/),
  src: z.string().optional(),
  /** Fotograma de espera del vídeo. */
  poster: z.string().optional(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  size: z.enum(["full", "wide", "half", "narrow"]).default("full"),
});

export type MediaItem = z.output<typeof mediaSchema>;

/** Textos del marcador: el tipo de medio y la palabra «pendiente», por idioma. */
export const mediaLabelsSchema = z.object({
  photo: z.string(),
  video: z.string(),
  pending: z.string(),
});

export type MediaLabels = z.output<typeof mediaLabelsSchema>;
