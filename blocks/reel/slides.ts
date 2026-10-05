import type { z } from "zod";
import type { slideSchema } from "./schema";

// Helpers de diapositiva para el cliente. Sin zod en runtime (ver schema.ts).

export type ReelSlide = z.infer<typeof slideSchema>;

export const pexels = (id: string, width: number) =>
  `https://images.pexels.com/photos/${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

/** Portada que se pinta en la cinta. */
export const coverOf = (s: ReelSlide) => (s.kind === "photo" ? pexels(s.pexels, 1400) : s.cover);
/** Versión grande para la vista de proyecto. */
export const hiResOf = (s: ReelSlide) => (s.kind === "photo" ? pexels(s.pexels, 2560) : s.cover);
