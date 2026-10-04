import { z } from "zod";
import { defineBlock } from "../types";
import { Footer } from "./Footer";

export const footerSchema = z.object({
  brand: z.string(),
  legal: z.string(),
  links: z.array(z.object({ label: z.string(), href: z.string().default("#") })),
});

export type FooterProps = z.output<typeof footerSchema>;

export const footer = defineBlock({
  type: "footer",
  schema: footerSchema,
  Component: Footer,
  preload: "eager",
});
