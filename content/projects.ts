import { archive, categories, PLACEHOLDER_MEDIA, text, type ArchiveProject } from "@/content/archive";
import type { Locale } from "@/content/locales";

// Copy de la página de todos los proyectos y de la vista de cada uno. Los datos de cada ficha
// están en content/archive.ts; aquí solo se traducen y se colocan.

const copy = {
  en: {
    back: "Back",
    title: "All projects",
    count: (n: number) => `${n} projects`,
    project: "Project",
    columns: { category: "Discipline", client: "Client", location: "Location", year: "Year" },
    media: { photo: "Photo", video: "Video", pending: "pending" },
    allProjects: "All projects",
    next: "Next project",
    of: "of",
    pending: "Project text pending.",
    credits: "Credits",
  },
  ca: {
    back: "Tornar",
    title: "Tots els projectes",
    count: (n: number) => `${n} projectes`,
    project: "Projecte",
    columns: { category: "Disciplina", client: "Client", location: "Lloc", year: "Any" },
    media: { photo: "Foto", video: "Vídeo", pending: "pendent" },
    allProjects: "Tots els projectes",
    next: "Següent projecte",
    of: "de",
    pending: "Text del projecte pendent.",
    credits: "Crèdits",
  },
  es: {
    back: "Volver",
    title: "Todos los proyectos",
    count: (n: number) => `${n} proyectos`,
    project: "Proyecto",
    columns: { category: "Disciplina", client: "Cliente", location: "Lugar", year: "Año" },
    media: { photo: "Foto", video: "Vídeo", pending: "pendiente" },
    allProjects: "Todos los proyectos",
    next: "Siguiente proyecto",
    of: "de",
    pending: "Texto del proyecto pendiente.",
    credits: "Créditos",
  },
} satisfies Record<Locale, unknown>;

type Column = keyof (typeof copy)["en"]["columns"];

/** Valor de una columna de la ficha, ya en su idioma; vacío si no se sabe. */
function cell(p: ArchiveProject, key: Column, lang: Locale) {
  if (key === "category") return categories[lang][p.category];
  if (key === "client") return p.client ?? "";
  if (key === "location") return p.location ? text(p.location, lang) : "";
  return p.year ? String(p.year) : "";
}

const COVER = { kind: "photo", ratio: "16/9" } as const;
const FILM = { kind: "video", ratio: "16/9" } as const;

const indexHref = (lang: Locale) => `/${lang}/projects`;
export const projectHref = (lang: Locale, slug: string) => `${indexHref(lang)}/${slug}`;

export const projectSlugs = () => archive.map((p) => p.slug);

/** Página de todos los proyectos. La cruz vuelve a la home del mismo idioma. */
export const projectsContent = (lang: Locale) => {
  const t = copy[lang];
  // Una columna sale solo si alguna ficha la tiene: mientras no haya años, no hay columna de
  // guiones. Al rellenar el archivo aparecen solas.
  const columns = (Object.keys(t.columns) as Column[]).filter((key) => archive.some((p) => cell(p, key, lang)));
  return {
    back: { label: t.back, href: `/${lang}` },
    title: t.title,
    count: t.count(archive.length),
    head: [t.project, ...columns.map((key) => t.columns[key])],
    rows: archive.map((p) => ({
      href: projectHref(lang, p.slug),
      title: text(p.title, lang),
      cells: columns.map((key) => cell(p, key, lang)),
      cover: p.cover ?? COVER,
    })),
    mediaLabels: t.media,
  };
};

/** Vista de un proyecto. `slug` viene de projectSlugs(), así que siempre existe. */
export const projectContent = (lang: Locale, slug: string) => {
  const t = copy[lang];
  const i = archive.findIndex((p) => p.slug === slug);
  const p = archive[i];
  const next = archive[(i + 1) % archive.length];
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    back: { label: t.allProjects, href: indexHref(lang) },
    counter: `${pad(i + 1)} ${t.of} ${pad(archive.length)}`,
    title: text(p.title, lang),
    meta: (Object.keys(t.columns) as Column[])
      .map((key) => ({ label: t.columns[key], value: cell(p, key, lang) }))
      .filter((m) => m.value),
    description: p.description?.[lang],
    pending: t.pending,
    cover: p.cover ?? COVER,
    film: p.film ?? FILM,
    media: p.media ?? PLACEHOLDER_MEDIA,
    credits: p.credits?.length
      ? { title: t.credits, items: p.credits.map((c) => ({ role: c.role[lang], name: c.name })) }
      : undefined,
    next: { label: t.next, title: text(next.title, lang), href: projectHref(lang, next.slug) },
    mediaLabels: t.media,
  };
};

/** Título de la pestaña de un proyecto. */
export const projectTitle = (lang: Locale, slug: string) => {
  const p = archive.find((x) => x.slug === slug);
  return p ? text(p.title, lang) : "";
};
