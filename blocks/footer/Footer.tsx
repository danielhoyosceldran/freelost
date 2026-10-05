import { LOGO_F, LOGO_L, LOGO_VIEWBOX } from "@/lib/brand/logo";
import type { FooterProps } from "./index";
import styles from "./footer.module.css";

// La firma: la misma pareja marca + nombre del estudio que abre el hero, el aviso legal y el
// eslogan, que cierra la página como la abrió.
export function Footer({ brand, legal, slogan, sloganLang }: FooterProps) {
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
      <p className={styles.slogan} lang={sloganLang}>
        {slogan}
      </p>
    </footer>
  );
}
