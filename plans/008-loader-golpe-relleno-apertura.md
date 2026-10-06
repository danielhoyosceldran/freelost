# 008 — Loader: golpe, relleno y apertura en un solo gesto

- **Status**: HECHO (pendiente del feel check del usuario)
- **Commit**: 08b27fb (con cambios sin commitear en `blocks/loader/PageLoader.tsx`: el `handoff`/`covered`; este plan no los toca)
- **Severity**: HIGH
- **Category**: Easing y duración / Cohesión
- **Estimated scope**: 4 ficheros (`app/globals.css`, `blocks/loader/PageLoader.tsx`, `blocks/loader/index.ts`, `DESIGN.md`), unas 40 líneas

## Problem

El usuario (dueño del proyecto) pide una aparición **rápida, impactante y precisa** que **se rellene y continúe**. Ahora
tarda unos 3 s con caché llena, cambia de color cinco veces y tiene un "clic" que tiembla.

Línea de tiempo actual:

| t | Qué pasa | Color |
|---|---|---|
| 0.2 → 1.5 s | Entrada de 1.3 s; las hojas se pasan un 3.5% y vuelven | gris 9% |
| 1.45 s | Destello del fondo (9% → 55% → 9%) y la marca crece a 1.05, **50 ms antes** de que las hojas se asienten | blanco |
| 1.5 s | Arranca el relleno mientras el destello aún se apaga (dura hasta 2.05 s) | blanco + ember |
| ~2.95 s | El relleno llega al 100% tras una cola exponencial de ~0.5 s que frena | ember |
| 3.5 → 3.95 s | La marca ember se funde (`ease`, con 0.55 s de espera) sobre la blanca del hero | blanco |

1. **El clic raro.** Destello y pulso empiezan durante la vuelta del sobrepaso: se pasa → vuelve → crece → encoge,
   tres cambios de dirección en medio segundo.

   ```css
   /* app/globals.css:198-229 — actual */
   /* Entrada: cada trazo recorre su camino vertical por la costura, se pasa y encaja. */
   .pl-blade-f { animation: pl-drop 1.3s 0.2s both; }
   .pl-blade-l { animation: pl-rise 1.3s 0.2s both; }
   /* El clic llega cuando los trazos se asientan (0.2s + 1.3s): sin borde que encender, el golpe lo
      dan el destello del fondo y un pulso de escala de la marca entera. */
   .pl-blade .pl-outline { animation: pl-lock 0.6s var(--ease-out) 1.45s both; }
   .pl-mark { animation: pl-hit 0.5s var(--ease-out) 1.45s both; }

   /* Sobrepaso del 3.5% (antes 1.6%): las dos mitades se cruzan de forma visible antes de encajar. */
   @keyframes pl-drop {
     0% { transform: translateY(-100vh); animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1); }
     78% { transform: translateY(3.5%); animation-timing-function: cubic-bezier(0.5, 0, 0.2, 1); }
     100% { transform: translateY(0); }
   }
   @keyframes pl-rise {
     0% { transform: translateY(100vh); animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1); }
     78% { transform: translateY(-3.5%); animation-timing-function: cubic-bezier(0.5, 0, 0.2, 1); }
     100% { transform: translateY(0); }
   }
   /* El fondo se enciende de golpe y se disipa. */
   @keyframes pl-lock {
     0% { fill: rgb(238 241 240 / 0.09); }
     10% { fill: rgb(238 241 240 / 0.55); }
     100% { fill: rgb(238 241 240 / 0.09); }
   }
   /* Impacto: la marca se hincha un instante y vuelve. Solo transform, la propiedad translate que
      centra .brand-mark no se toca. */
   @keyframes pl-hit {
     0% { transform: scale(1); }
     14% { transform: scale(1.05); }
     100% { transform: scale(1); }
   }
   ```

2. **El relleno frena al final.** Un filtro exponencial persigue a un objetivo que sube en rampa: va siempre un
   ~16% por detrás y acaba con una cola que decelera. Parece que "se queda pensando" antes de abrir.

   ```ts
   // blocks/loader/PageLoader.tsx:12 — actual
   const EASE = 7; // 1/s: suavizado de lo mostrado hacia lo real
   ```
   ```ts
   // blocks/loader/PageLoader.tsx:99-105 — actual
         // Lo real, pero sin ir más rápido que minMs desde que encajan: así el relleno siempre se
         // ve subir aunque todo venga de caché. Pasado maxMs se da por cargado.
         const real = elapsed >= maxMs ? 1 : done / total;
         const pace = fillFrom < 0 ? 0 : (ts - fillFrom) / minMs;
         const target = Math.min(real, pace);
         shown += (target - shown) * (1 - Math.exp(-EASE * dt));
         if (target >= 1 && 1 - shown < 0.004) shown = 1;
   ```

3. **Un hueco entre el relleno y la apertura.** La curva del velo, `cubic-bezier(0.7, 0, 0.2, 1)`, pasa los
   primeros ~150 ms casi parada, y la marca espera 0.55 s antes de fundirse.

   ```css
   /* app/globals.css:176 — actual (dentro de .pl-veil) */
     transition: transform var(--t-veil) cubic-bezier(0.7, 0, 0.2, 1);
   ```
   ```css
   /* app/globals.css:185 — actual */
   .pl-mark { transition: opacity 0.45s ease 0.55s; }
   ```

4. `blocks/loader/index.ts:10` — `minMs: z.number().default(900),`

## Target

Tres tiempos sin solaparse, con un cambio de color por tiempo:
**golpe** (gris) → **relleno** (ember, lineal) → **apertura** (el ember se funde a blanco encima del velo que se abre).

| t (con caché) | Qué pasa |
|---|---|
| 0.1 → 0.7 s | Las hojas entran en 0.6 s y frenan en seco en su sitio. Sin sobrepaso, destello ni pulso. |
| 0.7 s | El relleno ember arranca en el mismo frame en que encajan. |
| 0.7 → 1.4 s | El relleno sube a velocidad constante (700 ms mínimo) y llega al 100% sin frenar. |
| 1.4 s | El velo arranca con velocidad; la marca ember se funde a blanco en 0.3 s (de 1.55 a 1.85 s). |

Valores exactos:

- Entrada: `0.6s`, retardo `0.1s`, curva `cubic-bezier(0.5, 0, 0.1, 1)` en un único tramo de `0%` a `100%`.
  - Alternativa para el feel check (paso 7): `var(--ease-out-expo)`.
- Relleno: tope de velocidad `1000 / minMs` por segundo, sin suavizado exponencial, y `minMs` por defecto `700`.
- Velo: `transition: transform var(--t-veil) cubic-bezier(0.45, 0, 0.15, 1);`. **`--t-veil` no cambia** (`1.1s`),
  porque todas las entradas del hero cuelgan de él.
- Fundido de la marca: `transition: opacity 0.3s var(--ease-out) 0.15s;`.

## Repo conventions to follow

- Las curvas de la casa están en `app/globals.css:48-50` (`--ease-out`, `--ease-out-expo`, `--ease-in-out`), en
  `:root`. Usa `var(--ease-out)` donde el valor coincida; las curvas propias del loader van literales, como ya
  hace `.pl-veil`.
- Comentarios en español y explicando el **porqué** (ver `CLAUDE.md`). Ejemplo a imitar: el comentario de
  `app/globals.css:169-170`.
- El loader es CSS global y plano (`app/globals.css:158-242`), no un CSS module: tiene que funcionar antes de
  hidratar. No lo muevas.

## Steps

1. **`app/globals.css`, regla `.pl-veil` (línea 176).** Sustituye la línea `transition` por:
   ```css
     /* Sale con velocidad: el relleno acaba lanzado y la apertura lo continúa sin hueco. */
     transition: transform var(--t-veil) cubic-bezier(0.45, 0, 0.15, 1);
   ```

2. **`app/globals.css`, línea 185.** Sustituye `.pl-mark { transition: opacity 0.45s ease 0.55s; }` por:
   ```css
   .pl-mark { transition: opacity 0.3s var(--ease-out) 0.15s; }
   ```
   y cambia el comentario de las líneas 183-184 por:
   ```css
   /* Con el velo ya en marcha, la marca ember se funde rápido sobre la blanca del hero, que está
      debajo en el mismo sitio: el cambio de color se lee como parte del corte. Esa después vuela a
      la esquina (blocks/hero). */
   ```

3. **`app/globals.css`, líneas 198-229.** Sustituye todo el bloque, desde el comentario
   `/* Entrada: cada trazo…` hasta el cierre de `@keyframes pl-hit`, por:
   ```css
   /* Entrada: cada trazo recorre su camino vertical por la costura y frena en seco en su sitio, sin
      pasarse. El golpe es esa frenada, y el relleno arranca en el mismo frame (PageLoader espera a
      que acabe esta animación): no hay destello ni pulso que compitan con el ember. */
   .pl-blade-f { animation: pl-drop 0.6s cubic-bezier(0.5, 0, 0.1, 1) 0.1s both; }
   .pl-blade-l { animation: pl-rise 0.6s cubic-bezier(0.5, 0, 0.1, 1) 0.1s both; }

   @keyframes pl-drop {
     from { transform: translateY(-100vh); }
     to { transform: translateY(0); }
   }
   @keyframes pl-rise {
     from { transform: translateY(100vh); }
     to { transform: translateY(0); }
   }
   ```
   Las keyframes `pl-lock` y `pl-hit`, y las reglas `.pl-blade .pl-outline { animation… }` y
   `.pl-mark { animation… }`, desaparecen. La regla `.pl-outline` de las líneas 193-196 (el fill gris al 9%) se queda.

4. **`app/globals.css`, bloque `@media (prefers-reduced-motion: reduce)` (líneas 231-237).** Sustituye la línea
   ```css
     .pl-blade-f, .pl-blade-l, .pl-blade .pl-outline, .pl-mark { animation: none; }
   ```
   por
   ```css
     .pl-blade-f, .pl-blade-l { animation: none; }
   ```
   El resto del bloque no cambia.

5. **`blocks/loader/PageLoader.tsx`.**
   - Borra la línea 12 (`const EASE = 7; …`).
   - Sustituye las líneas 99-105 (de `// Lo real, pero sin ir…` a `if (target >= 1 && …) shown = 1;`) por:
     ```ts
           // Lo real, pero sin pasar de una velocidad fija desde que encajan: con caché llena el
           // relleno se ve subir en minMs. Va a velocidad constante y llega al 1 sin frenar, para que
           // la apertura lo continúe en vez de esperar a una cola. Pasado maxMs se da por cargado.
           const target = elapsed >= maxMs ? 1 : done / total;
           if (fillFrom >= 0) shown = Math.min(target, shown + (1000 / minMs) * dt);
     ```
   - No toques nada más: `fillFrom`, `finish()`, `dt` (sigue con su tope de 0.1) y las líneas que escriben `height`/`y`
     se quedan igual. Comprueba que `pace` y `real` ya no se usan en ningún sitio.

6. **`blocks/loader/index.ts:9-10`.** Cambia el default y su comentario:
   ```ts
     /** Duración mínima del relleno, a velocidad constante: con caché llena tiene que verse subir, no parpadear. */
     minMs: z.number().default(700),
   ```
   Comprueba con `grep -rn "minMs" content/` que ninguna página pasa `minMs` explícito. Si alguna lo pasa, déjala
   como está y menciónalo en el informe.

7. **`DESIGN.md:164`.** Sustituye la primera frase, `Las dos hojas entran por la costura (F desde arriba, L desde
   abajo), pasan un 3,5% de largo y encajan; un destello de relleno y un pulso de escala de 1,05 marcan el clic.`, por:
   `Las dos hojas entran por la costura (F desde arriba, L desde abajo) en 0,6s y frenan en seco, sin pasarse; el relleno ember arranca en el mismo frame y sube a velocidad constante (0,7s mínimo).`
   Sustituye también `La marca ember se funde sobre la blanca` por
   `Sin pausa, la marca ember se funde en 0,3s sobre la blanca`. El resto de la línea no cambia.

## Boundaries

- **No** cambies `--t-veil` ni nada de `blocks/hero/`: todo el hero cuelga de ese token.
- **No** toques la lógica de `covered`/`handoff`, `finish()`, `maxMs`, `fonts`, el marcado JSX ni los `clipPath`.
- **No** cambies los colores (`.pl-outline` al 9%, el ember entra por la prop `color`).
- **No** añadas dependencias.
- **No** arranques el sitio (`npm run dev`) ni abras ningún navegador: lo prohíbe `CLAUDE.md`. El feel check lo hace el usuario.
- Si alguna cita de "actual" no coincide con el código que encuentres, **para e informa** en vez de improvisar.

## Verification

- **Mecánica**:
  - `npx tsc --noEmit` sin errores.
  - `npm run lint` sin errores nuevos.
  - `npm run build` termina bien.
  - `grep -rn "pl-lock\|pl-hit\|EASE" app/globals.css blocks/loader/` no devuelve nada.
  - Tras el build, `grep -c ZodError` en los chunks que cita `out/index.html` da 0 (regla del repo).
- **Feel check** (lo hace el usuario con `npm run dev`, recargando con caché llena y también con Disable cache en DevTools):
  - Las hojas llegan en menos de un segundo y se paran en seco en la costura: sin rebote, sin crecer ni temblar.
  - Desde que encajan solo se ven dos colores sobre la marca: el gris translúcido y el ember que sube. Ningún blanco
    hasta la apertura.
  - El relleno no se frena al final: llega arriba y en el mismo instante el velo empieza a partirse, sin pausa.
  - En la apertura, el ember pasa a blanco mientras el velo se mueve, y la marca blanca vuela después a la esquina como antes.
  - En el panel Animations de DevTools, al 10%: la entrada es una sola curva sin cambio de dirección, y no hay
    animación en `.pl-outline` ni en `.pl-mark` (solo la transición de opacidad al terminar).
  - **Curva de entrada:** si la frenada se siente blanda o tardía, prueba en las dos reglas `.pl-blade-*`
    `var(--ease-out-expo)` en lugar de `cubic-bezier(0.5, 0, 0.1, 1)` y quédate con la que golpee más. Si la que se
    siente "lanzada" es la contraria, sube el primer valor (por ejemplo `cubic-bezier(0.6, 0, 0.1, 1)`).
  - Con carga lenta (Network: Slow 4G), el relleno sigue a la carga real a tirones lineales y nunca va por delante.
  - Con `prefers-reduced-motion: reduce` (panel Rendering): no hay entrada; el relleno sube y el velo se funde por opacidad.
- **Done when**: no quedan `pl-lock` ni `pl-hit`, con caché llena la apertura empieza unos 1.4 s después de cargar
  (antes unos 2.95 s), y el usuario aprueba el feel check.
