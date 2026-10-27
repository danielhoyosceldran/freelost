import { z } from "zod";
import { defineBlock } from "../types";
import { Hero } from "./Hero";

// Primera pantalla: cartón de título con el rótulo sobre la película (la marca del
// loader vuela a la esquina) y los créditos abajo. Al salir, la interfaz se va, el rótulo se abre
// por la costura y la película encoge a 70vh y sube con el scroll. El eslogan no está aquí: cierra
// la página en la misión. Es `critical`: el loader espera a que el vídeo tenga búfer suficiente
// para arrancar sin cortes.
/** Una palabra dibujada (content/words.ts): una `d` por letra, de izquierda a derecha. */
const wordArt = z.object({
  text: z.string(),
  letters: z.array(z.string()).min(1),
  box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  baseline: z.number(),
  capTop: z.number(),
});

export const heroSchema = z.object({
  studio: z.string(),
  /** El rótulo dibujado, una palabra por línea. `studio` es su texto para lectores de pantalla. */
  studioArt: z.array(wordArt).min(1),
  name: z.string(),
  role: z.string(),
  film: z.object({
    /** Descripción para lectores de pantalla. */
    label: z.string(),
    poster: z.string(),
    /** En orden: el navegador usa la primera cuyo `media` encaje. */
    sources: z.array(z.object({ src: z.string(), media: z.string().optional() })).min(1),
    /**
     * Película en Vimeo, sin su interfaz: si está, se usa en lugar de `sources` y los botones del
     * hero la controlan por su API. `id` es el numérico; `hash`, el h= de los vídeos ocultos.
     */
    vimeo: z.object({ id: z.string().regex(/^\d+$/), hash: z.string().optional() }).optional(),
  }),
  /**
   * Salida, sobre el progreso de la escena (que dura `height`): se van los créditos y el rótulo, y
   * la película encoge a 70vh y luego sube con el scroll hasta dejar la tinta. Mientras encoge baja
   * a `slowTo`× de velocidad.
   */
  exit: z
    .object({
      height: z.string().default("280vh"),
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
    /** Pista de scroll, abajo a la derecha. Decorativa: los lectores de pantalla no la leen. */
    scroll: z.string(),
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
