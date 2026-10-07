import type { Locale } from "@/content/locales";

// Cierre de la home, con el copy de Guillem (7/10/2026). PROVISIONAL: el correo y la URL de
// Instagram están pendientes (BACKLOG.md). Sin `href`, los enlaces se pintan pero no llevan a
// ningún sitio. Las versiones ca/es son traducción nuestra, pendiente de que él las revise.
const text: Record<Locale, { title: string; subtitle: string }> = {
  en: {
    title: "Let’s make something worth remembering.",
    subtitle: "Available for selected projects and collaborations.",
  },
  ca: {
    title: "Fem alguna cosa que valgui la pena recordar.",
    subtitle: "Disponible per a projectes i col·laboracions seleccionats.",
  },
  es: {
    title: "Hagamos algo que valga la pena recordar.",
    subtitle: "Disponible para proyectos y colaboraciones seleccionados.",
  },
};

// Guillem pide dos enlaces, Email e Instagram. El correo es la acción principal (PRODUCT.md): va
// grande con la palabra "Email", y la dirección debajo, pequeña, para quien prefiera copiarla.
// Vimeo e IMDb se quedan para el pie.
export const contactContent = (lang: Locale) => ({
  title: text[lang].title,
  subtitle: text[lang].subtitle,
  email: { label: "Email", address: "hola@freelost.com" },
  channels: [{ label: "Instagram" }],
});

export const footerContent = () => ({
  brand: "free lost",
  legal: "© 2026 Guillem Salvador",
});
