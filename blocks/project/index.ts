import { z } from "zod";
import { mediaLabelsSchema, mediaSchema } from "@/components/media/schema";
import { defineBlock } from "../types";
import { Project } from "./Project";

// Vista de un proyecto del archivo (/[lang]/projects/[slug]). Plantilla única: portada a sangre
// con el título, ficha y texto, la película, la secuencia de fotos y clips, créditos y el
// siguiente proyecto. Lo que falte en content/archive.ts sale como hueco, nunca inventado.
export const projectSchema = z.object({
  back: z.object({ label: z.string(), href: z.string() }),
  /** «03 de 12». */
  counter: z.string(),
  title: z.string(),
  meta: z.array(z.object({ label: z.string(), value: z.string() })),
  description: z.string().optional(),
  /** Lo que se lee en el sitio del texto mientras no lo haya. */
  pending: z.string(),
  cover: mediaSchema,
  film: mediaSchema,
  media: z.array(mediaSchema),
  credits: z
    .object({ title: z.string(), items: z.array(z.object({ role: z.string(), name: z.string() })).min(1) })
    .optional(),
  next: z.object({ label: z.string(), title: z.string(), href: z.string() }),
  mediaLabels: mediaLabelsSchema,
});

export type ProjectProps = z.output<typeof projectSchema>;

export const project = defineBlock({
  type: "project",
  schema: projectSchema,
  Component: Project,
  preload: "eager",
});
