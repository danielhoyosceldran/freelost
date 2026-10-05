"use client";

import { Fragment, useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { LOGO_F, LOGO_L, LOGO_VIEWBOX } from "@/lib/brand/logo";
import type { ContactProps } from "./index";
import styles from "./contact.module.css";

/** Enlace sin destino todavía: se ve y se enfoca, pero no navega (ni salta arriba con "#"). */
const inert = (href?: string) =>
  href ? { href } : { href: "#", "aria-disabled": true, onClick: (e: MouseEvent) => e.preventDefault() };

/**
 * El cierre repite el gesto del principio: al entrar en pantalla, la F gigante en contorno baja y
 * la L sube, como en el loader, y el titular sale palabra a palabra como el nombre del hero.
 */
export function Contact({ anchor, title, email, channels }: ContactProps) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        root.setAttribute("data-in", "");
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const words = title.split(/\s+/);

  return (
    <section ref={rootRef} id={anchor} className={styles.contact}>
      <div className={styles.blades} aria-hidden="true">
        <svg className={styles.bladeF} viewBox={LOGO_VIEWBOX}>
          <path d={LOGO_F} />
        </svg>
        <svg className={styles.bladeL} viewBox={LOGO_VIEWBOX}>
          <path d={LOGO_L} />
        </svg>
      </div>

      <div className={styles.inner}>
        <h2 className={styles.title}>
          {words.map((w, i) => (
            <Fragment key={i}>
              {i > 0 && " "}
              <span className={styles.line}>
                <span className={styles.word} style={{ "--i": i } as CSSProperties}>
                  {w}
                </span>
              </span>
            </Fragment>
          ))}
        </h2>

        <a className={styles.mail} {...inert(email.href)}>
          <span className={styles.mailText}>{email.label}</span>
          <ArrowUpRight className={styles.arrow} aria-hidden="true" />
        </a>

        <ul className={styles.channels}>
          {channels.map((c) => (
            <li key={c.label}>
              <a className={styles.channel} {...inert(c.href)}>
                {c.label}
                <ArrowUpRight aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
