"use client";

import { Fragment, useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { scrollController } from "@/core/scroll/controller";
import { easeOut, segment } from "@/lib/easing";
import { LOGO_F, LOGO_L, LOGO_VIEWBOX } from "@/lib/brand/logo";
import type { ContactProps } from "./index";
import styles from "./contact.module.css";

/** Enlace sin destino todavía: se ve y se enfoca, pero no navega (ni salta arriba con "#"). */
const inert = (href?: string) =>
  href ? { href } : { href: "#", "aria-disabled": true, onClick: (e: MouseEvent) => e.preventDefault() };

/** Retardo entre palabras del titular (s): con scroll lento, una a una; con scroll rápido, casi juntas. */
const STAGGER_SLOW = 0.09;
const STAGGER_FAST = 0.012;
/** Atracción del correo hacia el cursor: radio de acción (px) y desplazamiento máximo (px). */
const MAGNET_RADIUS = 160;
const MAGNET_MAX = 6;

/**
 * El cierre repite el gesto del principio, pero a la medida del scroll: mientras la sección
 * entra, la F gigante en contorno baja y la L sube (se pueden rebobinar), y al llegar al final
 * se encajan y se rellenan de ember, como en el loader. El titular sale palabra a palabra como
 * el nombre del hero.
 */
export function Contact({ anchor, title, subtitle, email, channels }: ContactProps) {
  const rootRef = useRef<HTMLElement>(null);
  const bladeFRef = useRef<SVGSVGElement>(null);
  const bladeLRef = useRef<SVGSVGElement>(null);
  const mailRef = useRef<HTMLAnchorElement>(null);

  // Titular: se dispara una vez al entrar. El ritmo de las palabras lo marca la velocidad con la
  // que llega el visitante.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const fast = Math.abs(scrollController.velocity());
        root.style.setProperty("--stagger", `${(STAGGER_SLOW + (STAGGER_FAST - STAGGER_SLOW) * fast).toFixed(3)}s`);
        root.setAttribute("data-in", "");
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // Las hojas siguen al scroll: e = cuánto de la sección ha entrado (0 = su borde superior en el
  // pie de la pantalla, 1 = en el techo). Estilo directo, sin re-render.
  useEffect(() => {
    const root = rootRef.current;
    const f = bladeFRef.current;
    const l = bladeLRef.current;
    if (!root || !f || !l) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    return scrollController.subscribe(() => {
      const e = Math.min(1, Math.max(0, 1 - root.getBoundingClientRect().top / window.innerHeight));
      const approach = easeOut(segment(e, 0, 0.85));
      const opacity = String(segment(e, 0, 0.5));
      f.style.opacity = opacity;
      l.style.opacity = opacity;
      f.style.transform = calm ? "" : `translateY(${(-40 * (1 - approach)).toFixed(2)}%)`;
      l.style.transform = calm ? "" : `translateY(${(40 * (1 - approach)).toFixed(2)}%)`;
      // Encajadas, se rellenan: el gesto con el que se abrió la película.
      const fill = segment(e, 0.7, 1);
      root.style.setProperty("--fill", fill.toFixed(3));
      if (fill >= 0.98) root.setAttribute("data-locked", "");
      else root.removeAttribute("data-locked");
    });
  }, []);

  // El correo se inclina hacia el cursor cuando está cerca. Solo puntero fino y sin movimiento
  // reducido; la transición de `translate` en CSS suaviza el seguimiento.
  useEffect(() => {
    const root = rootRef.current;
    const mail = mailRef.current;
    if (!root || !mail) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const reset = () => (mail.style.translate = "");
    const move = (ev: PointerEvent) => {
      if (!root.hasAttribute("data-in")) return;
      const r = mail.getBoundingClientRect();
      // El translate ya aplicado desplaza el rect: se mide desde el centro de reposo.
      const cx = r.left + r.width / 2 - (parseFloat(mail.style.translate) || 0);
      const cy = r.top + r.height / 2 - (parseFloat(mail.style.translate.split(" ")[1]) || 0);
      const dx = ev.clientX - cx;
      const dy = ev.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > MAGNET_RADIUS + r.width / 2) return reset();
      mail.style.translate = `${Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, dx * 0.04)).toFixed(2)}px ${Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, dy * 0.12)).toFixed(2)}px`;
    };
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerleave", reset);
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", reset);
    };
  }, []);

  const words = title.split(/\s+/);

  return (
    <section ref={rootRef} id={anchor} className={styles.contact}>
      <div className={styles.blades} aria-hidden="true">
        <svg ref={bladeFRef} className={styles.bladeF} viewBox={LOGO_VIEWBOX}>
          <path d={LOGO_F} />
        </svg>
        <svg ref={bladeLRef} className={styles.bladeL} viewBox={LOGO_VIEWBOX}>
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

        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        <a ref={mailRef} className={styles.mail} {...inert(email.href)}>
          <span className={styles.mailText}>{email.label}</span>
          <ArrowUpRight className={styles.arrow} aria-hidden="true" />
        </a>
        {email.address && <p className={styles.address}>{email.address}</p>}

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
