import type { Locale } from "@/content/locales";

// El eslogan oficial (Guillem, 7/10/2026). Va en inglés en los tres idiomas; en las páginas que no
// lo son hay que marcarlo con lang="en" para que los lectores de pantalla lo pronuncien bien.
export const SLOGAN = "Feel free to get lost.";
export const sloganLang = (lang: Locale) => (lang === "en" ? undefined : "en");
