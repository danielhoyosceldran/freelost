import { z } from "zod";
import { defineBlock } from "../types";
import { PageLoader } from "./PageLoader";

// Pantalla de carga con la marca de free lost. Va en la lista `before` de la página (fuera de
// <main>) para quedar por encima de todo. Sin este bloque, la página está 'ready' desde el
// primer frame.
export const loaderSchema = z.object({
  /** Duración mínima del relleno, a velocidad constante: con caché llena tiene que verse subir, no parpadear. */
  minMs: z.number().default(700),
  /** Techo: si el vídeo no responde, no dejar al usuario encerrado. */
  maxMs: z.number().default(15000),
  /** Esperar también a document.fonts.ready. */
  fonts: z.boolean().default(true),
  /** Color con el que se llenan los trazos una vez encajados (admite var(--token)). */
  color: z.string(),
  /** Nombre accesible de la barra de progreso. */
  label: z.string(),
});

export type LoaderProps = z.output<typeof loaderSchema>;

export const loader = defineBlock({
  type: "loader",
  schema: loaderSchema,
  Component: PageLoader,
  preload: "eager",
  ownsReady: true,
});
