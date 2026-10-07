import { z } from "zod";
import { defineBlock } from "../types";
import { About } from "./About";

// Quién hace las películas y por qué, con el texto de Guillem. Entradilla sola en su pantalla,
// cuerpo en una columna desplazada, frase de cierre con aire y, separado y pequeño, el crédito.
export const aboutSchema = z.object({
  /** id del <section>, ancla de los enlaces internos. */
  anchor: z.string().default("about"),
  title: z.string(),
  lead: z.string(),
  body: z.array(z.string()).min(1),
  closing: z.string(),
  /** Quién lleva el estudio: más pequeño y separado del resto. */
  credit: z.string(),
});

export type AboutProps = z.output<typeof aboutSchema>;

export const about = defineBlock({
  type: "about",
  schema: aboutSchema,
  Component: About,
  preload: "eager",
});
