import type { PageConfig } from "@/blocks/registry";
import { aboutContent } from "@/content/about";
import { contactContent, footerContent } from "@/content/contact";
import { gearContent } from "@/content/gear";
import { heroContent } from "@/content/hero";
import type { Locale } from "@/content/locales";
import { reelLabels, reelMore, reelSlides } from "@/content/reel";

const loading: Record<Locale, string> = { en: "Loading", ca: "Carregant", es: "Cargando" };

// Orden de la home. Intercambiar, quitar o duplicar bloques = editar estas listas.
// loader → hero (con el eslogan en su salida) → proyectos (carrete) → lo que uso (3D) → about →
// contacto → pie.
// "Lo que uso" va pegado al carrete: su escenario baja encima de él mientras sigue clavado
// (ENTRY_VH en blocks/gear/Gear.tsx), así que nada puede ir entre los dos.
export const home = (lang: Locale) =>
  ({
    before: [{ type: "loader", props: { color: "var(--color-ember)", label: loading[lang] } }],
    main: [
      { type: "hero", props: heroContent(lang) },
      // Una pantalla; la cinta se arrastra. Lente y física en los defaults del bloque.
      { type: "reel", props: { slides: reelSlides(lang), labels: reelLabels[lang], more: reelMore(lang) } },
      { type: "gear", props: gearContent(lang) },
      // Quién hace las películas y por qué.
      { type: "about", props: aboutContent(lang) },
      { type: "contact", props: contactContent(lang) },
    ],
    after: [{ type: "footer", props: footerContent() }],
  }) satisfies PageConfig;
