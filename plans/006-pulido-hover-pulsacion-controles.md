# 006 — Pulido: hover solo con puntero fino, feedback de pulsación y controles que no se clican invisibles

- **Status**: DONE (pendiente de feel check del usuario)
- **Commit**: ad330db
- **Severity**: LOW
- **Category**: Accesibilidad / Física / Propósito
- **Estimated scope**: 3 ficheros CSS, ~35 líneas. Va después del plan 003 (comparte `contact.module.css`).

## Problem

1. Los `:hover` con movimiento del contacto se disparan en táctil y se quedan pegados tras el toque:
   ```css
   /* blocks/contact/contact.module.css:115-120, 131-135, 164-166 — current */
   .mail:hover, .mail:focus-visible { background-size: 100% 1px, 100% 1px; }
   .mail:hover .arrow, .mail:focus-visible .arrow { translate: 0.08em -0.08em; color: var(--color-ember); }
   .channel:hover { color: var(--color-paper); }
   ```
2. Sin feedback de pulsación en los botones de sonido/pausa del hero y en el de cerrar del carrete:
   ```css
   /* blocks/hero/hero.module.css:99-114 — .control: solo transition: color 0.25s ease */
   /* blocks/reel/reel.module.css:363-378 — .close: solo transition: opacity 0.24s ease */
   ```
3. Los controles del hero (`.controls`) están a `opacity: 0` hasta 2,05 s después del velo, pero
   `.chrome > * { pointer-events: auto }` los deja clicables mientras son invisibles:
   ```css
   /* blocks/hero/hero.module.css:197-220 — current */
   .role, .slogan, .studio, .controls { opacity: 0; transform: translateY(10px); transition: opacity 0.9s …, transform 0.9s …; }
   .studio, .controls { transition-delay: 2.05s; }
   ```

## Target

**1. Hover solo con puntero fino**: los selectores `:hover` van dentro de
`@media (hover: hover) and (pointer: fine)`. `:focus-visible` queda **fuera** (teclado).

```css
/* contact.module.css */
.mail:focus-visible { background-size: 100% 1px, 100% 1px; }
.mail:focus-visible .arrow { translate: 0.08em -0.08em; color: var(--color-ember); }
@media (hover: hover) and (pointer: fine) {
  .mail:hover { background-size: 100% 1px, 100% 1px; }
  .mail:hover .arrow { translate: 0.08em -0.08em; color: var(--color-ember); }
  .channel:hover { color: var(--color-paper); }
}
```

**2. Pulsación**: `scale: 0.96` en `:active` con 140 ms y `cubic-bezier(0.23, 1, 0.32, 1)`
(`var(--ease-out)` si existe). La propiedad individual `scale` no pisa los `transform` existentes.

```css
/* hero.module.css, en .control */
transition: color 0.25s ease, scale 0.14s cubic-bezier(0.23, 1, 0.32, 1);
/* … y */
.control:active { scale: 0.96; }

/* reel.module.css, en .close */
transition: opacity 0.24s ease, scale 0.14s cubic-bezier(0.23, 1, 0.32, 1);
/* … y */
.close:active { scale: 0.96; }
```

**3. Controles inertes hasta que se ven**: `pointer-events` se activa justo cuando empieza a verse
el fundido (mismo retardo que su entrada).

```css
/* hero.module.css — después de la regla de :217-220 (.studio, .controls) */
.controls {
  pointer-events: none;
  /* pointer-events es discreta: con 0.01s salta justo al llegar el retardo de la entrada. */
  transition:
    opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.9s cubic-bezier(0.16, 1, 0.3, 1),
    pointer-events 0.01s linear;
  transition-delay: 2.05s; /* calc(var(--t-veil) + 0.95s) si el plan 001 está aplicado */
}
.hero[data-ready] .controls { pointer-events: auto; }
```

El bloque de movimiento reducido (`hero.module.css:263-273`) ya fija `transition: opacity 0.4s ease`
y `transition-delay: 0s` para `.controls`: con eso `pointer-events` pasa a `auto` al instante.

## Repo conventions to follow

- Hero y carrete son CSS modules con estado por atributo/clase (`data-ready`, `.revealed`).
- Tokens (`--ease-out`, etc.) si el plan 001 está aplicado; si no, curvas literales.

## Steps

1. `contact.module.css`: reorganiza los `:hover` según 1. No toques `.arrow`, `.mail` base ni lo
   que haya cambiado el plan 003.
2. `hero.module.css`: amplía la transición de `.control` y añade `.control:active`. Añade la regla
   de `.controls` de 3.
3. `reel.module.css`: amplía la transición de `.close` y añade `.close:active`.
4. En el bloque `prefers-reduced-motion` de `hero.module.css`, comprueba que `.controls` sigue
   recibiendo `transition: opacity 0.4s ease` (ya está). Con movimiento reducido el `:active`
   conserva el `scale`: es feedback, no desplazamiento.

## Boundaries

- No cambies colores ni tamaños.
- No toques `.chrome > *` (el header necesita `pointer-events: auto`).
- No arranques el sitio; el usuario lo ejecuta.
- Si el CSS no coincide con lo citado, para y avisa.

## Verification

- **Mecánica**: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Feel check (lo hace el usuario)**:
  - en un móvil real, tocar el correo no deja el subrayado ni la flecha pegados; con teclado
    (Tab) el subrayado y la flecha sí se activan;
  - pulsar sonido, pausa y cerrar da un hundimiento sutil de 140 ms al pulsar y vuelve al soltar;
  - recargar y clicar donde estarán los botones del hero antes de que aparezcan no hace nada;
    cuando se ven, responden;
  - con `prefers-reduced-motion`, los botones responden desde el primer momento visible.
- **Done when**: ningún `:hover` con movimiento queda fuera del `@media`, los tres botones
  responden a `:active`, y los controles del hero no se clican invisibles.
