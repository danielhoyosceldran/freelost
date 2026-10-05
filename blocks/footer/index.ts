import { z } from "zod";
import { defineBlock } from "../types";
import { Footer } from "./Footer";

export const footerSchema = z.object({
  brand: z.string(),
  legal: z.string(),
  slogan: z.string(),
  /** Idioma del eslogan si no es el de la página. */
  sloganLang: z.string().optional(),
});

export type FooterProps = z.output<typeof footerSchema>;

export const footer = defineBlock({
  type: "footer",
  schema: footerSchema,
  Component: Footer,
  preload: "eager",
});
