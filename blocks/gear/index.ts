import { z } from "zod";
import { defineBlock } from "../types";
import { Gear } from "./Gear";

// "Lo que uso": escena de scroll corta en la que el equipo pasa por el escenario de uno en uno.
// Un solo lienzo 3D en el que cada objeto se deshace en puntos y se recompone en el siguiente
// (lib/three/GearMorph); la lista de nombres marca cuál toca y deja saltar a cualquiera. three.js
// se carga cuando el bloque está 'warm' (ver GearCanvas).
export const gearSchema = z.object({
  anchor: z.string().default("equipo"),
  /** Alto del spacer. Sin él, una pantalla por objeto más un respiro final. */
  height: z.string().optional(),
  title: z.string(),
  items: z
    .array(
      z.object({
        name: z.string(),
        /** Modelo procedural de lib/three/gearModels. */
        model: z.enum(["camera", "drone", "laptop"]),
        /** Qué permite, en lenguaje de cliente. Se despliegan bajo el nombre cuando es el actual. */
        tags: z.array(z.string()).default([]),
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
