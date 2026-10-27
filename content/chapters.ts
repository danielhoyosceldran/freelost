import type { Locale } from "@/content/locales";

// Capítulos de la home, para el indicador de dónde estás (components/ui/PageProgress). `anchor` es
// el id del <section> de cada bloque (los de content/*.ts); sin él, el capítulo empieza arriba del
// todo (el hero no lleva id). Si un ancla no está en la página (la vista de proyectos, por ejemplo),
// ese capítulo no se pinta; con menos de dos, el indicador no sale. Sin zod: lo importa el cliente.
export type Chapter = { anchor?: string; label: string };

const labels: Record<Locale, Record<string, string>> = {
  en: { top: "Start", proyectos: "Projects", story: "Story", fragments: "Fragments", about: "About", mission: "Mission", contacto: "Contact" },
  ca: { top: "Inici", proyectos: "Projectes", story: "Història", fragments: "Fragments", about: "Qui som", mission: "Missió", contacto: "Contacte" },
  es: { top: "Inicio", proyectos: "Proyectos", story: "Historia", fragments: "Fragmentos", about: "Quiénes somos", mission: "Misión", contacto: "Contacto" },
};

const ORDER = ["top", "proyectos", "story", "fragments", "about", "mission", "contacto"] as const;

export const chapters = (lang: Locale): Chapter[] =>
  ORDER.map((key) => ({ ...(key !== "top" && { anchor: key }), label: labels[lang][key] }));

/** Texto del botón del índice y su lista, para lectores de pantalla. */
export const chapterLabels: Record<Locale, { index: string; current: string }> = {
  en: { index: "Sections", current: "Current section" },
  ca: { index: "Seccions", current: "Secció actual" },
  es: { index: "Secciones", current: "Sección actual" },
};
