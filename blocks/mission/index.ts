import { z } from "zod";
import { defineBlock } from "../types";
import { Mission } from "./Mission";

/** Una palabra del eslogan ya colocada: sus letras y su desplazamiento en las unidades del SVG. */
const placedWord = z.object({ letters: z.array(z.string()).min(1), x: z.number(), y: z.number() });

// El cierre antes del contacto: una frase y el eslogan dibujado a todo lo ancho. Escena fijada:
// la frase sube por su máscara, las dos líneas del eslogan suben detrás y sus letras pasan de
// contorno a papel lleno. Es el eco de la salida del hero: la página acaba con lo que empezó.
export const missionSchema = z.object({
  /** id de la escena, ancla de los enlaces internos y del indicador de capítulos. */
  anchor: z.string().default("mission"),
  /** Solo para lectores de pantalla: el título visible es la propia frase. */
  title: z.string(),
  statement: z.string(),
  slogan: z.object({
    text: z.string(),
    /** Idioma del eslogan si no es el de la página (es inglés también en es/ca). */
    lang: z.string().optional(),
    /** Cada línea es su propio <svg>: caja [x, y, ancho, alto], palabras y aire sobre ella. */
    lines: z
      .array(
        z.object({
          box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
          words: z.array(placedWord).min(1),
          gap: z.number(),
        }),
      )
      .min(1),
  }),
  /** Alto de la escena: cuánto scroll dura el cierre. */
  height: z.string().default("220svh"),
});

export type MissionProps = z.output<typeof missionSchema>;

export const mission = defineBlock({
  type: "mission",
  schema: missionSchema,
  Component: Mission,
  preload: "eager",
});
