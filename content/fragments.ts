import type { Locale } from "@/content/locales";
import { imageUrl } from "@/lib/media";

// «Fragments»: fotos fijas de Guillem (public/media/fotos), exportadas a 2000 px de lado mayor en
// public/media/web/fotos. El orden es el de lectura y lo compone el bloque (anchos y desfases por
// posición), así que reordenar = mover filas. El pie solo dice la disciplina, que se ve en la foto:
// nada de lugares, atletas ni marcas sin confirmar (PRODUCT.md). Henningsvær sí: es el campo de
// fútbol de Lofoten, reconocible en la foto aérea.
type Discipline = "motor" | "climbing" | "travel" | "cycling";

const photos: { file: string; ratio: string; discipline: Discipline; alt: Record<Locale, string> }[] = [
  {
    file: "circuit",
    ratio: "3/2",
    discipline: "motor",
    alt: {
      en: "A motorbike racing along a circuit, the stands blurred by the pan.",
      ca: "Una moto corrent per un circuit, amb les grades desenfocades pel seguiment.",
      es: "Una moto corriendo por un circuito, con las gradas desenfocadas por el barrido.",
    },
  },
  {
    file: "climb-wall",
    ratio: "2/3",
    discipline: "climbing",
    alt: {
      en: "A climber halfway up a grey limestone wall, seen from below.",
      ca: "Un escalador a mitja paret de roca calcària grisa, vist des de baix.",
      es: "Un escalador a media pared de roca caliza gris, visto desde abajo.",
    },
  },
  {
    file: "henningsvaer",
    ratio: "4/3",
    discipline: "travel",
    alt: {
      en: "Aerial view of Henningsvær, Lofoten: a football pitch on a rocky island surrounded by sea.",
      ca: "Vista aèria d’Henningsvær, Lofoten: un camp de futbol en una illa rocosa envoltada de mar.",
      es: "Vista aérea de Henningsvær, Lofoten: un campo de fútbol en una isla rocosa rodeada de mar.",
    },
  },
  {
    file: "cyclist",
    ratio: "3/2",
    discipline: "cycling",
    alt: {
      en: "A cyclist in a green helmet, close and sharp against a green blur of motion.",
      ca: "Un ciclista amb casc verd, de prop i nítid sobre un fons verd escombrat pel moviment.",
      es: "Un ciclista con casco verde, cerca y nítido sobre un fondo verde barrido por el movimiento.",
    },
  },
  {
    file: "lookout",
    ratio: "2/3",
    discipline: "travel",
    alt: {
      en: "Someone looking out at a steep island across the water from a rocky shore.",
      ca: "Algú mirant una illa escarpada a l’altra banda de l’aigua des d’una costa de roca.",
      es: "Alguien mirando una isla escarpada al otro lado del agua desde una costa de roca.",
    },
  },
  {
    file: "tunnel",
    ratio: "3/2",
    discipline: "travel",
    alt: {
      en: "A lone silhouette standing in the bright mouth of a dark tunnel.",
      ca: "Una silueta sola a la boca il·luminada d’un túnel fosc.",
      es: "Una silueta sola en la boca iluminada de un túnel oscuro.",
    },
  },
  {
    file: "reach",
    ratio: "3/2",
    discipline: "climbing",
    alt: {
      en: "A climber stretching for the next hold on a grey rock face.",
      ca: "Una escaladora estirant-se cap a la presa següent en una paret de roca grisa.",
      es: "Una escaladora estirándose hacia la siguiente presa en una pared de roca gris.",
    },
  },
  {
    file: "clouds",
    ratio: "3/2",
    discipline: "travel",
    alt: {
      en: "Two hikers facing a mountain half hidden in low cloud.",
      ca: "Dos excursionistes davant d’una muntanya mig amagada entre núvols baixos.",
      es: "Dos excursionistas frente a una montaña medio oculta entre nubes bajas.",
    },
  },
  {
    file: "enduro",
    ratio: "3/2",
    discipline: "motor",
    alt: {
      en: "A motocross rider coming straight at the camera through a dirt corner.",
      ca: "Un pilot de motocròs venint de cara a càmera per un revolt de terra.",
      es: "Un piloto de motocross viniendo de frente a cámara por una curva de tierra.",
    },
  },
];

const text: Record<
  Locale,
  {
    title: string;
    intro: string;
    disciplines: Record<Discipline, string>;
    labels: { open: string; close: string; prev: string; next: string; of: string };
  }
> = {
  en: {
    title: "Fragments",
    intro: "Stills from the road, between takes.",
    disciplines: { motor: "Motor", climbing: "Climbing", travel: "Travel", cycling: "Cycling" },
    labels: { open: "View larger", close: "Close", prev: "Previous", next: "Next", of: "of" },
  },
  ca: {
    title: "Fragments",
    intro: "Fotos del camí, entre presa i presa.",
    disciplines: { motor: "Motor", climbing: "Escalada", travel: "Viatge", cycling: "Ciclisme" },
    labels: { open: "Veure en gran", close: "Tancar", prev: "Anterior", next: "Següent", of: "de" },
  },
  es: {
    title: "Fragmentos",
    intro: "Fotos del camino, entre toma y toma.",
    disciplines: { motor: "Motor", climbing: "Escalada", travel: "Viaje", cycling: "Ciclismo" },
    labels: { open: "Ver en grande", close: "Cerrar", prev: "Anterior", next: "Siguiente", of: "de" },
  },
};

export const fragmentsContent = (lang: Locale) => ({
  anchor: "fragments",
  title: text[lang].title,
  intro: text[lang].intro,
  labels: text[lang].labels,
  photos: photos.map((p) => ({
    src: imageUrl(`fotos/${p.file}.jpg`, 2000),
    ratio: p.ratio,
    caption: text[lang].disciplines[p.discipline],
    alt: p.alt[lang],
  })),
});
