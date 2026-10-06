import type { z } from "zod";
import { imageUrl } from "@/lib/media";
import type { slideSchema } from "./schema";

// Helpers de diapositiva para el cliente. Sin zod en runtime (ver schema.ts).

export type ReelSlide = z.infer<typeof slideSchema>;

// Anchos de la foto: la tarjeta de la cinta y la vista de proyecto a pantalla completa (retina).
const CARD_W = 1400;
const FULL_W = 2560;

/** Portada que se pinta en la cinta. */
export const coverOf = (s: ReelSlide) => (s.kind === "photo" ? imageUrl(s.src, CARD_W) : s.cover);
/** Versión grande para la vista de proyecto. */
export const hiResOf = (s: ReelSlide) => (s.kind === "photo" ? imageUrl(s.src, FULL_W) : s.cover);
