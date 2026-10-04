import { z } from "zod";
import { defineBlock } from "../types";
import { Contact } from "./Contact";

const field = z.object({ label: z.string(), placeholder: z.string() });

export const contactSchema = z.object({
  /** id del <section>, ancla de los enlaces internos. */
  anchor: z.string().default("contacto"),
  eyebrow: z.string(),
  title: z.string(),
  /** Parte del título en cursiva serif dorada, tras `title`. */
  titleAccent: z.string(),
  lead: z.string(),
  fields: z.object({ name: field, email: field, message: field }),
  submitLabel: z.string(),
  /** Texto del toast al enviar. Nada se envía: el formulario es un mockup, como en v4. */
  successMessage: z.string(),
});

export type ContactProps = z.output<typeof contactSchema>;

export const contact = defineBlock({
  type: "contact",
  schema: contactSchema,
  Component: Contact,
  preload: "eager",
});
