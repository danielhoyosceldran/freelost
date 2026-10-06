import { ScrollScene } from "@/core/scroll/ScrollScene";
import { GearStage } from "./GearStage";
import type { GearProps } from "./index";

/** Scroll (vh) que dura la llegada del escenario desde arriba, antes del primer objeto. */
const ENTRY_VH = 110;

export function Gear({ anchor, height, title, items }: GearProps) {
  const total = height ?? `${items.length * 100 + 60 + ENTRY_VH}vh`;
  // Fracción del recorrido de la escena (alto menos una pantalla) que ocupa la llegada.
  const entry = Math.min(0.5, ENTRY_VH / Math.max(1, parseFloat(total) - 100));
  return (
    <ScrollScene anchor={anchor} height={total} className="bg-ink">
      <GearStage title={title} items={items} entry={entry} />
    </ScrollScene>
  );
}
