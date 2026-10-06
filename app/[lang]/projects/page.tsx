import { notFound } from "next/navigation";
import { PageRenderer } from "@/core/BlockRenderer";
import { projects } from "@/content/pages/projects";
import { isLocale } from "@/content/locales";

export default async function Projects({ params }: PageProps<"/[lang]/projects">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <PageRenderer page={projects(lang)} />;
}
