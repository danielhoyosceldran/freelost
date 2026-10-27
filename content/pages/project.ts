import type { PageConfig } from "@/blocks/registry";
import type { Locale } from "@/content/locales";
import { projectContent } from "@/content/projects";

// Vista de un proyecto del archivo: un solo bloque, sin loader (se llega desde el índice).
export const project = (lang: Locale, slug: string) =>
  ({
    main: [{ type: "project", props: projectContent(lang, slug) }],
  }) satisfies PageConfig;
