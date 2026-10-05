import type { z } from "zod";
import type { gearSchema } from "@/blocks/gear";

// "Lo que uso". Solo nombres de categoría: la lista real de equipo está pendiente del cliente,
// y las especificaciones de v4 eran inventadas. Los modelos 3D son genéricos de cada categoría.
export const gearContent = {
  title: "Lo que uso",
  items: [
    { name: "Cámara y ópticas", model: { src: "/models/camera_lens-1k.glb", scale: 0.62, splitGlass: true } },
    {
      name: "Dron",
      model: { src: "/models/dji_air_3-1k.glb", props: ["B_L_04_10", "B_R_04_31", "F_R_02_88", "F_L_02_101"] },
    },
    { name: "Edición", model: { src: "/models/macbook_pro_14-inch_m5-2k.glb", scale: 0.66 } },
  ],
} satisfies z.input<typeof gearSchema>;
