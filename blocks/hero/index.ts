import { z } from "zod";
import { defineBlock } from "../types";
import { Hero } from "./Hero";

// Primera pantalla: cartón de título con el rótulo y el eslogan sobre la película (la marca del
// loader vuela a la esquina) y los créditos abajo. Al salir, el plano encoge a 80vh
// (escena de scroll corta). Es `critical`: el loader
// espera a que el vídeo tenga búfer suficiente para arrancar sin cortes.
export const heroSchema = z.object({
  studio: z.string(),
  name: z.string(),
  role: z.string(),
  slogan: z.string(),
  /** Idioma del eslogan si no es el de la página (es inglés también en es/ca). */
  sloganLang: z.string().optional(),
  film: z.object({
    /** Descripción para lectores de pantalla. */
    label: z.string(),
    poster: z.string(),
    /** En orden: el navegador usa la primera cuyo `media` encaje. */
    sources: z.array(z.object({ src: z.string(), media: z.string().optional() })).min(1),
  }),
  /**
   * Salida, sobre el progreso de la escena (que dura `height`): sostiene hasta `hold` y después el
   * plano encoge, sin borde ni fundido, hasta `scale` del alto de pantalla (0,8 = 80vh). Encoge
   * hacia su pie, así queda pegado al carrete que viene debajo. La película baja a `slowTo`× de
   * velocidad mientras encoge.
   */
  exit: z
    .object({
      height: z.string().default("160vh"),
      scale: z.number().default(0.8),
      hold: z.number().default(0.2),
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
