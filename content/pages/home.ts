import type { PageConfig } from "@/blocks/registry";
import { aboutContent } from "@/content/about";
import { contactContent, footerContent } from "@/content/contact";
import { heroContent } from "@/content/hero";
import type { Locale } from "@/content/locales";
import { reelLabels, reelMore, reelSlides } from "@/content/reel";

const loading: Record<Locale, string> = { en: "Loading", ca: "Carregant", es: "Cargando" };

// Orden de la home. Intercambiar, quitar o duplicar bloques = editar estas listas.
// loader → hero (con el eslogan en su salida) → proyectos (carrete) → about → contacto → pie.
export const home = (lang: Locale) =>
  ({
    before: [{ type: "loader", props: { color: "var(--color-ember)", label: loading[lang] } }],
    main: [
      { type: "hero", props: heroContent(lang) },
      // Una pantalla; la cinta se arrastra. Lente y física en los defaults del bloque.
      { type: "reel", props: { slides: reelSlides(lang), labels: reelLabels[lang], more: reelMore(lang) } },
      // Quién hace las películas y por qué.
      { type: "about", props: aboutContent(lang) },
      { type: "contact", props: contactContent(lang) },
    ],
    after: [{ type: "footer", props: footerContent() }],
  }) satisfies PageConfig;
