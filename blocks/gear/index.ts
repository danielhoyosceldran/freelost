import { z } from "zod";
import { defineBlock } from "../types";
import { Gear } from "./Gear";

// "Lo que uso": escena de scroll corta en la que el equipo pasa por el escenario de uno en uno.
// Cada objeto es un visor 3D que gira con el scroll; la lista de nombres marca cuál toca y deja
// saltar a cualquiera. three.js se carga cuando el bloque está 'warm' (ver GearCanvas).
export const gearSchema = z.object({
  anchor: z.string().default("equipo"),
  /** Alto del spacer. Sin él, una pantalla por objeto más un respiro final. */
  height: z.string().optional(),
  title: z.string(),
  items: z
    .array(
      z.object({
        name: z.string(),
        model: z.object({
          src: z.string(),
          scale: z.number().default(1),
          splitGlass: z.boolean().default(false),
          props: z.array(z.string()).default([]),
        }),
      }),
    )
    .min(1),
});

export type GearProps = z.output<typeof gearSchema>;
export type GearItem = GearProps["items"][number];

export const gear = defineBlock({
  type: "gear",
  schema: gearSchema,
  Component: Gear,
  preload: "onWarm",
});
