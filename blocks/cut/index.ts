import { z } from "zod";
import { defineBlock } from "../types";
import { Cut } from "./Cut";

// Corte diagonal entre dos secciones de distinto fondo. Bloque propio (y no parte de uno de
// sus vecinos) para que al reordenar la página se pueda mover, recolorear o quitar.
export const cutSchema = z.object({
  /** Fondo de la sección de arriba. */
  from: z.string(),
  /** Fondo de la sección de abajo. */
  to: z.string().default("#030406"),
  stroke: z.string().default("rgba(238,214,127,0.08)"),
  /**
   * Altura de la diagonal en cada borde, en el viewBox 1200×120 (0 = arriba). v4 usa dos:
   * [80, 0] sube hacia la derecha (equipo → contacto), [0, 75] baja (acto I → equipo).
   */
  edge: z.tuple([z.number(), z.number()]).default([80, 0]),
});

export type CutProps = z.output<typeof cutSchema>;

export const cut = defineBlock({
  type: "cut",
  schema: cutSchema,
  Component: Cut,
  preload: "eager",
});
