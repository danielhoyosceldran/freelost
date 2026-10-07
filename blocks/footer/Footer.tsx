import { LOGO_F, LOGO_L, LOGO_VIEWBOX } from "@/lib/brand/logo";
import type { FooterProps } from "./index";
import styles from "./footer.module.css";

// La firma: la misma marca que abre el hero, el nombre del estudio y el aviso legal. Sin eslogan:
// se ha descubierto unas pantallas antes (bloque `slogan`) y repetirlo aquí le quitaría fuerza.
export function Footer({ brand, legal }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.lockup}>
        <svg className={styles.mark} viewBox={LOGO_VIEWBOX} aria-hidden="true">
          <path d={LOGO_F} />
          <path d={LOGO_L} />
        </svg>
        <span className={styles.brand}>{brand}</span>
      </div>
      <p className={styles.legal}>{legal}</p>
    </footer>
  );
}
