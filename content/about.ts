import type { Locale } from "@/content/locales";

// About, con el texto de Guillem (7/10/2026). El original es el inglés; ca/es son traducción
// nuestra, pendiente de que él la revise. "Free Lost" va como lo escribe él en el texto corrido; la
// marca (logo, wordmark) sigue en minúsculas.
type Copy = { title: string; lead: string; body: string[]; closing: string; credit: string };

const text: Record<Locale, Copy> = {
  en: {
    title: "About",
    lead: "Free Lost creates films and visual stories around sport, nature, adventure and people.",
    body: [
      "We are drawn to the moments that feel real — effort, uncertainty, movement, silence, connection.",
      "The aim is not to make life look perfect, but to capture what makes it worth living.",
      "Stories about people who move, explore, try, fail, push forward and choose to experience life rather than simply pass through it.",
    ],
    closing: "Because sometimes getting lost is part of finding where you want to go.",
    credit:
      "Free Lost is led by Guillem Salvador, a filmmaker based in Catalonia working across documentary, branded content and outdoor storytelling.",
  },
  ca: {
    title: "Qui som",
    lead: "Free Lost crea pel·lícules i històries visuals sobre esport, natura, aventura i persones.",
    body: [
      "Ens atrauen els moments que se senten reals — l’esforç, la incertesa, el moviment, el silenci, la connexió.",
      "L’objectiu no és fer que la vida sembli perfecta, sinó capturar allò que fa que valgui la pena viure-la.",
      "Històries de persones que es mouen, exploren, ho proven, fallen, tiren endavant i trien viure la vida en lloc de simplement passar-hi.",
    ],
    closing: "Perquè, de vegades, perdre’s forma part de trobar on vols anar.",
    credit:
      "Free Lost està dirigit per Guillem Salvador, cineasta establert a Catalunya que treballa entre el documental, el contingut de marca i les històries a l’aire lliure.",
  },
  es: {
    title: "Quiénes somos",
    lead: "Free Lost crea películas e historias visuales sobre deporte, naturaleza, aventura y personas.",
    body: [
      "Nos atraen los momentos que se sienten reales — el esfuerzo, la incertidumbre, el movimiento, el silencio, la conexión.",
      "El objetivo no es que la vida parezca perfecta, sino capturar lo que hace que valga la pena vivirla.",
      "Historias de personas que se mueven, exploran, lo intentan, fallan, siguen adelante y eligen vivir la vida en lugar de simplemente pasar por ella.",
    ],
    closing: "Porque a veces perderse es parte de encontrar adónde quieres ir.",
    credit:
      "Free Lost está dirigido por Guillem Salvador, cineasta afincado en Cataluña que trabaja entre el documental, el contenido de marca y las historias al aire libre.",
  },
};

export const aboutContent = (lang: Locale) => text[lang];
