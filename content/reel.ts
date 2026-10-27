// Proyectos del carrete: las películas reales de Guillem (public/media/videos/<carpeta>/),
// transcodificadas a films/<slug>.mp4. La portada es el fotograma a 2 s del corte de 4 s
// (-reel-4s) que acompaña a cada una. Las URLs salen de lib/media.ts: hoy public/media/web, luego
// el CDN que digan las variables de entorno.
//
// Para pasar una película a Vimeo basta con darle su id en su ficha de content/archive.ts:
// `vimeo: { vimeo: "123" }` (y `hash` si es oculta). Deja de bajarse el MP4 y la reproduce el player de Vimeo.
//
// Los títulos (en content/archive.ts) salen de los nombres de carpeta y fichero: son
// provisionales hasta que el cliente dé los títulos reales.

import type { ReelSlide } from "@/blocks/reel/slides";
import { archive, text } from "@/content/archive";
import type { Locale } from "@/content/locales";
import { imageUrl, videoUrl } from "@/lib/media";

// Ancho de la portada: la tarjeta central en un portátil retina. El proveedor lo respeta; en local
// se sirve el JPG como está (1600 px).
const COVER_W = 1600;

const film = (slug: string, caption: string, vimeo?: { vimeo: string; hash?: string }): ReelSlide => {
  const cover = imageUrl(`films/${slug}.jpg`, COVER_W);
  return vimeo
    ? { kind: "video", cover, caption, ...vimeo }
    : { kind: "film", cover, src: videoUrl(`films/${slug}.mp4`), caption };
};

// Slug y título salen del archivo (content/archive.ts), el mismo que lista la página de
// proyectos: un título se cambia en un sitio y vale para las dos.
export const reelSlides = (lang: Locale): ReelSlide[] => archive.map((p) => film(p.slug, text(p.title, lang), p.vimeo));

/** Enlace a la página de todos los proyectos (app/[lang]/projects). */
export const reelMore = (lang: Locale) => ({
  label: { en: "All projects", ca: "Tots els projectes", es: "Todos los proyectos" }[lang],
  href: `/${lang}/projects`,
});

export const reelLabels: Record<Locale, { title: string; carousel: string; project: string; close: string; of: string; drag: string }> = {
  en: { title: "Projects", carousel: "Project reel", project: "Project", close: "Leave project", of: "of", drag: "Drag" },
  ca: { title: "Projectes", carousel: "Carret de projectes", project: "Projecte", close: "Sortir del projecte", of: "de", drag: "Arrossega" },
  es: { title: "Proyectos", carousel: "Carrete de proyectos", project: "Proyecto", close: "Salir del proyecto", of: "de", drag: "Arrastra" },
};
