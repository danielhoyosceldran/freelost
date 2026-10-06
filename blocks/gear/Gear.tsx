import { ScrollScene } from "@/core/scroll/ScrollScene";
import { GearStage } from "./GearStage";
import type { GearProps } from "./index";

/**
 * Scroll (vh) que dura la llegada del escenario desde arriba, antes del primer objeto. El carrete
 * (`--reel-hold-extra` en reel.module.css) se queda clavado ese mismo tramo: igualarlos.
 */
const ENTRY_VH = 130;

/**
 * La escena empieza ENTRY_VH + una pantalla por encima del final del carrete, de modo que su
 * llegada ocurre con el carrete aún clavado y a la vista: la diapositiva baja y lo tapa. Sin
 * fondo propio ni puntero hasta que el escenario (que sí lo lleva) sale a escena.
 */
export function Gear({ anchor, height, title, items }: GearProps) {
  const total = height ?? `${items.length * 100 + 60 + ENTRY_VH}vh`;
  // Fracción del recorrido de la escena (alto menos una pantalla) que ocupa la llegada.
  const entry = Math.min(0.5, ENTRY_VH / Math.max(1, parseFloat(total) - 100));
  return (
    <ScrollScene anchor={anchor} height={total} overlap={`calc(-100svh - ${ENTRY_VH}vh)`} className="pointer-events-none">
      <GearStage title={title} items={items} entry={entry} />
    </ScrollScene>
  );
}
