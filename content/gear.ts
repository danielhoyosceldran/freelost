import type { z } from "zod";
import type { gearSchema } from "@/blocks/gear";
import type { Locale } from "@/content/locales";

// "Lo que uso". Solo nombres de categoría: la lista real de equipo está pendiente del cliente,
// y las especificaciones de v4 eran inventadas. Los modelos 3D son genéricos de cada categoría.
const text: Record<Locale, { title: string; camera: string; drone: string; editing: string }> = {
  en: { title: "What I use", camera: "Camera and lenses", drone: "Drone", editing: "Editing" },
  ca: { title: "El que faig servir", camera: "Càmera i òptiques", drone: "Dron", editing: "Edició" },
  es: { title: "Lo que uso", camera: "Cámara y ópticas", drone: "Dron", editing: "Edición" },
};

export const gearContent = (lang: Locale) => {
  const t = text[lang];
  return {
    title: t.title,
    items: [
      { name: t.camera, model: { src: "/models/camera_lens-1k.glb", scale: 0.62, splitGlass: true } },
      {
        name: t.drone,
        model: { src: "/models/dji_air_3-1k.glb", props: ["B_L_04_10", "B_R_04_31", "F_R_02_88", "F_L_02_101"] },
      },
      { name: t.editing, model: { src: "/models/macbook_pro_14-inch_m5-2k.glb", scale: 0.66 } },
    ],
  } satisfies z.input<typeof gearSchema>;
};
