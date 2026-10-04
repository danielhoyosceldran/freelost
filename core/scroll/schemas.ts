import { z } from "zod";

// Schemas compartidos por los bloques que usan el núcleo de scroll. Fuera de los ficheros
// "use client": importados desde un manifest (servidor) serían referencias de cliente, no objetos.

/** Props de <ScrollGate>. Defaults = la puerta del acto I de v4. */
export const gateSchema = z.object({
  target: z.number().default(1600),
  decay: z.number().default(900),
  label: z.string().default("Insiste para continuar"),
  /** id del elemento al que baja la página al romper la puerta. */
  breakTo: z.string().optional(),
});
