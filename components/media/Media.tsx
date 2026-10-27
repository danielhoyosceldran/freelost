import { ImageIcon, Play } from "lucide-react";
import type { MediaItem, MediaLabels } from "./schema";
import styles from "./media.module.css";

interface MediaProps {
  item: Pick<MediaItem, "kind" | "ratio" | "src" | "poster" | "alt">;
  labels: MediaLabels;
  /** Llena el contenedor (portada a sangre) en vez de imponer su proporción. */
  fill?: boolean;
  /** La portada del primer viewport no espera al scroll. */
  eager?: boolean;
  className?: string;
}

/**
 * Foto, vídeo o, mientras no hay `src`, su hueco. Sin estado ni efectos: vale en servidor y en
 * cliente. El hueco no imita un reproductor (no hay play que pulsar): es un marco de plató con
 * las diagonales, el tipo de medio y la proporción, para que se lea como pendiente y no como roto.
 */
export function Media({ item, labels, fill, eager, className }: MediaProps) {
  const style = fill ? undefined : { aspectRatio: item.ratio };
  const cls = [styles.media, fill && styles.fill, className].filter(Boolean).join(" ");

  if (item.src && item.kind === "photo") {
    return (
      // El export estático no optimiza imágenes: el ancho lo pide lib/media.ts al proveedor.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={cls}
        style={style}
        src={item.src}
        alt={item.alt ?? ""}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  if (item.src) {
    // Nativo y con controles: es la película del proyecto, la ve quien la pide, con sonido.
    return (
      <video
        className={cls}
        style={style}
        src={item.src}
        poster={item.poster}
        controls
        playsInline
        preload="metadata"
        aria-label={item.alt}
      />
    );
  }

  const kind = labels[item.kind];
  const ratio = item.ratio.replace("/", ":");
  const Icon = item.kind === "video" ? Play : ImageIcon;
  return (
    <div className={`${cls} ${styles.slot}`} style={style} role="img" aria-label={`${kind} ${ratio}, ${labels.pending}`}>
      {/* Las diagonales del marco: trazo de 1 px a cualquier tamaño (non-scaling-stroke). */}
      <svg className={styles.cross} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="0" x2="100" y2="100" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="0" y2="100" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className={styles.tag} aria-hidden="true">
        <Icon size={15} strokeWidth={1.5} />
        <span>
          {kind} · {ratio}
        </span>
        <span className={styles.pending}>{labels.pending}</span>
      </span>
    </div>
  );
}
