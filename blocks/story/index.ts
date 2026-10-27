import { z } from "zod";
import { defineBlock } from "../types";
import { Story } from "./Story";

// El manifiesto del estudio: una pregunta grande que se enciende palabra a palabra con el scroll,
// fija a la izquierda, mientras a la derecha pasan los apartados (origen, propósito, elección).
export const storySchema = z.object({
  /** id del <section>, ancla de los enlaces internos y del indicador de capítulos. */
  anchor: z.string().default("story"),
  title: z.string(),
  question: z.string(),
  parts: z.array(z.object({ heading: z.string(), text: z.string() })).min(1),
});

export type StoryProps = z.output<typeof storySchema>;

export const story = defineBlock({
  type: "story",
  schema: storySchema,
  Component: Story,
  preload: "eager",
});
