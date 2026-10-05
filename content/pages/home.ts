import type { PageConfig } from "@/blocks/registry";
import { gearContent } from "@/content/gear";
import { heroContent } from "@/content/hero";
import { reelSlides } from "@/content/reel";

// Orden de la home. Intercambiar, quitar o duplicar bloques = editar estas listas.
// Rediseño: loader → hero → proyectos (carrete) → lo que uso (3D). contact y footer siguen en el
// registry, fuera de la página hasta que se rediseñen.
export const home = {
  before: [{ type: "loader", props: { color: "var(--color-ember)", label: "Cargando" } }],
  main: [
    { type: "hero", props: heroContent },
    // ~30vh de scroll por proyecto (una pantalla de margen): 12 → 440vh. Sin puerta al final.
    { type: "reel", props: { slides: reelSlides, height: "440vh" } },
    { type: "gear", props: gearContent },
  ],
} satisfies PageConfig;
