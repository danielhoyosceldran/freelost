import { z } from "zod";
import { defineBlock } from "../types";
import { Projects } from "./Projects";

// Todos los proyectos. De momento solo el naranja en el que acaba la salida del carrete y la
// cruz para volver, que la deshace.
export const projectsSchema = z.object({
  back: z.object({ label: z.string(), href: z.string() }),
});

export type ProjectsProps = z.output<typeof projectsSchema>;

export const projects = defineBlock({
  type: "projects",
  schema: projectsSchema,
  Component: Projects,
  preload: "eager",
});
