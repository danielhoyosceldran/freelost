import { z } from "zod";
import { defineBlock } from "../types";
import { Mission } from "./Mission";

// El cierre antes del contacto: una frase y el eslogan, que aquí es una cita en la voz del texto.
// Escena fijada: la frase sube por su máscara, las dos líneas de la cita suben detrás y pasan de
// papel apagado a papel entero. Es el único sitio de la home donde está el eslogan.
export const missionSchema = z.object({
  /** id de la escena, ancla de los enlaces internos y del indicador de capítulos. */
  anchor: z.string().default("mission"),
  /** Solo para lectores de pantalla: el título visible es la propia frase. */
  title: z.string(),
  statement: z.string(),
  slogan: z.object({
    /** Idioma del eslogan si no es el de la página (es inglés también en es/ca). */
    lang: z.string().optional(),
    /** La cita en líneas: cada una sube por su máscara. Las comillas las pone el CSS. */
    lines: z.array(z.string()).min(1),
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
