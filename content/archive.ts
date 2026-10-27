// Archivo de proyectos: una ficha por película. De aquí salen el carrete de la home (título y
// slug, en content/reel.ts), la página de todos los proyectos y la vista de cada uno
// (content/projects.ts). Es el modelo del plan 010 (§1) a mano, mientras no haya panel.
//
// Solo lo que se sabe por el material: la disciplina sale de la carpeta del cliente
// (public/media/videos/<carpeta>/), y el cliente solo cuando la carpeta lo nombra. Año,
// descripción, créditos y medios quedan vacíos hasta que Guillem los dé: la página pinta el hueco
// en vez de inventar (PRODUCT.md, «Do not fabricate»).

import type { MediaItem } from "@/components/media/schema";
import type { Locale } from "@/content/locales";

export type Category = "cycling" | "triathlon" | "crossfit" | "surf" | "travel" | "corporate";

type Text = string | Record<Locale, string>;

/** Medio de la ficha, como lo escribe content/ (el `size` es opcional, como en el schema). */
export type ArchiveMedia = Omit<MediaItem, "size"> & { size?: MediaItem["size"] };

export interface ArchiveProject {
  /** Estable: es la ruta (/en/projects/<slug>) y el nombre de fichero de films/<slug>.mp4. */
  slug: string;
  title: Text;
  category: Category;
  /** Nombre propio: no se traduce. */
  client?: string;
  location?: Text;
  year?: number;
  description?: Record<Locale, string>;
  /** Solo los que Guillem confirme. */
  credits?: { role: Record<Locale, string>; name: string }[];
  /** Película en Vimeo (id y hash si es oculta): el carrete deja de bajar el MP4. */
  vimeo?: { vimeo: string; hash?: string };
  /** Portada de la vista de proyecto (primer viewport). Sin ella, su hueco 16:9. */
  cover?: ArchiveMedia;
  /** La película entera. Sin ella, su hueco 16:9. */
  film?: ArchiveMedia;
  /** Fotos y clips del rodaje, en orden de lectura. Sin ellos, la secuencia de huecos de abajo. */
  media?: ArchiveMedia[];
}

export const text = (t: Text, lang: Locale) => (typeof t === "string" ? t : t[lang]);

export const categories: Record<Locale, Record<Category, string>> = {
  en: { cycling: "Cycling", triathlon: "Triathlon", crossfit: "CrossFit", surf: "Surf", travel: "Travel", corporate: "Corporate" },
  ca: { cycling: "Ciclisme", triathlon: "Triatló", crossfit: "CrossFit", surf: "Surf", travel: "Viatges", corporate: "Corporatiu" },
  es: { cycling: "Ciclismo", triathlon: "Triatlón", crossfit: "CrossFit", surf: "Surf", travel: "Viajes", corporate: "Corporativo" },
};

/**
 * Secuencia de huecos mientras un proyecto no tenga fotos: la maqueta de la vista de proyecto
 * con las proporciones de cámara más probables (3:2 de la Sony, verticales 4:5 de Instagram, un
 * clip 16:9). Ritmo: una a sangre, un par, un clip ancho con una vertical al lado, otra a sangre.
 */
export const PLACEHOLDER_MEDIA: ArchiveMedia[] = [
  { kind: "photo", ratio: "3/2", size: "full" },
  { kind: "photo", ratio: "4/5", size: "half" },
  { kind: "photo", ratio: "4/5", size: "half" },
  { kind: "video", ratio: "16/9", size: "wide" },
  { kind: "photo", ratio: "2/3", size: "narrow" },
  { kind: "photo", ratio: "21/9", size: "full" },
];

const raz = (n: string) => `Raz Surfcamp · ${n}`;

// Orden: el del carrete. Los títulos siguen siendo provisionales (BACKLOG, «Títulos reales»).
export const archive: ArchiveProject[] = [
  { slug: "fl1", title: { en: "Cycling · FL1", ca: "Ciclisme · FL1", es: "Ciclismo · FL1" }, category: "cycling" },
  {
    slug: "lofoten",
    title: "Lofoten",
    category: "travel",
    location: { en: "Lofoten, Norway", ca: "Lofoten, Noruega", es: "Lofoten, Noruega" },
  },
  { slug: "fl3", title: "Ironman · FL3", category: "triathlon" },
  { slug: "raz-camp-12", title: raz("Camp 12"), category: "surf", client: "Raz Surfcamp" },
  { slug: "fl2", title: "CrossFit · FL2", category: "crossfit" },
  { slug: "airtecnics", title: "Airtècnics", category: "corporate", client: "Airtècnics" },
  { slug: "downurban", title: "Down Urban", category: "cycling" },
  {
    slug: "raz-estiu",
    title: {
      en: "Raz Surfcamp · Summer recap",
      ca: "Raz Surfcamp · Resum d’estiu",
      es: "Raz Surfcamp · Resumen de verano",
    },
    category: "surf",
    client: "Raz Surfcamp",
  },
  { slug: "xfit", title: "CrossFit · xfit", category: "crossfit" },
  { slug: "raz-camp-9", title: raz("Camp 9"), category: "surf", client: "Raz Surfcamp" },
  { slug: "raz-camp-7", title: raz("Camp 7"), category: "surf", client: "Raz Surfcamp" },
  { slug: "raz-camp-6", title: raz("Camp 6"), category: "surf", client: "Raz Surfcamp" },
];
