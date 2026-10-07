import { z } from "zod";
import { defineBlock } from "../types";
import { Slogan } from "./Slogan";

// El eslogan, a solas en una escena casi vacía. Guillem lo quiere discreto, con mucho aire y más
// adelante en el scroll, casi como si el visitante lo descubriera: no es un titular.
export const sloganSchema = z.object({
  text: z.string(),
  /** Idioma del eslogan si no es el de la página (es inglés también en es/ca). */
  lang: z.string().optional(),
  /** Alto de la escena: cuánto scroll de silencio la rodea. */
  height: z.string().default("180vh"),
});

export type SloganProps = z.output<typeof sloganSchema>;

export const slogan = defineBlock({
  type: "slogan",
  schema: sloganSchema,
  Component: Slogan,
  preload: "eager",
});
