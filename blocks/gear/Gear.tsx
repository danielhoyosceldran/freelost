import { Reveal } from "@/components/ui/Reveal";
import styles from "./gear.module.css";
import { GearCanvas } from "./GearCanvas";
import type { GearItem, GearProps } from "./index";

export function Gear({ anchor, background, eyebrow, title, titleAccent, lead, items }: GearProps) {
  return (
    <section id={anchor} className="relative" style={{ backgroundColor: background }}>
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-10">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.04] pb-8">
          <div>
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-gold-400 font-semibold block mb-2">{eyebrow}</span>
            <h2 className="font-display text-4xl md:text-6xl text-white font-normal">
              {title} <span className="font-serif italic text-gold-200 font-light">{titleAccent}</span>
            </h2>
          </div>
          <p className="font-serif italic text-gray-400 text-sm md:text-base max-w-md">{lead}</p>
        </Reveal>
      </div>

      {/* Visor 3D a un lado, descripción al otro; los impares invierten el orden. */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        {items.map((item, i) => (
          <GearBlock key={item.index} item={item} reverse={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

function GearBlock({ item, reverse }: { item: GearItem; reverse: boolean }) {
  return (
    <div className={`${styles.block} ${reverse ? styles.reverse : ""}`}>
      <GearCanvas model={item.model} className={styles.viewer} />

      <div className={`${styles.copy} py-12 md:py-20 ${reverse ? "md:pr-10 lg:pr-16" : "md:pl-10 lg:pl-16"}`}>
        <span className={styles.index}>{item.index}</span>
        <h3 className="font-display text-2xl md:text-4xl text-white font-normal mt-3 mb-4">
          {item.title} <span className="font-serif italic text-gold-200 font-light">{item.titleAccent}</span>
        </h3>
        <div className={`${styles.rule} mb-5`} />
        <p className={`${styles.lead} mb-4 md:mb-6`}>{item.lead}</p>
        <ul className="space-y-2 md:space-y-2.5 font-sans text-xs text-gray-300">
          {item.specs.map((spec) => (
            <li key={spec.name} className={spec.desktopOnly ? "hidden md:block" : "border-b border-white/[0.04] pb-2"}>
              <span className="text-white font-semibold block">{spec.name}</span>
              <span className="text-gray-500 text-[11px]">{spec.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
