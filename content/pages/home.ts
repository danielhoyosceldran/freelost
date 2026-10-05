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
    // Una pantalla; la cinta se arrastra. Lente y física en los defaults del bloque.
    { type: "reel", props: { slides: reelSlides } },
    { type: "gear", props: gearContent },
    { type: "contact", props: contactContent },
  ],
  after: [{ type: "footer", props: footerContent }],
} satisfies PageConfig;
