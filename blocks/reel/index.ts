import { z } from "zod";
import { defineBlock } from "../types";
import { Reel } from "./Reel";
import { slideSchema } from "./schema";

// Carrete de proyectos: el FlexCarousel de React Bits en WebGL2, en una sección de una pantalla.
// La página hace scroll normal por encima; la cinta se mueve arrastrando (con inercia y bucle).
// Al llegar, pausa y "rise"; al pulsar la tarjeta del centro, vista de proyecto.
//
// Los valores por defecto son los del panel de React Bits elegidos para la web (preset Liquid
// retocado): intro Rise, fit Natural, alto 0,5, hueco 12 px, radio 0, lente 0,74 × 1,18 a 65°,
// redondez 1, bend 0,34, reach 0,38, curl Twist, dispersión 0,45, liquid 0, squeeze 0,2.
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
  /**
   * Lente de los bordes. width/height son fracciones del ANCHO del lienzo; curl 0 = "twist":
   * cada lateral se curva hacia su propio lado. Solo en ordenador (puntero fino).
   */
  lens: z
    .object({
      width: z.number().default(0.74),
      height: z.number().default(1.18),
      tilt: z.number().default(65),
      roundness: z.number().default(1),
      bend: z.number().default(0.34),
      reach: z.number().default(0.38),
      curl: z.number().default(0),
      dispersion: z.number().default(0.45),
    })
    .prefault({}),
  /** La lente se deforma con la velocidad de la cinta (muelle). */
  liquid: z.number().default(0),
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
