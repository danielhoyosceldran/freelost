/**
 * De dónde salen los medios. Todo el sitio pide sus URLs aquí, así que pasar de servirlos desde
 * public/ a un CDN es cambiar variables de entorno, no contenido ni componentes.
 *
 * Sin zod y sin nada de servidor: lo importan el contenido (build) y los bloques (cliente). Las
 * variables son NEXT_PUBLIC_ y se leen con acceso literal porque Next las sustituye en el build;
 * desestructurar process.env las dejaría sin definir en el navegador.
 *
 *   NEXT_PUBLIC_VIDEO_BASE     base de los MP4 directos (hero y películas sin Vimeo)
 *   NEXT_PUBLIC_IMAGE_BASE     base de las imágenes
 *   NEXT_PUBLIC_IMAGE_PROVIDER local | cloudinary | bunny
 *
 * Sin variables, todo sale de public/media/web, como en v1.
 */

const LOCAL = "/media/web";

const VIDEO_BASE = trim(process.env.NEXT_PUBLIC_VIDEO_BASE || LOCAL);
const IMAGE_BASE = trim(process.env.NEXT_PUBLIC_IMAGE_BASE || LOCAL);
const IMAGE_PROVIDER = (process.env.NEXT_PUBLIC_IMAGE_PROVIDER || "local") as "local" | "cloudinary" | "bunny";

function trim(base: string) {
  return base.replace(/\/+$/, "");
}

/** Une base y ruta codificando cada tramo (hay carpetas del cliente con espacios). */
function join(base: string, path: string) {
  return `${base}/${path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}`;
}

/** MP4 servido tal cual (faststart). Vimeo va por su propio reproductor (blocks/reel/vimeo.ts). */
export const videoUrl = (path: string) => join(VIDEO_BASE, path);

/**
 * Imagen al ancho pedido y en el mejor formato que acepte el navegador. El export estático no
 * puede redimensionar, así que lo hace el proveedor; en local se sirve el fichero como está.
 *
 * El proveedor tiene que mandar CORS (Access-Control-Allow-Origin): las portadas del carrete son
 * texturas WebGL y sin esa cabecera el lienzo queda "contaminado" y la textura no sube.
 */
export function imageUrl(path: string, width?: number) {
  const url = join(IMAGE_BASE, path);
  if (!width || IMAGE_PROVIDER === "local") return url;
  if (IMAGE_PROVIDER === "cloudinary") {
    // Base: https://res.cloudinary.com/<cloud>/image/upload[/<carpeta>]. Las transformaciones van
    // justo detrás de /upload/, antes de la carpeta. c_limit nunca amplía el original.
    const tx = `f_auto,q_auto,c_limit,w_${width}`;
    return join(IMAGE_BASE.replace(/\/upload(?=\/|$)/, `/upload/${tx}`), path);
  }
  // Bunny Optimizer: el formato (AVIF/WebP) lo negocia el CDN con la cabecera Accept.
  return `${url}?width=${width}&quality=82`;
}

/**
 * Orígenes externos de medios, para abrir la conexión antes de pedir nada. Las imágenes van con
 * CORS (texturas), los vídeos sin él: el navegador no reutiliza una conexión entre los dos modos.
 */
export function mediaOrigins() {
  const origin = (base: string) => (/^https?:\/\//.test(base) ? new URL(base).origin : null);
  return { image: origin(IMAGE_BASE), video: origin(VIDEO_BASE) };
}
