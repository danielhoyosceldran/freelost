import type { PageConfig } from "@/blocks/registry";
import { gearContent } from "@/content/gear";
import { reelSlides } from "@/content/reel";

// Orden de la home. Intercambiar, quitar o duplicar bloques = editar estas listas.
// Copy de mockup/v4 tal cual (placeholder, inventado).
export const home = {
  before: [{ type: "loader", props: {} }],
  main: [
    { type: "reel", props: { slides: reelSlides, gate: { breakTo: "material" } } },
    { type: "cut", props: { from: "#030406", to: "#080a0e", edge: [0, 75] } },
    { type: "gear", props: gearContent },
    { type: "cut", props: { from: "#080a0e" } },
    {
      type: "contact",
      props: {
        eyebrow: "Conexión Directa",
        title: "Inicia la",
        titleAccent: "Próxima Expedición",
        lead: "Guillem Salvador evalúa proyectos para documentales de naturaleza, campañas comerciales de marcas y cobertura extrema.",
        fields: {
          name: { label: "Nombre / Productora / Marca", placeholder: "Red Bull Media / Alpinist Mag" },
          email: { label: "Correo Electrónico", placeholder: "produccion@empresa.com" },
          message: { label: "Entorno & Visión de Rodaje", placeholder: "Describe las condiciones extremas, fechas, requisitos..." },
        },
        submitLabel: "Transmitir Ficha de Rodaje",
        successMessage: "Mensaje transmitido con éxito.",
      },
    },
  ],
  after: [
    {
      type: "footer",
      props: {
        brand: "GUILLEM SALVADOR",
        legal: "© 2026. Cinematografía en condiciones límite.",
        links: [{ label: "Vimeo Pro" }, { label: "Instagram" }, { label: "IMDb" }],
      },
    },
  ],
} satisfies PageConfig;
