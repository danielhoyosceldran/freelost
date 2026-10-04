import { z } from "zod";
import { defineBlock } from "../types";
import { Gear } from "./Gear";

// Sección "Equipo & Material" de v4: cabecera + bloques de visor 3D y descripción, alternando
// lado. Los visores cargan three.js cuando el bloque está 'warm' (ver GearCanvas).
export const gearSchema = z.object({
  anchor: z.string().default("material"),
  background: z.string().default("#080a0e"),
  eyebrow: z.string(),
  title: z.string(),
  titleAccent: z.string(),
  lead: z.string(),
  items: z.array(
    z.object({
      /** "01 · Captación" */
      index: z.string(),
      title: z.string(),
      titleAccent: z.string(),
      lead: z.string(),
      specs: z.array(
        z.object({
          name: z.string(),
          detail: z.string(),
          /** Se oculta en móvil (v4: el último de cada lista). */
          desktopOnly: z.boolean().default(false),
        }),
      ),
      model: z.object({
        src: z.string(),
        scale: z.number().default(1),
        splitGlass: z.boolean().default(false),
        props: z.array(z.string()).default([]),
      }),
    }),
  ),
});

export type GearProps = z.output<typeof gearSchema>;
export type GearItem = GearProps["items"][number];

export const gear = defineBlock({
  type: "gear",
  schema: gearSchema,
  Component: Gear,
  preload: "onWarm",
});
