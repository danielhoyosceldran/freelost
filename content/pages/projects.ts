import type { PageConfig } from "@/blocks/registry";
import type { Locale } from "@/content/locales";
import { projectsContent } from "@/content/projects";

// Todos los proyectos: el índice del archivo sobre el naranja de la salida del carrete.
export const projects = (lang: Locale) =>
  ({
    main: [{ type: "projects", props: projectsContent(lang) }],
  }) satisfies PageConfig;
