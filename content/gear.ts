import type { z } from "zod";
import type { gearSchema } from "@/blocks/gear";

// Sección de equipo, copy de v4 tal cual (inventado, placeholder).
export const gearContent = {
  eyebrow: "Ingeniería en Entornos Hostiles",
  title: "Equipo &",
  titleAccent: "Material",
  lead: "Sistemas calibrados para soportar temperaturas de -40°C a +50°C, condensación glaciar y presión hidrostática profunda.",
  items: [
    {
      index: "01 · Captación",
      title: "Cámaras &",
      titleAccent: "Ópticas",
      lead: "El bloque de captura: sensores de cine de formato grande y cristal de autor, calibrados para trabajar entre -40 °C y +50 °C, con condensación glaciar y nieve reflejando cinco pasos de más.",
      specs: [
        { name: "RED V-Raptor XL 8K VV", detail: "8K RAW hasta 120 fps · 17 pasos de rango dinámico" },
        { name: "ARRI Alexa Mini LF", detail: "Colorimetría orgánica de formato grande para luz polar" },
        { name: "Sony FX6 / FX3", detail: "Cuerpo ultraligero para arneses, grietas y montaje en FPV" },
        { name: "Atlas Orion 2X Anamórficas", detail: "32 · 50 · 80 mm con destello vintage y desenfoque ovalado" },
        { name: "Cooke S4/i Primes · Laowa Probe 24 mm 2:1", detail: "«Cooke Look» de alto contraste y perspectiva periscópica a ras de roca" },
        { name: "Matte box · Filtros IRND & Black Mist", detail: "Control de exposición en nieve, contraluz y agua en movimiento", desktopOnly: true },
      ],
      model: { src: "/models/camera_lens-1k.glb", scale: 0.62, splitGlass: true },
    },
    {
      index: "02 · Movimiento",
      title: "Material",
      titleAccent: "Adicional",
      lead: "Todo lo que mueve, sostiene y protege a la cámara: plataformas aéreas, estabilización activa y el rigging de expedición que mantiene el equipo operativo lejos de cualquier red eléctrica.",
      specs: [
        { name: "Cinelifter Octocóptero X8", detail: "Portador de RED V-Raptor a 160 km/h con doble operador" },
        { name: 'FPV 7" Long Range Mountain', detail: "10 km de alcance en crestas con vientos hostiles" },
        { name: "DJI Inspire 3 · DJI Air 3", detail: "Vuelo guiado por satélite y exploración rápida de localización" },
        { name: "DJI Ronin 4D · Movi Pro · Easyrig", detail: "Estabilización activa en descenso, carrera y travelling a pulso" },
        { name: "Carcasa submarina Nauticam", detail: "Presión certificada hasta 150 m con calefacción de puerto" },
        { name: "Generación solar · Telemetría Iridium", detail: "20 días de autonomía polar y localización continua", desktopOnly: true },
      ],
      model: { src: "/models/dji_air_3-1k.glb", props: ["B_L_04_10", "B_R_04_31", "F_R_02_88", "F_L_02_101"] },
    },
    {
      index: "03 · Postproducción",
      title: "Edición &",
      titleAccent: "Postproducción",
      lead: "El material rodado se monta en ruta y se masteriza en estudio: proxys la misma noche del rodaje, etalonaje HDR gestionado en ACES y entregas listas para cine, OTT y broadcast.",
      specs: [
        { name: 'MacBook Pro 14" M5 · Mac Studio', detail: "Montaje de campo con batería y masterizado en estudio" },
        { name: "DaVinci Resolve Studio", detail: "Etalonaje HDR y gestión de color ACES de extremo a extremo" },
        { name: "Premiere Pro · After Effects", detail: "Conformado, rotoscopia y limpieza de placas aéreas" },
        { name: "R3D RAW · ProRes 4444 XQ", detail: "Proxys ligeros en ruta y master sin pérdida en estudio" },
        { name: "Entrega 8K HDR · Dolby Vision", detail: "DCP, ProRes broadcast y masters OTT hasta 8K a 120 fps" },
        { name: "RAID + LTO-9 · Monitor Eizo CG", detail: "Triple copia desde el primer día y referencia calibrada", desktopOnly: true },
      ],
      model: { src: "/models/macbook_pro_14-inch_m5-2k.glb", scale: 0.66 },
    },
  ],
} satisfies z.input<typeof gearSchema>;
