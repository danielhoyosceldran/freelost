import type { z } from "zod";
import { about } from "./about";
import { contact } from "./contact";
import { cut } from "./cut";
import { footer } from "./footer";
import { gear } from "./gear";
import { hero } from "./hero";
import { loader } from "./loader";
import { projects } from "./projects";
import { reel } from "./reel";

/**
 * Catálogo de bloques disponibles. Añadir un bloque = crear su carpeta en blocks/ y
 * registrarlo aquí; la página lo usa por su clave `type` desde content/pages/*.
 */
export const registry = {
  about,
  contact,
  cut,
  footer,
  gear,
  hero,
  loader,
  projects,
  reel,
} as const;

type Registry = typeof registry;
export type BlockType = keyof Registry;

/** Entrada de página: unión discriminada por `type`, con los props tipados por su schema. */
export type BlockEntry = {
  [K in BlockType]: {
    type: K;
    /** Clave estable para React; por defecto se usa `type` + índice. */
    id?: string;
    props: z.input<Registry[K]["schema"]>;
  };
}[BlockType];

export type BlockList = readonly BlockEntry[];

/**
 * Una página son tres listas. `main` va dentro de <main> (z-10, el contenido). `before` y
 * `after` quedan fuera, como hermanos: el loader (before) tiene que poder tapar el cursor, y el
 * <footer> de v4 (after) es hermano de <main>, no hijo.
 */
export interface PageConfig {
  before?: BlockList;
  main: BlockList;
  after?: BlockList;
}
