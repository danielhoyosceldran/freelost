# 001 — Tokens de easing y de tiempos del hero

- **Status**: DONE (pendiente de feel check del usuario)
- **Commit**: ad330db
- **Severity**: MEDIUM
- **Category**: Cohesión y tokens
- **Estimated scope**: 4 ficheros CSS, sustitución mecánica (sin cambio de feel)

## Problem

Hay siete curvas escritas a mano y casi iguales, repetidas por los CSS, y ninguna es un token. Los
retardos de la entrada del hero dependen del `1.1s` del velo del loader, escrito en otro fichero:
si se cambia uno, se desincroniza el otro.

```css
/* app/globals.css:169 — current */
transition: transform 1.1s cubic-bezier(0.7, 0, 0.2, 1);

/* blocks/hero/hero.module.css:71 — current */
transition: transform 1.3s cubic-bezier(0.65, 0, 0.15, 1) 1.05s;

/* blocks/hero/hero.module.css:191-194 — current */
.word {
  transform: translateY(105%);
  transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: calc(1.35s + var(--i, 0) * 0.09s);
}
/* hero.module.css:208-219 — current: .role 1.7s, .slogan 1.82s, .studio/.controls 2.05s */
```

Curvas repetidas hoy: `(0.16,1,0.3,1)` unas 12 veces (hero, reel, contact), `(0.22,1,0.36,1)`
×4 (reel.module.css `.digitReel`, `.enter`; globals), `(0.23,1,0.32,1)` ×2 (globals `pl-lock`,
`pl-hit`).

## Target

Los tokens van en un bloque `:root` de `app/globals.css`, **no en `@theme`**. Tailwind v4 solo emite
las variables de `@theme` que ve usadas en sus utilidades, y los CSS modules se procesan aparte:
una `var(--ease-out)` en un módulo podría no resolver. `:root` es como ya están `--mark-h` y
`--gutter`.

```css
/* app/globals.css — dentro del :root existente (línea ~40), después de --gutter */
  /* Curvas de la casa. */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1); /* UI que entra o sale */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1); /* las entradas largas del hero/contacto/reel */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* movimiento en pantalla (usos nuevos) */
  /* Duración del velo del loader: de ella cuelga toda la entrada del hero. */
  --t-veil: 1.1s;
```

Sustituciones exactas:

| Antes | Después |
| --- | --- |
| `cubic-bezier(0.16, 1, 0.3, 1)` | `var(--ease-out-expo)` |
| `cubic-bezier(0.22, 1, 0.36, 1)` y `cubic-bezier(0.23, 1, 0.32, 1)` (fuera de keyframes `pl-drop`/`pl-rise`) | `var(--ease-out)` |
| `transition: transform 1.1s cubic-bezier(0.7, 0, 0.2, 1)` (`.pl-veil`) | `transition: transform var(--t-veil) cubic-bezier(0.7, 0, 0.2, 1)` |

Retardos del hero (mismos valores que hoy, derivados del velo):

```css
.markFlying { transition: transform 1.3s cubic-bezier(0.65, 0, 0.15, 1) calc(var(--t-veil) - 0.05s); } /* 1.05s */
.word { transition-delay: calc(var(--t-veil) + 0.25s + var(--i, 0) * 0.09s); }                        /* 1.35s */
.role { transition-delay: calc(var(--t-veil) + 0.6s); }                                               /* 1.7s  */
.slogan { transition-delay: calc(var(--t-veil) + 0.72s); }                                            /* 1.82s */
.studio, .controls { transition-delay: calc(var(--t-veil) + 0.95s); }                                 /* 2.05s */
```

## Repo conventions to follow

- Comentarios en español, explicando el porqué.
- `:root` de `app/globals.css:40-46` es el sitio de las variables compartidas (`--mark-h`, `--gutter`).
- Las tres curvas de coreografía del loader/hero son deliberadas y se **quedan literales**:
  `(0.7,0,0.2,1)` (velo), `(0.65,0,0.15,1)` (vuelo de la marca), `(0.65,0,0.35,1)` (crecimiento del
  marco, ver plan 005), `(0.22,0.61,0.36,1)` (`--reel-split-ease`), y las dos curvas dentro de los
  `@keyframes pl-drop`/`pl-rise`.

## Steps

1. En `app/globals.css`, añade los cuatro tokens al `:root`. En `.pl-veil` (línea 169) usa
   `var(--t-veil)` en lugar de `1.1s`. En `pl-lock` (línea 196) y `pl-hit` (197) sustituye
   `cubic-bezier(0.23, 1, 0.32, 1)` por `var(--ease-out)`. En `.scroll-reveal` (118) no toques nada:
   es código muerto de v4 que se va con la limpieza del backlog.
2. En `blocks/hero/hero.module.css`, sustituye las curvas `(0.16,1,0.3,1)` por `var(--ease-out-expo)`
   (líneas 193, 204, 205) y reescribe los retardos según la tabla de arriba.
3. En `blocks/reel/reel.module.css`, sustituye `(0.16,1,0.3,1)` (`.title`, líneas 68-69) por
   `var(--ease-out-expo)` y `(0.22,1,0.36,1)` (`.digitReel` línea 181, `.enter` línea 196) por
   `var(--ease-out)`.
4. En `blocks/contact/contact.module.css`, sustituye todas las `(0.16,1,0.3,1)` (líneas 35, 90, 127,
   181) por `var(--ease-out-expo)`.
5. `grep -rn "cubic-bezier" app blocks` y confirma que solo quedan las curvas literales de la lista
   de "Repo conventions" y las de los tokens.

## Boundaries

- No cambies duraciones ni retardos que no estén en esta lista.
- No toques los `@keyframes` del loader (`pl-drop`, `pl-rise`).
- No borres código muerto de v4.
- No arranques el sitio (regla de `CLAUDE.md`); el usuario lo ejecuta.
- Si una línea no coincide con lo citado (deriva desde el commit), para y avisa.

## Verification

- **Mecánica**: `npx tsc --noEmit`, `npm run lint`, `npm run build`: sin errores.
  `grep -rn "var(--ease-" blocks app` debe mostrar el uso de los tokens en los cuatro ficheros.
- **Feel check (lo hace el usuario con `npm run dev`)**: la secuencia de carga → hero → carrete →
  contacto se ve **idéntica** a antes (la sustitución es mecánica). Si la entrada del hero
  cambia de ritmo, algún `calc()` está mal.
- **Done when**: no queda ninguna `cubic-bezier(0.16, 1, 0.3, 1)` ni `(0.22, 1, 0.36, 1)` literal
  fuera de los keyframes del loader, y los retardos del hero salen de `--t-veil`.
