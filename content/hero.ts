// Primera pantalla de la home. Película: FL1 (public/media/videos/bici/FL1 insta.mp4),
// transcodificada a public/media/web/ sin las pausas en negro del arranque (0–13 s) ni el cartón
// del logo del final (desde 106,8 s). En local por ahora; más adelante, Vimeo.
export const heroContent = {
  studio: "free lost",
  name: "Guillem Salvador",
  role: "Filmmaker",
  slogan: "Feel free to get lost.",
  sloganLang: "en",
  film: {
    label: "Película de free lost: ciclismo y carrera a pie en carretera.",
    poster: "/media/web/fl1-poster.jpg",
    sources: [
      { src: "/media/web/fl1-720.mp4", media: "(max-width: 960px)" },
      { src: "/media/web/fl1-1080.mp4" },
    ],
  },
  labels: {
    sound: "Sonido",
    play: "Reproducir",
    pause: "Pausar",
  },
};
