import { z } from "zod";
import { defineBlock } from "../types";
import { Contact } from "./Contact";

// Cierre de la página: titular, correo y redes. Sin formulario (PRODUCT.md: contacto solo por
// enlace de correo). Mientras no haya datos reales, los enlaces van sin `href` y no hacen nada.
export const contactSchema = z.object({
  /** id del <section>, ancla de los enlaces internos. */
  anchor: z.string().default("contacto"),
  title: z.string(),
  email: z.object({
    label: z.string(),
    /** mailto: real. Sin él, el enlace se pinta pero no lleva a ningún sitio. */
    href: z.string().optional(),
  }),
  channels: z.array(z.object({ label: z.string(), href: z.string().optional() })),
});

export type ContactProps = z.output<typeof contactSchema>;

export const contact = defineBlock({
  type: "contact",
  schema: contactSchema,
  Component: Contact,
  preload: "eager",
});
