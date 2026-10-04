"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

/**
 * Envoltorio .scroll-reveal: añade .revealed la primera vez que entra en pantalla, con los
 * mismos threshold/rootMargin que el IntersectionObserver global de v4. Nunca se des-revela.
 */
export function Reveal({ className = "", ...rest }: ComponentPropsWithoutRef<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <div ref={ref} className={`scroll-reveal ${className}`} {...rest} />;
}
