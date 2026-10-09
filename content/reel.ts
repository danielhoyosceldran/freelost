// Proyectos del carrete: las películas reales de Guillem (public/media/videos/<carpeta>/),
// transcodificadas a films/<slug>.mp4. La portada es el fotograma a 2 s del corte de 4 s
// (-reel-4s) que acompaña a cada una. Las URLs salen de lib/media.ts: hoy public/media/web, luego
// el CDN que digan las variables de entorno.
//
// Para pasar una película a Vimeo basta con darle su id: `film("fl1", "…", { vimeo: "123" })`
// (y `hash` si es oculta). Deja de bajarse el MP4 y la reproduce el player de Vimeo.
//
// Los títulos salen de los nombres de carpeta y fichero: son provisionales hasta que el cliente
// dé los títulos reales.

import type { ReelSlide } from "@/blocks/reel/slides";
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

// Solo se traduce lo que es palabra común; los nombres de cliente se quedan tal cual.
const words: Record<Locale, { cycling: string; summer: string }> = {
  en: { cycling: "Cycling", summer: "Summer recap" },
  ca: { cycling: "Ciclisme", summer: "Resum d’estiu" },
  es: { cycling: "Ciclismo", summer: "Resumen de verano" },
};

export const reelSlides = (lang: Locale): ReelSlide[] => {
  const w = words[lang];
  return [
    film("fl1", `${w.cycling} · FL1`),
    film("lofoten", "Lofoten"),
    film("fl3", "Ironman · FL3"),
    film("raz-camp-12", "Raz Surfcamp · Camp 12"),
    film("fl2", "CrossFit · FL2"),
    film("airtecnics", "Airtècnics"),
    film("downurban", "Down Urban"),
    film("raz-estiu", `Raz Surfcamp · ${w.summer}`),
    film("xfit", "CrossFit · xfit"),
    film("raz-camp-9", "Raz Surfcamp · Camp 9"),
    film("raz-camp-7", "Raz Surfcamp · Camp 7"),
    film("raz-camp-6", "Raz Surfcamp · Camp 6"),
  ];
};

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
