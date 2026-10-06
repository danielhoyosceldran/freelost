import type { PageConfig } from "@/blocks/registry";
import type { Locale } from "@/content/locales";
import { projectsContent } from "@/content/projects";

// Todos los proyectos. De momento solo el naranja de la salida del carrete y la cruz para volver.
export const projects = (lang: Locale) =>
  ({
    main: [{ type: "projects", props: projectsContent(lang) }],
  }) satisfies PageConfig;
