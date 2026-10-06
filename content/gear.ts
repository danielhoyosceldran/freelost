import type { z } from "zod";
import type { gearSchema } from "@/blocks/gear";
import type { Locale } from "@/content/locales";

// "Lo que uso". Solo nombres de categoría: la lista real de equipo está pendiente del cliente,
// y las especificaciones de v4 eran inventadas. Los modelos 3D son arquetipos de cada categoría,
// modelados por código (lib/three/gearModels): cámara → dron → portátil, en ese orden de metamorfosis.
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
      { name: t.camera, model: "camera" },
      { name: t.drone, model: "drone" },
      { name: t.editing, model: "laptop" },
    ],
  } satisfies z.input<typeof gearSchema>;
};
