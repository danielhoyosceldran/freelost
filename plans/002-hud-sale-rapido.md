# 002 — El HUD del carrete sale rápido al abrir un proyecto

- **Status**: DONE (pendiente de feel check del usuario)
- **Commit**: ad330db
- **Severity**: MEDIUM
- **Category**: Física y asimetría de tiempos
- **Estimated scope**: 1 fichero CSS, ~12 líneas

## Problem

Al abrir un proyecto el HUD (pie con contador y título, marca, título de sección) se apaga con las
mismas transiciones lentas con las que entró: 0,9 s el pie y el título, 0,6 s la marca. El marco
crece en 0,6 s, así que el HUD sigue visible, ya medio opaco, sobre la película que está creciendo.
La salida debe responder más rápido que la entrada.

```css
/* blocks/reel/reel.module.css:142 — current */
.caption { … opacity: 0; transition: opacity 0.9s ease; }
/* :87 */
.marker { … transition: opacity 0.6s ease; }
/* :67-69 */
.title { … transition: opacity 0.9s var(--ease-out-expo) /* o cubic-bezier(0.16,1,0.3,1) si el plan 001 no se ha aplicado */, translate 0.9s …; }

/* :401-408 — current */
.splitting .caption,
.splitting .marker,
.splitting .title,
.inProject .caption,
.inProject .marker,
.inProject .title {
  opacity: 0;
}
```

## Target

La entrada no cambia. Al entrar en `.splitting` o `.inProject`, el HUD se apaga en 180 ms con
ease-out y sin retardo.

```css
/* blocks/reel/reel.module.css — sustituye el bloque de :401-408 */
.splitting .caption,
.splitting .marker,
.splitting .title,
.inProject .caption,
.inProject .marker,
.inProject .title {
  opacity: 0;
  /* La salida responde más rápido que la entrada: el HUD no debe seguir ahí mientras el marco
     crece sobre él. */
  transition-duration: 0.18s;
  transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1); /* var(--ease-out) si existe */
  transition-delay: 0s;
}
```

`transition-duration` con un solo valor se aplica a todas las propiedades de la lista
(`opacity` y `translate` en `.title`). La regla debe quedar **después** de `.revealed .caption` /
`.arrived .title` / `.revealed .marker` en el fichero (hoy ya es así) para ganar por orden con la
misma especificidad.

## Repo conventions to follow

- Estados del carrete = clases que pone el JS en `.root` (`arrived`, `revealed`, `splitting`,
  `inProject`); el CSS reacciona a ellas.
- Si el plan 001 ya está aplicado, usa `var(--ease-out)`; si no, la curva literal.

## Steps

1. En `blocks/reel/reel.module.css`, añade las tres declaraciones de arriba al bloque que va de la
   línea 401 a la 408. No cambies ninguna otra regla.
2. En el bloque `@media (prefers-reduced-motion: reduce)` (línea ~425) añade `.marker` a la lista
   que ya tiene `transition: none` (`.caption, .title, .digitReel, .media > *`).

## Boundaries

- No toques la entrada (`.arrived .title`, `.revealed .caption`, `.revealed .marker`).
- No toques `.close`, `.frame` ni `.growing` (plan 005).
- No arranques el sitio; el usuario lo ejecuta.
- Si el bloque no coincide con lo citado, para y avisa.

## Verification

- **Mecánica**: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Feel check (lo hace el usuario)**: llega al carrete, espera a que entre el HUD, pulsa una
  tarjeta:
  - el pie, el contador y el título desaparecen casi al instante, antes de que el marco llegue a
    media pantalla;
  - al cerrar el proyecto, el HUD reaparece con su entrada lenta de siempre (0,9 s);
  - en DevTools → Animations a 10 %, la opacidad baja en ~180 ms y sube en ~900 ms;
  - con `prefers-reduced-motion` no hay movimiento (solo el corte de opacidad, instantáneo).
- **Done when**: el HUD ya no es visible a mitad del crecimiento del marco.
