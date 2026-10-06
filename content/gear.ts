import type { z } from "zod";
import type { gearSchema } from "@/blocks/gear";
import type { Locale } from "@/content/locales";

// "Lo que uso". Categorías con etiquetas que explican, para quien no es del oficio, qué permite
// cada parte del equipo: qué se gana, no fichas técnicas. Solo se nombra el modelo cuando el
// cliente lo ha dado (la A7 IV). Los modelos 3D son arquetipos de cada categoría, modelados por
// código (lib/three/gearModels): cámara → dron → portátil, en ese orden de metamorfosis.
type Copy = {
  title: string;
  camera: string;
  cameraTags: string[];
  drone: string;
  droneTags: string[];
  editing: string;
  editingTags: string[];
};

const text: Record<Locale, Copy> = {
  en: {
    title: "What I use",
    camera: "Camera and lenses",
    cameraTags: ["Sony A7 IV", "High-quality photo and video", "Stabiliser for moving shots"],
    drone: "Drone",
    droneTags: ["Aerial shots", "Views from above"],
    editing: "Editing",
    editingTags: ["Industry-leading tools", "Colour grading", "Transitions", "Sound effects", "Composition"],
  },
  ca: {
    title: "El que faig servir",
    camera: "Càmera i òptiques",
    cameraTags: ["Sony A7 IV", "Foto i vídeo d'alta qualitat", "Estabilitzador per a preses en moviment"],
    drone: "Dron",
    droneTags: ["Preses aèries", "Vistes des de dalt"],
    editing: "Edició",
    editingTags: ["Eines capdavanteres del sector", "Colorimetria", "Transicions", "Efectes de so", "Composició"],
  },
  es: {
    title: "Lo que uso",
    camera: "Cámara y ópticas",
    cameraTags: ["Sony A7 IV", "Foto y vídeo de gran calidad", "Estabilizador para tomas en movimiento"],
    drone: "Dron",
    droneTags: ["Tomas aéreas", "Vistas desde arriba"],
    editing: "Edición",
    editingTags: ["Herramientas punteras del sector", "Colorimetría", "Transiciones", "Efectos de sonido", "Composición"],
  },
};

export const gearContent = (lang: Locale) => {
  const t = text[lang];
  return {
    title: t.title,
    items: [
      { name: t.camera, model: "camera", tags: t.cameraTags },
      { name: t.drone, model: "drone", tags: t.droneTags },
      { name: t.editing, model: "laptop", tags: t.editingTags },
    ],
  } satisfies z.input<typeof gearSchema>;
};
