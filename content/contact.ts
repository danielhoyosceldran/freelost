import type { Locale } from "@/content/locales";

// Cierre de la home. PROVISIONAL: el correo y las redes reales están pendientes (BACKLOG.md).
// Sin `href`, los enlaces se pintan pero no llevan a ningún sitio.
const title: Record<Locale, string> = {
  en: "Let’s talk about your next shoot",
  ca: "Parlem del teu proper rodatge",
  es: "Hablemos de tu próximo rodaje",
};

export const contactContent = (lang: Locale) => ({
  title: title[lang],
  email: { label: "hola@freelost.com" },
  channels: [{ label: "Instagram" }, { label: "Vimeo" }],
});

export const footerContent = (lang: Locale) => ({
  brand: "free lost",
  legal: "© 2026 Guillem Salvador",
  slogan: "Feel free to get lost.",
  sloganLang: lang === "en" ? undefined : "en",
});
