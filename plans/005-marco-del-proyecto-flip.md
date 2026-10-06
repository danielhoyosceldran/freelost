# 005 — El marco del proyecto crece con transform y clip-path, sin layout

- **Status**: DONE (pendiente de feel check del usuario)
- **Commit**: ad330db
- **Severity**: HIGH
- **Category**: Rendimiento
- **Estimated scope**: 3 ficheros (`project.ts`, `reel.module.css`, `Reel.tsx`), ~60 líneas

## Problem

Al abrir un proyecto, el marco (`position: fixed`, con un `<video>`, `<iframe>` de Vimeo o `<img>`
dentro) crece desde el rectángulo de la tarjeta hasta 100vw × 100vh animando `left`, `top`, `width`
y `height`. Es layout + paint en cada frame sobre un elemento del tamaño de la pantalla con vídeo
dentro, en el momento más cinematográfico de la página. Además, `trackGrow` lee `offsetWidth`
(layout síncrono) en cada frame. Ya figuraba en `BACKLOG.md` ("Detector").

```css
/* blocks/reel/reel.module.css:236-239 — current */
.growing {
  transition: left var(--reel-grow-ease), top var(--reel-grow-ease), width var(--reel-grow-ease),
    height var(--reel-grow-ease);
}
/* :29-30 */
--reel-grow-ease: 0.6s cubic-bezier(0.65, 0, 0.35, 1);
```

```ts
// blocks/reel/project.ts:224-265 — current growToFullscreen()
const full = () => {
  el.frame.style.left = "0px"; el.frame.style.top = "0px";
  el.frame.style.width = "100vw"; el.frame.style.height = "100vh";
};
…
el.frame.classList.add(cls.growing);
void el.frame.offsetWidth;
full();
const onGrown = (e: TransitionEvent) => {
  if (e.target !== el.frame || e.propertyName !== "width") return;
  …
  el.frame.classList.remove(cls.growing);
  settled();
};
el.frame.addEventListener("transitionend", onGrown);
const t0 = performance.now();
const trackGrow = () => {
  this.measureRing();
  if (performance.now() - t0 < GROW_MS + 50) requestAnimationFrame(trackGrow);
};
trackGrow();
```

Contexto que importa: la barra del anillo (`el.bar`) se pone a `opacity: 0` justo antes de crecer
(`project.ts:123`), así que durante el crecimiento el anillo no se ve; `measureRing` por frame es
contabilidad que puede ir una sola vez al final.

## Target

FLIP con propiedades del compositor:

1. El marco salta **de golpe** a su tamaño final (`0,0,100vw,100vh`), sin transición.
2. Se anima hacia "ningún recorte" desde el rectángulo de la tarjeta:
   - **marco**: `clip-path: inset(top right bottom left)` → `inset(0px)`;
   - **contenido** (`el.media`): `transform: translate(cx, cy) scale(s)` → `none`, con `s` uniforme
     (nunca distorsiona) y centrado en la tarjeta.
3. Duración 600 ms (`GROW_MS`), curva `cubic-bezier(0.65, 0, 0.35, 1)` (la actual), con Web
   Animations API, cancelable.

```ts
// blocks/reel/project.ts
const GROW_EASE = "cubic-bezier(0.65, 0, 0.35, 1)"; // junto a GROW_MS; sustituye a --reel-grow-ease

private growAnims: Animation[] | null = null;

private growToFullscreen() {
  const { el } = this;
  const full = () => {
    el.frame.style.left = "0px";
    el.frame.style.top = "0px";
    el.frame.style.width = "100vw";
    el.frame.style.height = "100vh";
  };
  const settled = () => {
    this.growAnims = null;
    this.measureRing(); // el marco ya es de pantalla completa: se mide una sola vez
    el.root.classList.remove(this.cls.splitting);
    el.root.classList.add(this.cls.inProject);
    this.startPlayback();
  };

  if (this.o.reduced) {
    full();
    settled();
    return;
  }

  // FLIP: la tarjeta es el estado de partida; el marco salta ya a pantalla completa y se anima
  // el recorte (clip-path) y la escala del contenido, que no provocan layout.
  const first = el.frame.getBoundingClientRect();
  full();
  const last = el.frame.getBoundingClientRect();
  const s = Math.max(first.width / last.width, first.height / last.height); // uniforme, cubre la tarjeta
  const cx = first.left + first.width / 2 - (last.left + last.width / 2);
  const cy = first.top + first.height / 2 - (last.top + last.height / 2);
  const clip = `inset(${first.top - last.top}px ${last.right - first.right}px ${last.bottom - first.bottom}px ${first.left - last.left}px)`;
  const timing = { duration: GROW_MS, easing: GROW_EASE };

  const token = this.loadToken;
  this.growAnims = [
    el.frame.animate({ clipPath: [clip, "inset(0px 0px 0px 0px)"] }, timing),
    el.media.animate({ transform: [`translate(${cx}px, ${cy}px) scale(${s})`, "none"] }, timing),
  ];
  // cancel() (al salir a mitad) rechaza finished: no hay nada que asentar.
  Promise.all(this.growAnims.map((a) => a.finished)).then(
    () => token === this.loadToken && settled(),
    () => {},
  );
}
```

`exit()` cancela las animaciones en vuelo y `onResize` ignora el evento mientras dura el
crecimiento:

```ts
// exit(): sustituye la línea 153 (`el.frame.classList.remove(cls.growing);`)
this.growAnims?.forEach((a) => a.cancel());
this.growAnims = null;

// onResize(): primera línea
if (!this.open || this.growAnims) return;
```

## Repo conventions to follow

- `project.ts` es imperativo y con `loadToken` para descartar carreras: mantén ese patrón (la
  promesa de `finished` comprueba el token, igual que lo hacía `onGrown`).
- Los nombres de clase del CSS module se pasan desde `Reel.tsx`; si quitas `.growing` del CSS hay
  que quitarlo del objeto `ProjectClasses` y de `Reel.tsx:129-135`, o el build se queja.
- `.fromCard` (el zoom 1,08 de las imágenes) transforma a los hijos de `el.media`; el `transform`
  nuevo va sobre `el.media` (el contenedor), así que componen sin pisarse.

## Steps

1. `project.ts`: añade `GROW_EASE` y `growAnims`; reescribe `growToFullscreen()` según el Target;
   borra `trackGrow`, `onGrown` y todo uso de `cls.growing`; quita `growing` de `ProjectClasses`.
2. `project.ts` `exit()`: cancela `growAnims`; elimina `el.frame.classList.remove(cls.growing)`.
   `onResize()`: añade `|| this.growAnims`.
3. `Reel.tsx`: quita `growing: styles.growing` del objeto de clases (línea ~132).
4. `reel.module.css`: borra la regla `.growing` (236-239) y la variable `--reel-grow-ease` (línea 30).
   El comentario de `.frame` que habla de crecer sigue valiendo.
5. `npx tsc --noEmit`: corrige los usos que queden de `growing`.
6. Si el recorte inicial no coincide visualmente con la tarjeta (la imagen se ve más o menos
   recortada que en la tarjeta WebGL al empezar), es la diferencia entre el `cover` de la tarjeta
   y el del viewport cuando sus proporciones difieren (más visible en móvil). **No improvises:**
   deja el resultado como está y anótalo en `BACKLOG.md` para decidir (p. ej. crossfade o
   recalcular `s` con la proporción de la imagen).

## Boundaries

- No cambies la duración (600 ms) ni la curva.
- No toques `startPlayback`, la carga con progreso ni el anillo salvo para medirlo una vez.
- No toques `FlexCarousel.ts`.
- No añadas dependencias.
- No arranques el sitio; el usuario lo ejecuta.
- Si el código no coincide con lo citado, para y avisa.

## Verification

- **Mecánica**: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
  `grep -rn "growing\|reel-grow-ease\|trackGrow" blocks` → 0 resultados.
- **Feel check (lo hace el usuario; usar un dispositivo real si se puede)**:
  - abre un proyecto de vídeo: el marco crece de la tarjeta a pantalla completa sin tirones, también
    con Vimeo o un clip grande; en DevTools → Performance no hay barras moradas de Layout por frame;
  - a 10 % se ve cómo el recorte se abre y el contenido escala **sin deformarse**;
  - pulsa cerrar o Escape a mitad de crecimiento: vuelve a la tarjeta limpio, sin marco colgado, y
    se puede abrir otro proyecto;
  - cambia el tamaño de la ventana durante el crecimiento: no hay saltos; al acabar el marco ocupa
    toda la pantalla;
  - con `prefers-reduced-motion` el marco aparece a pantalla completa sin animación (como hoy).
- **Done when**: el crecimiento no tiene layout por frame y se interrumpe con limpieza.
