import { z } from "zod";
import { defineBlock } from "../types";
import { PageLoader } from "./PageLoader";

// Pantalla de carga. Va en la lista `before` de la página (fuera de <main>), para quedar por
// encima del cursor como en v4. Sin este bloque, la página está 'ready' desde el primer frame.
export const loaderSchema = z.object({
  /** Duración mínima: con caché llena no debe parpadear. */
  minMs: z.number().default(1000),
  /** Techo: si un CDN no responde, no dejar al usuario encerrado. */
  maxMs: z.number().default(15000),
  /** Esperar también a document.fonts.ready. */
  fonts: z.boolean().default(true),
  /** Color del relleno (v4: amarillo de box-end.svg). */
  color: z.string().default("#FFD83D"),
});

export type LoaderProps = z.output<typeof loaderSchema>;

export const loader = defineBlock({
  type: "loader",
  schema: loaderSchema,
  Component: PageLoader,
  preload: "eager",
  ownsReady: true,
});
