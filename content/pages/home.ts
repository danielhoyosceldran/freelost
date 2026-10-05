import type { PageConfig } from "@/blocks/registry";
import { heroContent } from "@/content/hero";

// Orden de la home. Intercambiar, quitar o duplicar bloques = editar estas listas.
// v1 del rediseño: loader + hero. Los bloques de v4 (reel, gear, contact, footer) siguen en el
// registry, fuera de la página hasta que se rediseñen.
export const home = {
  before: [{ type: "loader", props: { color: "var(--color-ember)", label: "Cargando" } }],
  main: [{ type: "hero", props: heroContent }],
} satisfies PageConfig;
