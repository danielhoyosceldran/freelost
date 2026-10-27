import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageRenderer } from "@/core/BlockRenderer";
import { project } from "@/content/pages/project";
import { isLocale } from "@/content/locales";
import { projectSlugs, projectTitle } from "@/content/projects";

// Una página por ficha de content/archive.ts y por idioma (el padre da los idiomas). Cualquier
// otro slug es 404: el export estático no puede generar páginas bajo demanda.
export const dynamicParams = false;

export function generateStaticParams() {
  return projectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/projects/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  return { title: `${projectTitle(lang, slug)} — free lost` };
}

export default async function Project({ params }: PageProps<"/[lang]/projects/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang) || !projectSlugs().includes(slug)) notFound();
  return <PageRenderer page={project(lang, slug)} />;
}
