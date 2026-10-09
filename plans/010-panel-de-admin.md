# 010 — Panel de administración (`/admingsz`)

- **Status**: BORRADOR (diseño). No hay código todavía. Decisiones abiertas al final (D1–D8).
- **Origen**: petición del 9/10/2026. Guillem tiene que poder pegar enlaces de imágenes y de Vimeo,
  cambiar los textos de la web y decidir qué proyectos se enseñan y con qué contenido.
- **Severity**: HIGH (cambia de dónde sale el contenido de todo el sitio)
- **Alcance previsto**: un modelo de contenido nuevo (`content/data/`), los `content/*.ts` pasan a
  leer de él, una ruta `/admingsz` con su propio layout raíz, un adaptador de almacenamiento y un
  paso de build que trae el contenido publicado.

## La restricción que manda: el sitio es un export estático

`output: 'export'`, `schema.parse` en el build y nada de servidor (CLAUDE.md, PRODUCT.md). Eso
descarta que la web pública lea el contenido en el navegador al cargar:

- perdería el prerender (el HTML llegaría vacío, peor LCP y peor SEO);
- zod tendría que validar en el cliente, o no validaría nadie;
- el loader y el hero dependen de saber sus medios antes de hidratar.

**Decisión de diseño:** el panel edita un **documento de contenido** (JSON con versión de
esquema). La web lo lee **en el build**, igual que hoy lee los `content/*.ts`. "Publicar" en el
panel = guardar la versión publicada + lanzar un nuevo build en Vercel (Deploy Hook). Un cambio
tarda lo que tarde el build (~1–2 min), y a cambio el sitio sigue siendo estático, rápido y
validado.

```
 panel /admingsz ──guardar──▶ almacén (borrador | publicado)
        │                            │
        └──publicar──▶ Deploy Hook ──▶ build en Vercel
                                      │  scripts/pull-content: trae el publicado
                                      │  → content/data/site.json
                                      ▼
                         content/*.ts → PageRenderer → schema.parse → out/
```

Sin almacén configurado (desarrollo, o mientras no se decida Firebase/Supabase), el build usa el
`content/data/site.json` del repo, que es la semilla con el copy de hoy. El sitio nunca depende
de que el almacén responda: si el pull falla, el build se para en vez de publicar algo vacío.

## Qué se podrá editar (y qué no)

El criterio es PRODUCT.md, principio 5 ("Swappable truth"): se edita la **verdad** (copy, medios,
qué proyectos), no la **puesta en escena** (tiempos, orden de las escenas, shaders). El orden de
la home no se toca desde el panel: «Lo que uso» tiene que ir pegado al carrete (`ENTRY_VH` en
`blocks/gear/Gear.tsx`) y el ritmo del plan 007 depende de ese montaje.

### 1. Proyectos (la parte principal)

Hoy son 12 llamadas a `film()` en `content/reel.ts` con títulos sacados de nombres de carpeta.
Pasan a ser registros:

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | slug | estable; lo genera el panel a partir del título, editable |
| `title` | texto por idioma | lo que hoy es `caption` |
| `client` | texto | opcional; no se traduce (nombre propio) |
| `year` | número | opcional |
| `category` | enum | ciclismo, triatlón, surf, escalada, viajes, corporativo… (D5) |
| `video` | Vimeo o MP4 | se pega el enlace de Vimeo; el panel saca `id` y `hash` |
| `cover` | URL de imagen | portada de la tarjeta (textura WebGL: tiene que mandar CORS) |
| `description` | texto largo por idioma | opcional; para la vista de proyecto / página de proyectos |
| `stills` | lista de URLs de imagen | opcional; fotos del rodaje (las de `public/media/fotos/` sin usar) |
| `credits` | lista `{ rol, nombre }` | opcional; solo lo que Guillem confirme (no inventar créditos) |
| `status` | `draft` \| `published` | un borrador nunca sale en la web |
| `inReel` | booleano + orden | si sale en el carrete de la home y en qué posición |
| `inArchive` | booleano | si sale en la página de todos los proyectos |

El carrete de la home sale de `projects.filter(inReel)` en su orden; la página de proyectos, de
`projects.filter(inArchive)`. Un proyecto se puede tener en el archivo sin ocupar sitio en la
home.

### 2. Inicio (hero)

- Película de fondo: **dos URLs de MP4 directo** (720p y 1080p) y el póster. **No acepta enlaces
  de Vimeo de página**: el hero es `<video>` nativo, el loader mide su búfer y es el LCP
  (CLAUDE.md). Si Guillem pega `vimeo.com/…`, el panel lo rechaza y explica qué pegar (enlace de
  fichero de Vimeo, si su plan lo da, o la URL del CDN).
- Descripción accesible de la película, por idioma (`filmLabel`).
- Nombre (`Guillem Salvador`) y rol (`Filmmaker`, pendiente de confirmar en el backlog).
- **No editable:** el rótulo FREE / LOST y el eslogan. Van dibujados (SVG en `content/words.ts`)
  y el morph depende de sus contornos. El eslogan es marca fija.

### 3. Sobre nosotros (About)

`title`, `lead`, `body[]` (párrafos, se pueden añadir y quitar), `closing`, `credit`, por idioma.
Foto opcional de Guillem (D8 del plan 009, aún abierta).

### 4. Lo que uso (equipo)

- Título de la sección, por idioma.
- Categorías: `name` y `tags[]` por idioma, y el **modelo 3D a elegir de una lista cerrada**
  (`camera`, `drone`, `laptop`), porque son modelos procedurales en `lib/three/gearModels.ts`. No se
  pueden subir modelos. Se pueden reordenar y quitar; añadir una cuarta solo si reutiliza un
  modelo existente (verificar que `GearMorph` aguanta N ≠ 3).

### 5. Contacto y redes

Título y subtítulo por idioma, correo, y la lista de redes `{ label, href }` (Instagram, Vimeo,
IMDb…). Así se cierran desde el panel tres tareas **[cliente]** del backlog (correo, URLs de redes,
`href` de los enlaces). Texto legal del pie.

### 6. Textos de interfaz (avanzado)

Las etiquetas pequeñas: `reelLabels`, labels del hero (Sonido, Pausa…), «Cargando», «Todos los
proyectos», «Volver», pistas de scroll y arrastre. Van plegadas al fondo: rara vez se tocan y
tienen límites de longitud (`.controls` del hero en móvil).

### Fuera del panel (a propósito)

Orden y presencia de bloques, tiempos de animación, colores y tipografías, el rótulo y el
eslogan dibujados, los modelos 3D, la configuración del CDN (`NEXT_PUBLIC_*`).

## Idiomas en el panel

Cada texto traducible es `{ en, ca, es }`. El inglés es obligatorio (es el idioma por defecto y
el original de Guillem); ca y es pueden faltar. En el build, lo que falte cae al inglés y queda
en un informe (`build` imprime los huecos). En el panel, un campo muestra las tres pestañas y un
punto en la que falte; la lista de proyectos marca los que tienen traducciones pendientes.

## Pegar enlaces: qué hace el panel con cada uno

**Vimeo.** Acepta `vimeo.com/123`, `vimeo.com/123/abcdef` (oculto), `player.vimeo.com/video/123?h=abcdef`
y `vimeo.com/channels/…/123`. Saca `vimeo` (id numérico, el regex de `blocks/reel/schema.ts`) y
`hash`. Con el oEmbed de Vimeo (`vimeo.com/api/oembed.json?url=…`) rellena de propuesta título,
duración y miniatura, y enseña el reproductor para confirmar que es el vídeo correcto.
La miniatura de Vimeo **solo sirve de vista previa**, no de portada: no garantiza CORS (ya lo
dice `schema.ts`). La portada se pega aparte.

**Imágenes.** Acepta una URL absoluta del proveedor (Cloudinary o Bunny, D3). Al pegarla, el
panel:

1. la carga con `crossOrigin="anonymous"` y la sube a un `<canvas>` WebGL de prueba: si falla, avisa
   de que esa imagen no puede ser portada del carrete (falta `Access-Control-Allow-Origin`);
2. lee ancho, alto y proporción, y avisa si es menor que `COVER_W` (1600 px) o no es 16:9 aprox.;
3. si la URL es del proveedor configurado, la guarda **como ruta relativa a su base** para que
   `imageUrl(path, width)` le siga poniendo el ancho y el formato. Si es de otro sitio, se guarda
   absoluta y se sirve tal cual (aviso: sin redimensionar).

`lib/media.ts` tiene que aceptar URLs absolutas (hoy siempre une base + ruta). Es un cambio
pequeño y sin zod, compatible con lo que hay.

**MP4 directos** (hero y proyectos sin Vimeo): comprueba que responde, que es `video/mp4` y que
`Content-Length` llega (lo usa el anillo de progreso de la vista de proyecto).

## Validación: un esquema, dos sitios

`content/data/schema.ts` define el documento con zod (versionado: `version: 1`). Lo usan:

- el build (`scripts/pull-content` y los `content/*.ts`), que además sigue pasando cada bloque
  por su `schema.parse`;
- el panel, para validar al guardar.

Esto choca con "zod nunca en el cliente". La regla protege el bundle de la **web pública**; el
panel es otra ruta con su propio layout raíz y sus propios chunks. Propuesta (D6): permitir zod
solo bajo `app/(admin)/`, y que la comprobación del build siga siendo `grep -c ZodError` sobre los
chunks de `out/index.html` y de `out/{en,ca,es}/index.html` (debe dar 0).

## Rutas y estructura

```
app/
  (root)/           layout raíz de "/"  (ya existe)
  [lang]/           layout raíz de la web pública (ya existe)
  (admin)/
    admingsz/
      layout.tsx    layout raíz propio: <html lang="es">, sin PageProgress, sin LifecycleBoot,
                    sin scrollController, sin las fuentes de la web. robots noindex.
      page.tsx      'use client': el panel entero es cliente (el export lo sirve como HTML vacío)
content/
  data/
    schema.ts       zod del documento (solo build y panel)
    types.ts        tipos inferidos, sin zod (para módulos de cliente)
    site.json       semilla = el copy de hoy; lo sobrescribe el pull en el build
admin/              el panel: componentes, formularios, adaptadores de almacén
  store/
    types.ts        interface ContentStore { load, saveDraft, publish, history }
    local.ts        localStorage + exportar/importar site.json (fase 1)
    supabase.ts | firebase.ts   (fase 3, D1)
scripts/
  pull-content.ts   prebuild: trae el publicado si hay credenciales; si no, deja la semilla
```

`admingsz` es segmento estático y gana a `[lang]` (`dynamicParams = false` no le afecta), pero
hay que confirmarlo con varios layouts raíz en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`
antes de escribir código. Navegar entre layouts raíz es recarga completa: no importa, no hay
enlace desde la web.

`/admingsz` no lleva enlace, va con `noindex` y fuera de cualquier sitemap. **Eso no es
seguridad**: en un export estático la página la puede abrir cualquiera. La protección real está
en el almacén (reglas de Firestore o RLS de Supabase), no en la ruta. Mientras esté "abierta", el
panel no debe poder escribir en ningún almacén remoto: por eso la fase 1 solo guarda en local.

## Diseño del panel

Herramienta de trabajo, no escaparate: no hereda la estética cinematográfica de la web ni su
motor de scroll. Escritorio primero (Guillem editará en el portátil), legible en móvil para
revisar. UI en castellano (D7).

```
┌───────────────┬─────────────────────────────────────────────┬──────────────┐
│ free lost     │ Proyectos                     [+ Nuevo]      │ Vista previa │
│ admin         │ ┌──┬───────────────┬──────┬──────┬───────┐   │  (tarjeta    │
│               │ │⋮⋮│ portada  Título │Carr.│Arch.│ ca es │   │   16:9 y     │
│ ● Proyectos   │ │⋮⋮│ [img]  Lofoten  │ ●  1│  ●  │  ·    │   │   reproduc-  │
│   Inicio      │ │⋮⋮│ [img]  Ironman  │ ●  2│  ●  │ ✓ ✓   │   │   tor Vimeo) │
│   Sobre       │ │⋮⋮│ [img]  Raz 6    │ ○   │  ●  │ ✓ ✓   │   │              │
│   Equipo      │ └──┴───────────────┴──────┴──────┴───────┘   │              │
│   Contacto    │                                              │              │
│   Textos      │                                              │              │
│ ───────────── │                                              │              │
│ Borrador      │                                              │              │
│ guardado 12:04│                                              │              │
│ [Publicar]    │                                              │              │
└───────────────┴─────────────────────────────────────────────┴──────────────┘
```

- **Proyectos:** lista con arrastre para el orden del carrete, interruptores "en carrete" y "en
  archivo", y avisos por fila (sin portada, portada sin CORS, traducción pendiente). Al abrir uno,
  un formulario en dos columnas: medios a la izquierda (pegar Vimeo, pegar portada, fotos) con su
  vista previa, textos por idioma a la derecha.
- **Guardado:** automático del borrador (con indicador de estado). "Publicar" enseña antes un
  resumen de cambios respecto a lo publicado (proyectos añadidos/quitados, textos cambiados) y
  bloquea si hay errores de validación.
- **Vista previa de la web:** fase 4. La opción buena es una ruta `/admingsz/preview` que monte
  los bloques reales con el borrador; requiere sacar `PageRenderer` del parse en servidor para
  ese caso, así que va aparte. Hasta entonces, vista previa por campo (tarjeta, reproductor,
  bloque de texto) y la web real tras publicar.

## Fases

| # | Fase | Resultado | Depende de |
| --- | --- | --- | --- |
| 0 | **Modelo de contenido** | `content/data/schema.ts` + `site.json` con el copy de hoy; `content/*.ts` leen de él; el sitio se construye igual que ahora (diff visual nulo). `lib/media.ts` acepta URLs absolutas. | — |
| 1 | **Panel local** | `/admingsz` con todas las secciones, validación, pegar enlaces (Vimeo, CORS, MP4), guardado en `localStorage` y **exportar `site.json`**. Para publicar: se reemplaza el fichero del repo y se hace commit. | 0 |
| 2 | **Build con contenido remoto** | `scripts/pull-content.ts` como `prebuild`; Deploy Hook de Vercel. | 0, D1, D2 |
| 3 | **Almacén y autenticación** | Adaptador Supabase o Firebase, login (enlace mágico o Google), reglas de escritura solo para el correo de Guillem, botón Publicar real, historial de versiones publicadas (volver a una anterior). | 1, 2, D1 |
| 4 | **Vista previa real** | `/admingsz/preview` con los bloques reales y el borrador. | 1 |

La fase 0 se puede hacer ya y no rompe nada; conviene hacerla antes de que crezca más
`content/`. La fase 1 deja a Guillem trabajar sin decidir proveedor.

## Decisiones abiertas

- **D1 — Almacén y auth.** Supabase (Postgres + RLS + Auth, el documento como fila JSONB con
  historial; recomendada: las reglas son SQL legible y el plan gratis basta) o Firebase (Firestore
  + Auth; igual de válido). Una tercera vía sin backend: el panel hace commit de `site.json` al
  repo con la API de GitHub (historial gratis en git, pero Guillem necesitaría cuenta de GitHub).
- **D2 — Quién lanza el build.** El Deploy Hook es una URL secreta: llamarla desde el navegador la
  expone (cualquiera podría lanzar builds). Mejor desde una función del proveedor (Edge Function
  de Supabase / Cloud Function) tras comprobar la sesión.
- **D3 — Proveedor de imágenes.** Ya en el backlog (Cloudinary recomendado). El panel no sube
  ficheros: Guillem sube a Cloudinary/Bunny y pega la URL. Subir desde el panel (widget de
  Cloudinary) sería una fase posterior.
- **D4 — ¿Proyectos solo foto?** El schema del carrete ya admite `kind: "photo"`. ¿Se permite un
  proyecto sin vídeo (p. ej. una serie de escalada)?
- **D5 — Categorías.** ¿Lista cerrada (para filtrar en la página de proyectos) o etiquetas libres?
- **D6 — zod en el panel.** Permitirlo bajo `app/(admin)/` y acotar la comprobación de `ZodError` a
  las páginas públicas (propuesto arriba).
- **D7 — Idioma del panel.** Castellano o catalán.
- **D8 — Contenido de la vista de proyecto.** Hoy abre la película a pantalla completa con su pie.
  Si se añaden descripción, fotos y créditos, ¿dónde se ven: en la vista de proyecto del carrete o
  solo en la página de todos los proyectos? Afecta al diseño de esos bloques más que al panel.

## Comprobaciones al implementar

- `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Tras el build: `grep -c ZodError` sobre los chunks de las páginas públicas = 0.
- Fase 0: `out/en/index.html` sin cambios respecto al de antes (mismo contenido).
- `out/admingsz/index.html` existe y lleva `noindex`.
- Feel check del panel con `npm run dev` lo hace el usuario.
