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
   * Salida: la escena dura `height` (una pantalla más el recorrido de salida). Al terminar, el
   * plano ha encogido a `scale` y está ladeado `tilt` grados: se ha desencajado.
   */
  exit: z
    .object({
      height: z.string().default("165vh"),
      scale: z.number().default(0.84),
      tilt: z.number().default(-1.5),
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
