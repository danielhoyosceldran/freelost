import type { PageConfig } from "@/blocks/registry";
import { aboutContent } from "@/content/about";
import { contactContent, footerContent } from "@/content/contact";
import { fragmentsContent } from "@/content/fragments";
import { heroContent } from "@/content/hero";
import type { Locale } from "@/content/locales";
import { missionContent } from "@/content/mission";
import { reelLabels, reelMore, reelSlides } from "@/content/reel";
import { storyContent } from "@/content/story";

const loading: Record<Locale, string> = { en: "Loading", ca: "Carregant", es: "Cargando" };

// Orden de la home. Intercambiar, quitar o duplicar bloques = editar estas listas.
// loader → hero → proyectos (carrete) → historia → fragmentos →
// about → misión (el eslogan, citado, de cierre) → contacto → pie. Texto e imagen se alternan.
// Los capítulos del indicador (content/chapters.ts) siguen este orden: si cambia, cambiarlos también.
export const home = (lang: Locale) =>
  ({
    before: [{ type: "loader", props: { color: "var(--color-ember)", label: loading[lang] } }],
    main: [
      { type: "hero", props: heroContent(lang) },
      // Una pantalla; la cinta se arrastra. Lente y física en los defaults del bloque.
      { type: "reel", props: { slides: reelSlides(lang), labels: reelLabels[lang], more: reelMore(lang) } },
      // Por qué existe el estudio: la pregunta y sus tres apartados.
      { type: "story", props: storyContent(lang) },
      // Fotos fijas de Guillem, entre los dos bloques de texto.
      { type: "fragments", props: fragmentsContent(lang) },
      // Quién hace las películas y por qué.
      { type: "about", props: aboutContent(lang) },
      // La frase y el eslogan, como cita, antes del contacto.
      { type: "mission", props: missionContent(lang) },
      { type: "contact", props: contactContent(lang) },
    ],
    after: [{ type: "footer", props: footerContent() }],
  }) satisfies PageConfig;
