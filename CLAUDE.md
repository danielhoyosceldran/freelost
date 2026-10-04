@AGENTS.md

# portfolio/web

Migración a Next.js de `../mockup/v4/portfolio_filmmaker_naturaleza_deporte.html`. Objetivo actual:
**paridad 1:1 con v4**, nada más. v4 es la referencia visual y de comportamiento.

## Nunca arrancar el sitio desde Claude

El usuario lo ejecuta (`npm run dev`). Claude no arranca servidores ni abre la página en ningún
navegador embebido o automatizado, ni para "verificar". Sí se permiten `npx tsc --noEmit`,
`npm run lint` y `npm run build` (no sirven nada).

## Arquitectura

- `content/pages/*.ts` — `PageConfig = { before?, main, after? }`, listas de `{ type, props }`. `main` va
  dentro de `<main>`, `before`/`after` fuera (loader, footer). Intercambiar bloques = editar las listas.
- `blocks/<nombre>/index.ts` — manifest vía `defineBlock({ type, schema (zod), Component, preload, critical })`.
  Registrar en `blocks/registry.ts`; `BlockEntry` se tipa solo a partir del registry. Todo el copy entra
  por props, nunca hardcodeado en el componente; el copy largo vive en `content/*.ts`.
- `core/BlockRenderer.tsx` — `PageRenderer`; Server Component, `schema.parse` corre en el build.
- `components/ui/` — chrome global montada en `app/layout.tsx` (Cursor, Modal, Toast) y `Reveal`
  (sustituye a `.scroll-reveal` + observer global). Modales y toast se disparan con `useUI` (`core/ui/store.ts`).
- Clases propias de v4 (`.glass-card`, `.btn-flat-gold`, `.action-pill`, `.scroll-reveal`…) en
  `app/globals.css` dentro de `@layer components`: las utilidades del mismo elemento ganan.
- `core/scroll/controller.ts` — `scrollController`, **único** que toca `window.scrollTo`, pins (clavar la
  página), captura de rueda/táctil/teclado y `overflow` del body. Ningún bloque mueve el scroll por su cuenta.
- `core/scroll/ScrollScene.tsx` — spacer + sticky; progreso por suscripción (`useSceneProgress`), nunca
  estado React. `seek(p)`, `yAt(p)`, `warm()`. `useScrollMagnet` (imán) y `<ScrollGate>` (puerta) viven dentro.
- `core/lifecycle/` — holds: un bloque `holdsBelow` retiene a los `onWarm` de debajo (`useWarm()`) hasta
  `scene.warm()`. Sustituye a `actone:warm`. `BlockSlot` lo pone el renderer; los bloques no lo tocan.
- `core/assets/registry.ts` — lo que espera el loader: `BlockSlot` hace `expect(i)` de cada bloque
  `critical` en el primer commit; el bloque entrega sus promesas con `useCriticalAssets()`.
- `useReady()` (lifecycle) sustituye a `loader:done`; las intros esperan a ella. La pone el bloque con
  `ownsReady` (loader); si la página no tiene ninguno, `PageRenderer` monta `<PageReady>` (decidido en el
  build, no por orden de efectos). `LifecycleBoot` (layout) solo arranca el scrollController.
- Paridad con Tailwind v3 de v4: grises v3 en `@theme`, `cursor: pointer` en botones (preflight v3). Ojo
  al portar clases: en v4 `*-sm` de blur/shadow/rounded equivale al `*-xs` actual.
- `PageConfig.before` va fuera de `<main>`: ahí el loader, que debe tapar al cursor.
- `content/reel.ts` — datos del carrete. Los bloques no se hablan entre sí ni usan `CustomEvent`.
- `blocks/reel/` — acto I. `lib/webgl/flex-carousel/FlexCarousel.ts` es el motor WebGL2 (port 1:1 de
  `actOneCarrusel()`), `project.ts` la vista de proyecto (imperativa a propósito), `Reel.tsx` solo los
  conecta al núcleo. Su contrato de datos (`slides.ts`) vive en el bloque. Los nombres de clase que el JS
  pone (fases) deben aparecer en un selector con declaraciones del CSS module, o no se exportan.
- Schemas que usan los manifests (p. ej. `gateSchema`) van en ficheros sin `"use client"`.
- **zod nunca en el cliente**: un módulo de cliente solo importa tipos (`import type`) de un fichero con
  schemas. Si necesita helpers, van en un fichero aparte sin zod (ver `blocks/reel/schema.ts` vs `slides.ts`).
  Comprobar tras el build: `grep -c ZodError` en los chunks que cita `out/index.html` debe dar 0.
- `blocks/gear/` — visores 3D. `GearCanvas` importa `lib/three/GearViewer` con `import()` dinámico cuando
  `useWarm()` (three.js, ~566 KB, chunk aparte); cada visor baja su `.glb` (`public/models/`) por
  IntersectionObserver a 200px. `GearViewer` crea y borra su propio canvas.
- `lib/webgl`, `lib/three` — motores imperativos sin React; los bloques solo los montan/desmontan.
  `destroy()` idempotente (StrictMode monta dos veces).
- Tokens de diseño en `app/globals.css` (`@theme`, Tailwind v4); fuentes con `next/font` en `app/layout.tsx`.
- `output: 'export'`: nada que necesite servidor.

Comentarios en español, explicando el porqué. Estética plana: radio 0, bordes ultrafinos.
