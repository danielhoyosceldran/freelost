import type { CutProps } from "./index";

export function Cut({ from, to, stroke, edge: [left, right] }: CutProps) {
  return (
    <div className="relative h-16 md:h-24 pointer-events-none -mb-1" style={{ backgroundColor: from }} aria-hidden="true">
      <svg className="absolute top-0 w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d={`M0,${left} L1200,${right} L1200,120 L0,120 Z`} fill={to} />
        <line x1="0" y1={left} x2="1200" y2={right} stroke={stroke} strokeWidth="1" />
      </svg>
    </div>
  );
}
