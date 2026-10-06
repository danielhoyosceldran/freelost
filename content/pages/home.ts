import type { PageConfig } from "@/blocks/registry";
import { contactContent, footerContent } from "@/content/contact";
import { gearContent } from "@/content/gear";
import { heroContent } from "@/content/hero";
import type { Locale } from "@/content/locales";
import { reelLabels, reelMore, reelSlides } from "@/content/reel";

const loading: Record<Locale, string> = { en: "Loading", ca: "Carregant", es: "Cargando" };

// Orden de la home. Intercambiar, quitar o duplicar bloques = editar estas listas.
// loader → hero → proyectos (carrete) → lo que uso (3D) → contacto → pie.
export const home = (lang: Locale) =>
  ({
    before: [{ type: "loader", props: { color: "var(--color-ember)", label: loading[lang] } }],
    main: [
      { type: "hero", props: heroContent(lang) },
      // Una pantalla; la cinta se arrastra. Lente y física en los defaults del bloque.
      { type: "reel", props: { slides: reelSlides(lang), labels: reelLabels[lang], more: reelMore(lang) } },
      { type: "gear", props: gearContent(lang) },
      { type: "contact", props: contactContent(lang) },
    ],
    after: [{ type: "footer", props: footerContent(lang) }],
  }) satisfies PageConfig;
