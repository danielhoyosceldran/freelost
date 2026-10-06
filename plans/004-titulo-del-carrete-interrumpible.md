# 004 — El título del pie del carrete no se reinicia a cada tarjeta

- **Status**: DONE (pendiente de feel check del usuario)
- **Commit**: ad330db
- **Severity**: MEDIUM
- **Category**: Interrumpibilidad
- **Estimated scope**: 2 ficheros (`Reel.tsx`, `reel.module.css`), ~25 líneas

## Problem

El título de cada tarjeta entra con un `@keyframes` que se reinicia con un reflow forzado cada vez
que cambia la tarjeta activa. Al arrastrar rápido el título salta a opacidad 0 una y otra vez y
parpadea; además `offsetWidth` fuerza layout en cada cambio.

```tsx
// blocks/reel/Reel.tsx:62-68 — current
const place = placeRef.current;
if (place) {
  place.textContent = slides[i].caption;
  place.classList.remove(styles.enter);
  void place.offsetWidth; // reinicia la animación de entrada del título
  place.classList.add(styles.enter);
}
```

```css
/* blocks/reel/reel.module.css:195-207 — current */
.enter { animation: reel-title 0.52s cubic-bezier(0.22, 1, 0.36, 1); }
@keyframes reel-title {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## Target

Una transición CSS, que se reorienta desde el estado en que esté, y un temporizador corto:

- Al cambiar de tarjeta: el título se pone ya en estado oculto (`opacity: 0`, `translate: 0 8px`),
  **sin transición**, y se cambia el texto.
- 80 ms después del **último** cambio, se quita el estado oculto y el título entra con
  `transition: opacity 240ms ease-out, translate 240ms ease-out` (curva
  `cubic-bezier(0.23, 1, 0.32, 1)`).
- Si la cinta va rápida, el título se queda oculto y entra cuando se asienta; sin parpadeos y sin
  reflow forzado.

```css
/* blocks/reel/reel.module.css — sustituye .enter y @keyframes reel-title (líneas 195-207) */
.place {
  /* …declaraciones existentes… */
  opacity: 1;
  translate: 0 0;
  transition:
    opacity 0.24s cubic-bezier(0.23, 1, 0.32, 1),
    translate 0.24s cubic-bezier(0.23, 1, 0.32, 1); /* tokens: var(--ease-out) */
}
/* Estado de cambio: se aplica sin transición (el texto ya es el nuevo) y se suelta pasado un
   instante desde el último cambio. */
.swapping {
  opacity: 0;
  translate: 0 8px;
  transition: none;
}
```

(Añade esas tres declaraciones al `.place` que ya existe en la línea 186; no dupliques el
selector.)

```tsx
// blocks/reel/Reel.tsx — setCaption
const SWAP_SETTLE_MS = 80; // junto a las otras constantes de arriba del fichero
// …
const swapTimer = useRef(0);
// dentro de setCaption:
const place = placeRef.current;
if (place) {
  place.textContent = slides[i].caption;
  place.classList.add(styles.swapping);
  clearTimeout(swapTimer.current);
  // Se suelta tras el último cambio: con la cinta rápida el título espera y entra al asentarse.
  swapTimer.current = window.setTimeout(() => place.classList.remove(styles.swapping), SWAP_SETTLE_MS);
}
```

Y en el cleanup del `useEffect` principal (línea ~220): `clearTimeout(swapTimer.current);`.

## Repo conventions to follow

- `Reel.tsx` es imperativo: todo va por refs y `classList`, sin estado React.
- Los nombres de clase del CSS module solo se exportan si aparecen en un selector con
  declaraciones: `.swapping` lo cumple.
- Movimiento reducido: el bloque de `reel.module.css:425-435` ya anula `.enter`; sustituye
  `.enter { animation: none }` por añadir `.place` a la lista con `transition: none` (arriba:
  `.caption, .title, .digitReel, .media > *`).

## Steps

1. En `reel.module.css`: borra `.enter` y `@keyframes reel-title`; añade `opacity`, `translate` y
   `transition` a `.place`; añade `.swapping`.
2. En el bloque `prefers-reduced-motion`, quita `.enter {animation:none}` y añade `.place` a la
   lista `transition: none`.
3. En `Reel.tsx`: elimina `styles.enter` y el `void place.offsetWidth`; añade `SWAP_SETTLE_MS`,
   `swapTimer` y la lógica de arriba; limpia el temporizador en el cleanup del efecto.
4. `grep -rn "styles.enter\|reel-title" blocks` → 0 resultados.
5. Primera llamada (`setCaption(0)` al arrancar, `onActive` inicial): no debe dejar el título
   oculto para siempre; el temporizador lo suelta a los 80 ms. Verifica que el título del primer
   proyecto aparece.

## Boundaries

- No toques los dígitos del contador (`.digitReel` ya usa transición y se reorienta bien).
- No cambies `FlexCarousel.ts`.
- No arranques el sitio; el usuario lo ejecuta.
- Si el código no coincide con lo citado, para y avisa.

## Verification

- **Mecánica**: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Feel check (lo hace el usuario)**:
  - arrastra despacio: cada título sube 8 px y aparece en ~240 ms;
  - arrastra muy rápido de un lado a otro: el título **no parpadea**, se queda oculto y aparece
    cuando la cinta se asienta;
  - con DevTools a 10 %, la entrada es una sola transición, no un reinicio desde cero;
  - con `prefers-reduced-motion`, el título cambia sin movimiento.
- **Done when**: no hay parpadeo del título al arrastrar y ya no hay reflow forzado en
  `setCaption`.
