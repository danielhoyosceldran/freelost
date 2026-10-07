import { z } from "zod";
import { defineBlock } from "../types";
import { Hero } from "./Hero";

// Primera pantalla: cartón de título con el rótulo sobre la película (la marca del
// loader vuela a la esquina) y los créditos abajo. Al salir, la interfaz se va, la película se
// queda, y el eslogan aparece en el centro y crece hasta ser la ventana por la que se ve la
// película. Es `critical`: el loader espera a que el vídeo tenga búfer suficiente para arrancar
// sin cortes.
export const heroSchema = z.object({
  studio: z.string(),
  name: z.string(),
  role: z.string(),
  /**
   * El eslogan de la salida. Va dentro del hero y no en un bloque propio porque es la máscara de
   * esta película: los bloques no comparten nodos.
   */
  slogan: z.object({
    text: z.string(),
    /** Idioma del eslogan si no es el de la página (es inglés también en es/ca). */
    lang: z.string().optional(),
  }),
  film: z.object({
    /** Descripción para lectores de pantalla. */
    label: z.string(),
    poster: z.string(),
    /** En orden: el navegador usa la primera cuyo `media` encaje. */
    sources: z.array(z.object({ src: z.string(), media: z.string().optional() })).min(1),
  }),
  /**
   * Salida, sobre el progreso de la escena (que dura `height`): se van los créditos y la marca,
   * el plano no se mueve. El eslogan aparece en el centro a `from` del ancho que cabe en pantalla
   * y crece hasta `to`; mientras crece, lo de fuera de las letras pasa a tinta y la película solo
   * se ve a través de ellas. La película baja a `slowTo`× de velocidad mientras crece.
   */
  exit: z
    .object({
      height: z.string().default("320vh"),
      from: z.number().default(0.42),
      to: z.number().default(0.94),
      slowTo: z.number().default(0.6),
    })
    .prefault({}),
  labels: z.object({
    /** Texto del interruptor de sonido (aria-pressed dice si está activo). */
    sound: z.string(),
    play: z.string(),
    pause: z.string(),
    /** Nombre accesible del grupo de idiomas. */
    language: z.string(),
  }),
  /** Selector de idioma: una ruta estática por idioma, en el orden en que se pintan. */
  languages: z
    .array(z.object({ code: z.string(), label: z.string(), href: z.string(), current: z.boolean() }))
    .min(1),
});

export type HeroProps = z.output<typeof heroSchema>;

export const hero = defineBlock({
  type: "hero",
  schema: heroSchema,
  Component: Hero,
  preload: "eager",
  critical: true,
});
