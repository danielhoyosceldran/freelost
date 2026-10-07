import { z } from "zod";
import { defineBlock } from "../types";
import { Reel } from "./Reel";
import { slideSchema } from "./schema";

// Carrete de proyectos: el FlexCarousel de React Bits en WebGL2, en una sección de una pantalla.
// La página hace scroll normal por encima; la cinta se mueve arrastrando (con inercia y bucle).
// Al llegar, pausa y "rise"; al pulsar la tarjeta del centro, vista de proyecto.
//
// Los valores por defecto son los del panel de React Bits elegidos para la web (preset Liquid
// retocado): intro Rise, fit Natural, alto 0,5, hueco 12 px, radio 0, squeeze 0,2. Sin lente:
// la web no quiere efectos en los bordes.
export const reelSchema = z.object({
  anchor: z.string().default("proyectos"),
  slides: z.array(slideSchema).min(1),
  labels: z
    .object({
      title: z.string().default("Proyectos"),
      carousel: z.string().default("Carrete de proyectos"),
      project: z.string().default("Proyecto"),
      close: z.string().default("Salir del proyecto"),
      /** "3 de 12" en la región aria-live. */
      of: z.string().default("de"),
    })
    .prefault({}),
  /**
   * Enlace a la página de todos los proyectos, abajo a la derecha. Al pulsarlo la cinta sale
   * barriendo y un recuadro naranja crece hasta cubrir la pantalla antes de navegar.
   */
  more: z.object({ label: z.string(), href: z.string() }).optional(),
  /** Separación entre tarjetas (px). */
  gap: z.number().default(12),
  /** Proporción fija de las tarjetas; sin ella, "natural" (la de cada portada). */
  aspect: z.number().optional(),
  /** Cuánto encogen las tarjetas con la velocidad. */
  squeeze: z.number().default(0.2),
});

export type ReelProps = z.output<typeof reelSchema>;

export const reel = defineBlock({
  type: "reel",
  schema: reelSchema,
  Component: Reel,
  preload: "eager",
  // Va debajo del hero: la pantalla de carga no espera a sus portadas.
  critical: false,
  holdsBelow: true,
});
