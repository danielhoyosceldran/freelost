import { z } from "zod";
import { defineBlock } from "../types";
import { Fragments } from "./Fragments";

// Fotos fijas de Guillem: una hoja de contactos desordenada a propósito, con anchos y desfases que
// se repiten cada nueve fotos. Cada una se revela al entrar, tiene un parallax leve dentro de su
// marco y se abre en grande a pantalla completa (flechas, Esc).
export const fragmentsSchema = z.object({
  /** id del <section>, ancla de los enlaces internos y del indicador de capítulos. */
  anchor: z.string().default("fragments"),
  title: z.string(),
  intro: z.string().optional(),
  photos: z
    .array(
      z.object({
        /** URL ya resuelta por lib/media.ts. */
        src: z.string(),
        /** Proporción "ancho/alto" del original, para reservar el hueco antes de cargar. */
        ratio: z.string().regex(/^\d+(\.\d+)?\/\d+(\.\d+)?$/),
        caption: z.string(),
        alt: z.string(),
      }),
    )
    .min(1),
  labels: z.object({
    open: z.string(),
    close: z.string(),
    prev: z.string(),
    next: z.string(),
    /** "3 of 9": la palabra del medio. */
    of: z.string(),
  }),
});

export type FragmentsProps = z.output<typeof fragmentsSchema>;

export const fragments = defineBlock({
  type: "fragments",
  schema: fragmentsSchema,
  Component: Fragments,
  preload: "onVisible",
});
