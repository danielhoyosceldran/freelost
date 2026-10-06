import type { Locale } from "@/content/locales";

// Copy de la página de todos los proyectos. La cruz vuelve a la home del mismo idioma.
const back: Record<Locale, string> = { en: "Back", ca: "Tornar", es: "Volver" };

export const projectsContent = (lang: Locale) => ({ back: { label: back[lang], href: `/${lang}` } });
