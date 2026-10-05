import { z } from "zod";
import { gateSchema } from "@/core/scroll/schemas";
import { defineBlock } from "../types";
import { Reel } from "./Reel";
import { slideSchema } from "./schema";

// Carrete de proyectos: WebGL2 pilotado por el scroll de la página, con imán, entrada por una
// curva al llegar, vista de proyecto al pulsar la tarjeta del centro y puerta opcional al final.
export const reelSchema = z.object({
  anchor: z.string().default("proyectos"),
  /**
   * Alto del spacer. 700vh y no 400: el scroll avanza las fotos de una en una, y a 400vh cada
   * foto duraba ~1,5 muescas de rueda y se leía como un barrido; a 700vh son ~3.
   */
  height: z.string().default("700vh"),
  slides: z.array(slideSchema).min(1),
  /** Progreso a partir del cual empiezan a cargar los bloques 'onWarm' de debajo. */
  warmAt: z.number().min(0).max(1).default(0.75),
  gate: gateSchema.optional(),
  labels: z
    .object({
      title: z.string().default("Proyectos"),
      carousel: z.string().default("Carrete de fotografías"),
      project: z.string().default("Proyecto"),
      close: z.string().default("Salir del proyecto"),
      /** "3 de 22" en la región aria-live. */
      of: z.string().default("de"),
    })
    .prefault({}),
  /**
   * Lente (preset "vortex" de React Bits, retocado). width/height son fracciones del ANCHO del
   * lienzo. curl 0 = "twist": cada lateral se curva hacia su propio lado.
   */
  lens: z
    .object({
      width: z.number().default(2),
      height: z.number().default(2),
      tilt: z.number().default(-70),
      roundness: z.number().default(0),
      bend: z.number().default(0.59),
      reach: z.number().default(0.1),
      curl: z.number().default(0),
      dispersion: z.number().default(0.14),
    })
    .prefault({}),
  /** La lente se deforma con la velocidad de la cinta (muelle). */
  liquid: z.number().default(0.61),
  /** Cuánto encogen las tarjetas con la velocidad (original .2: demasiado). */
  squeeze: z.number().default(0.04),
});

export type ReelProps = z.output<typeof reelSchema>;

export const reel = defineBlock({
  type: "reel",
  schema: reelSchema,
  Component: Reel,
  preload: "eager",
  // Va debajo del hero: la pantalla de carga no espera a sus portadas, que entran con su fundido
  // mientras el visitante aún está en la película.
  critical: false,
  holdsBelow: true,
});
