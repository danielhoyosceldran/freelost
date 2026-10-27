import { z } from "zod";
import { mediaLabelsSchema, mediaSchema } from "@/components/media/schema";
import { defineBlock } from "../types";
import { Projects } from "./Projects";

// Todos los proyectos: el naranja en el que acaba la salida del carrete, con el índice del
// archivo encima, y la cruz para volver, que deshace la salida.
export const projectsSchema = z.object({
  back: z.object({ label: z.string(), href: z.string() }),
  title: z.string(),
  count: z.string(),
  /** Cabecera de la tabla: «Proyecto» y una etiqueta por columna de `cells`. */
  head: z.array(z.string()).min(1),
  rows: z.array(
    z.object({
      href: z.string(),
      title: z.string(),
      cells: z.array(z.string()),
      /** La vista previa que sigue al puntero (solo puntero fino). */
      cover: mediaSchema,
    }),
  ),
  mediaLabels: mediaLabelsSchema,
});

export type ProjectsProps = z.output<typeof projectsSchema>;

export const projects = defineBlock({
  type: "projects",
  schema: projectsSchema,
  Component: Projects,
  preload: "eager",
});
