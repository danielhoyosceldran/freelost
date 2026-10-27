import type { Locale } from "@/content/locales";

// «Our story»: el manifiesto del estudio, entre el carrete y los fragmentos. PROVISIONAL: el copy
// parafrasea la sección «Our Story» de la web actual de Guillem (free-lost.com, octubre 2026),
// la pregunta y los tres apartados (origen, propósito, elección). Hay que sustituirlo por su texto
// exacto (BACKLOG.md). ca/es son traducción nuestra.
type Copy = {
  title: string;
  question: string;
  parts: { heading: string; text: string }[];
};

const text: Record<Locale, Copy> = {
  en: {
    title: "Our story",
    question: "What if we stopped waiting for life to begin?",
    parts: [
      {
        heading: "The origin",
        text: "Free Lost was born from a need to step outside the familiar: to feel more, explore more and live with intention.",
      },
      {
        heading: "The purpose",
        text: "A film can do more than look beautiful. It can make you feel, make you question and make you see life differently.",
      },
      {
        heading: "The choice",
        text: "There isn’t just one path. There’s the one you choose, and the decision to actually walk it.",
      },
    ],
  },
  ca: {
    title: "La nostra història",
    question: "I si deixéssim d’esperar que la vida comenci?",
    parts: [
      {
        heading: "L’origen",
        text: "Free Lost neix de la necessitat de sortir del que és conegut: sentir més, explorar més i viure amb intenció.",
      },
      {
        heading: "El propòsit",
        text: "Una pel·lícula pot fer més que ser bonica. Pot fer-te sentir, fer-te preguntes i fer-te veure la vida d’una altra manera.",
      },
      {
        heading: "L’elecció",
        text: "No hi ha un sol camí. Hi ha el que tries, i la decisió de recórrer-lo de debò.",
      },
    ],
  },
  es: {
    title: "Nuestra historia",
    question: "¿Y si dejáramos de esperar a que la vida empiece?",
    parts: [
      {
        heading: "El origen",
        text: "Free Lost nace de la necesidad de salir de lo conocido: sentir más, explorar más y vivir con intención.",
      },
      {
        heading: "El propósito",
        text: "Una película puede hacer más que ser bonita. Puede hacerte sentir, hacerte preguntas y hacerte ver la vida de otra manera.",
      },
      {
        heading: "La elección",
        text: "No hay un solo camino. Está el que eliges, y la decisión de recorrerlo de verdad.",
      },
    ],
  },
};

export const storyContent = (lang: Locale) => ({ anchor: "story", ...text[lang] });
