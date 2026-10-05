// Proyectos del carrete: las películas reales de Guillem (public/media/videos/<carpeta>/),
// transcodificadas a public/media/web/films/<slug>.mp4. La portada es el fotograma a 2 s del
// corte de 4 s (-reel-4s) que acompaña a cada una. En local por ahora; más adelante, Vimeo.
//
// Los títulos salen de los nombres de carpeta y fichero: son provisionales hasta que el cliente
// dé los títulos reales.

import type { ReelSlide } from "@/blocks/reel/slides";

const film = (slug: string, caption: string): ReelSlide => ({
  kind: "film",
  cover: `/media/web/films/${slug}.jpg`,
  src: `/media/web/films/${slug}.mp4`,
  caption,
});

export const reelSlides: ReelSlide[] = [
  film("fl1", "Ciclismo · FL1"),
  film("lofoten", "Lofoten"),
  film("fl3", "Ironman · FL3"),
  film("raz-camp-12", "Raz Surfcamp · Camp 12"),
  film("fl2", "CrossFit · FL2"),
  film("airtecnics", "Airtècnics"),
  film("downurban", "Down Urban"),
  film("raz-estiu", "Raz Surfcamp · Resum d’estiu"),
  film("xfit", "CrossFit · xfit"),
  film("raz-camp-9", "Raz Surfcamp · Camp 9"),
  film("raz-camp-7", "Raz Surfcamp · Camp 7"),
  film("raz-camp-6", "Raz Surfcamp · Camp 6"),
];
