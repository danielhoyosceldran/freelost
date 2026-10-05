@AGENTS.md

# free lost — portfolio de Guillem Salvador

Rediseño del portfolio. La verdad de producto (cliente, marca, público, idiomas, alcance) está en
`PRODUCT.md`. Las decisiones visuales se registran en `DESIGN.md` cuando exista. El mockup v4 ya
no es referencia: se conserva el motor y se sustituye su aspecto.

**`BACKLOG.md` es el backlog de trabajo.** Léelo al empezar. Añade lo que quede pendiente al
terminar una tarea y marca lo que se cierre.

## Nunca arrancar el sitio desde Claude

El usuario lo ejecuta (`npm run dev`). Claude no arranca servidores ni abre la página en ningún
navegador embebido o automatizado, ni para "verificar". Sí se permiten `npx tsc --noEmit`,
`npm run lint` y `npm run build`, porque no sirven nada.

## Arquitectura (el motor que se conserva)

- **`content/pages/*.ts`:** `PageConfig = { before?, main, after? }`, listas de `{ type, props }`.
  `main` va dentro de `<main>`; `before` y `after` van fuera (loader, footer). Intercambiar
  bloques = editar las listas.
- **`blocks/<nombre>/index.ts`:** manifest vía
  `defineBlock({ type, schema (zod), Component, preload, critical })`.
  - Se registra en `blocks/registry.ts`, y `BlockEntry` se tipa solo a partir del registry.
  - Todo el copy entra por props, nunca hardcodeado en el componente. El copy vive en `content/`.
- **`core/BlockRenderer.tsx`:** `PageRenderer`. Es Server Component y `schema.parse` corre en el
  build.
- **`components/ui/`:** chrome global montado en `app/layout.tsx` y `Reveal`. Modales y toast se
  disparan con `useUI` (`core/ui/store.ts`).
- **`core/scroll/controller.ts`:** `scrollController` es el **único** que toca `window.scrollTo`,
  los pins, la captura de rueda/táctil/teclado y el `overflow` del body. Ningún bloque mueve el
  scroll por su cuenta, y cualquier librería de smooth-scroll o de animación ligada al scroll
  pasa por él.
- **`core/scroll/ScrollScene.tsx`:** spacer + sticky.
  - El progreso llega por suscripción (`useSceneProgress`), nunca como estado React.
  - Expone `seek(p)`, `yAt(p)` y `warm()`.
  - `useScrollMagnet` y `<ScrollGate>` viven dentro.
- **`core/lifecycle/`:** holds. Un bloque `holdsBelow` retiene a los `onWarm` de debajo
  (`useWarm()`) hasta `scene.warm()`. `BlockSlot` lo pone el renderer; los bloques no lo tocan.
- **`core/assets/registry.ts`:** lo que espera el loader. `BlockSlot` hace `expect(i)` de cada
  bloque `critical` en el primer commit, y el bloque entrega sus promesas con
  `useCriticalAssets()`.
- **`useReady()` (lifecycle):** marca el fin del loader, y las intros esperan a ella.
  - La pone el bloque con `ownsReady` (el loader).
  - Si la página no tiene ninguno, `PageRenderer` monta `<PageReady>`.
  - `LifecycleBoot` (layout) solo arranca el `scrollController`.
- **`lib/webgl`, `lib/three`:** motores imperativos sin React; los bloques solo los montan y
  desmontan. `destroy()` es idempotente porque StrictMode monta dos veces.
  - three.js va en un chunk aparte, cargado con `import()` cuando `useWarm()`.
- **Los bloques no se hablan entre sí** ni usan `CustomEvent`.
- **zod nunca en el cliente.**
  - Un módulo de cliente solo importa tipos (`import type`) de un fichero con schemas; los helpers
    van en un fichero aparte sin zod.
  - Comprobación tras el build: `grep -c ZodError` en los chunks que cita `out/index.html` debe
    dar 0.
- **CSS modules:** los nombres de clase que pone el JS deben aparecer en un selector con
  declaraciones, o no se exportan.
- **Tailwind v4:** tokens en `app/globals.css` (`@theme`). Las fuentes se cargan con `next/font` en
  `app/layout.tsx`.
- **`output: 'export'`:** nada que necesite servidor. Destino: Vercel.

## Media

`public/media/` contiene los originales del cliente (algunos de ~1 GB). El sitio sirve versiones
transcodificadas para web, nunca los originales. Más adelante los vídeos pasan a Vimeo.

Comentarios en español, explicando el porqué.
