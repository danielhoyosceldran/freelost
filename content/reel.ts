// Diapositivas del carrete del acto I, tal cual v4 (PHOTOS en actOneCarrusel()). Placeholder:
// dos vídeos de Vimeo y el resto hotlinkeado de Pexels, que sirve CORS (hace falta para texturas).

import type { ReelSlide } from "@/blocks/reel/slides";

export const reelSlides: ReelSlide[] = [
  { kind: "video", cover: "/media/motor.jpg", vimeo: "1232830439", place: "Rodando al amanecer" },
  { kind: "video", cover: "/media/surf.jpg", vimeo: "1232830440", place: "Sesión de olas" },
  { kind: "photo", pexels: "16824426/pexels-photo-16824426/free-photo-of-hombre-lineas-aventura-casco", place: "Primer largo, pared norte" },
  { kind: "photo", pexels: "11897874/pexels-photo-11897874", place: "Dunas de viento, Erg Chebbi" },
  { kind: "photo", pexels: "4611989/pexels-photo-4611989", place: "Waimea Bay, Hawái" },
  { kind: "photo", pexels: "10523664/pexels-photo-10523664", place: "Hayedo en la niebla, amanecer" },
  { kind: "photo", pexels: "13723074/pexels-photo-13723074", place: "Vuelo libre sobre los Alpes suizos" },
  { kind: "photo", pexels: "13531098/pexels-photo-13531098", place: "Frente del Perito Moreno, El Calafate" },
  { kind: "photo", pexels: "13599851/pexels-photo-13599851", place: "Descenso entre abetos" },
  { kind: "photo", pexels: "6827275/pexels-photo-6827275", place: "Cenital sobre agua turquesa" },
  { kind: "photo", pexels: "20869805/pexels-photo-20869805", place: "Ascensión a Shkodër, Albania" },
  { kind: "photo", pexels: "5232612/pexels-photo-5232612", place: "Arcoíris en la línea del pico" },
  { kind: "photo", pexels: "17294260/pexels-photo-17294260/free-photo-of-rapel", place: "Rápel en Ayacucho, Perú" },
  { kind: "photo", pexels: "27534211/pexels-photo-27534211/free-photo-of-amanecer-paisaje-naturaleza-cielo", place: "Sáhara argelino, primera luz" },
  { kind: "photo", pexels: "15861998/pexels-photo-15861998/free-photo-of-mar-naturaleza-saludar-despedirse", place: "Rompiente, 1/2000 s" },
  { kind: "photo", pexels: "34730307/pexels-photo-34730307/free-photo-of-sendero-otonal-envuelto-en-niebla-en-un-bosque-tranquilo", place: "Sendero de octubre" },
  { kind: "photo", pexels: "5303379/pexels-photo-5303379", place: "Térmicas sobre el acantilado" },
  { kind: "photo", pexels: "26988251/pexels-photo-26988251/free-photo-of-paisaje-naturaleza-punto-de-referencia-arboles", place: "Hielo azul, Patagonia" },
  { kind: "photo", pexels: "20047144/pexels-photo-20047144/free-photo-of-resfriado-frio-nieve-nevar", place: "La Plagne, última remontada" },
  { kind: "photo", pexels: "11181206/pexels-photo-11181206", place: "Desde la bañera del kayak" },
  { kind: "photo", pexels: "37143204/pexels-photo-37143204/free-photo-of-paisaje-montanoso-panoramico-en-zonza-francia", place: "Zonza, Córcega" },
  { kind: "photo", pexels: "24963089/pexels-photo-24963089/free-photo-of-hombre-rock-roca-piedra", place: "Reunión a media pared, Isfahán" },
];
