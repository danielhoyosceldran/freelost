import { notFound } from "next/navigation";
import { PageRenderer } from "@/core/BlockRenderer";
import { home } from "@/content/pages/home";
import { isLocale } from "@/content/locales";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <PageRenderer page={home(lang)} />;
}
