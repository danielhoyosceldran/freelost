import { z } from "zod";
import { defineBlock } from "../types";
import { Hero } from "./Hero";

// Primera pantalla: la película a sangre, la marca en el centro (en el mismo sitio que la del
// loader, que se desvanece encima) y los créditos en las esquinas. Al salir, el plano se
// desencaja (escena de scroll corta). Es `critical`: el loader
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
   * Salida, en tres tiempos sobre el progreso de la escena (que dura `height`): sostiene hasta
   * `hold`; acelera hasta `cutAt` (el plano encoge a `scale`, se ladea `tilt` grados y la
   * película baja a `slowTo`× de velocidad: cámara lenta justo antes del corte); y corta, sin
   * fundido largo, en lo que queda.
   */
  exit: z
    .object({
      height: z.string().default("190vh"),
      scale: z.number().default(0.62),
      tilt: z.number().default(-2.5),
      hold: z.number().default(0.25),
      cutAt: z.number().default(0.85),
      slowTo: z.number().default(0.6),
    })
    .prefault({}),
  labels: z.object({
    /** Texto del interruptor de sonido (aria-pressed dice si está activo). */
    sound: z.string(),
    play: z.string(),
    pause: z.string(),
  }),
});

export type HeroProps = z.output<typeof heroSchema>;

export const hero = defineBlock({
  type: "hero",
  schema: heroSchema,
  Component: Hero,
  preload: "eager",
  critical: true,
});
