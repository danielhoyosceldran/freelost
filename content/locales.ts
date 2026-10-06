// Idiomas del sitio. El orden es el del selector (inglés, catalán, castellano). Sin zod: lo
// importan módulos de cliente. El primero es el de la raíz (`/` redirige a él).
export const locales = ["en", "ca", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Texto del selector: cada idioma en su propio idioma, y el código para la ruta. */
export const localeNames: Record<Locale, string> = { en: "EN", ca: "CA", es: "ES" };

export const isLocale = (v: string): v is Locale => (locales as readonly string[]).includes(v);
