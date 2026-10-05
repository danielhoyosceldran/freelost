import { ScrollScene } from "@/core/scroll/ScrollScene";
import { GearStage } from "./GearStage";
import type { GearProps } from "./index";

export function Gear({ anchor, height, title, items }: GearProps) {
  return (
    <ScrollScene anchor={anchor} height={height ?? `${items.length * 100 + 60}vh`} className="bg-ink">
      <GearStage title={title} items={items} />
    </ScrollScene>
  );
}
