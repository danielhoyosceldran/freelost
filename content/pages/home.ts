import type { PageConfig } from "@/blocks/registry";
import { contactContent, footerContent } from "@/content/contact";
import { gearContent } from "@/content/gear";
import { heroContent } from "@/content/hero";
import { reelSlides } from "@/content/reel";

// Orden de la home. Intercambiar, quitar o duplicar bloques = editar estas listas.
// loader → hero → proyectos (carrete) → lo que uso (3D) → contacto → pie.
export const home = {
  before: [{ type: "loader", props: { color: "var(--color-ember)", label: "Cargando" } }],
  main: [
    { type: "hero", props: heroContent },
    // ~30vh de scroll por proyecto (una pantalla de margen): 12 → 440vh. Sin puerta al final.
    { type: "reel", props: { slides: reelSlides, height: "440vh" } },
    { type: "gear", props: gearContent },
    { type: "contact", props: contactContent },
  ],
  after: [{ type: "footer", props: footerContent }],
} satisfies PageConfig;
