# 007 — El scroll como montaje: tempo, velocidad e interacción

- **Status**: EN CURSO. Decisiones: defaults aplicados. Fases 0–5 hechas (pendientes de feel check conjunto).
- **Severity**: HIGH (es el carácter del sitio, no un pulido)
- **Category**: Movimiento / scroll
- **Estimated scope**: ~10 ficheros, 5 fases independientes tras la fase 0

## Diagnóstico: por qué se siente plano y lineal

1. **Un solo tempo.** Cada sección hace lo mismo: entra, se queda, se va, con un único
   `easeInOut` suave. El hero encoge 65vh; el equipo reparte exactamente 100vh por objeto con
   fundido lineal; el contacto salta una vez por `IntersectionObserver`. No hay ni un tramo
   rápido ni uno sostenido: ninguna tensión que subir o soltar.
2. **El scroll es 1:1 con la rueda.** No hay inercia propia ni señal de velocidad. Lo que pasa en
   la página no depende de *cómo* se baja (de golpe o despacio), solo de *dónde* se está.
3. **Las secciones no se conocen.** El plano del hero se encoge y desaparece; el carrete empieza
   desde cero. No hay continuidad entre una escena y la siguiente (un corte de montaje sin
   plano de enlace).
4. **Solo el carrete responde al puntero.** Fuera de él, el sitio es de mirar. El equipo (el
   objeto 3D, lo más tocable de la página) no se puede agarrar.
5. **Disparo único donde debería haber scrub.** El contacto y la entrada del carrete son eventos
   de tiempo (una vez, ya está); el visitante no puede "rebobinar" ni acelerar la llegada.

## Tesis de movimiento

> **La página se monta como sus películas.** Las películas de Guillem controlan la tensión
> alternando planos largos y sostenidos con cortes secos y cambios de velocidad. El scroll hace lo
> mismo: **tempo variable por sección, corte seco entre ellas y la velocidad del visitante como
> material** (el *speed ramp* del cine).

Esto cabe en el sistema: «Todo movimiento sale de una sola gramática» (entradas expo, máscaras de
palabra, el gesto F baja / L sube). No se añade ninguna gramática nueva: se le da **ritmo** a la
existente. Sin color nuevo (ember sigue siendo solo estado y progreso), sin sombras, sin cristal.

### Mapa de tensión (lo que se construye)

| Tramo | Papel en el ritmo | Carácter del movimiento |
| --- | --- | --- |
| Loader → hero | Respiro, planteamiento | Lento, sostenido. Ya está bien. |
| Salida del hero | La tensión sube | Mantiene → acelera → **corte seco** al carrete. |
| Carrete | Pico: cortes rápidos | Rápido, cinético, responde a la velocidad. |
| Equipo | Valle: contemplación | Lento, sostenido; objeto tocable. Giros que *arrancan* en el cambio (whip). |
| Contacto | Resolución | Todo converge: la marca se cierra y se rellena (cierra el loader). |

## Fase 0 — Cimientos (bloquea las demás)

Dos piezas en `core/scroll/`. Sin ellas lo demás es decoración suelta.

**0a. Canal de velocidad.** `scrollController` publica `velocity` (px/ms, suavizada con un
filtro de un polo, ~120 ms) y la escribe como variable CSS `--scroll-v` (−1…1, normalizada) en
`<html>`, en **un único rAF** que solo corre mientras hay movimiento o inercia. Los bloques la
leen por suscripción (`scrollController.subscribeVelocity`) o por CSS; ninguno añade su propio
listener de scroll (regla: el controlador es el único dueño).

**0b. Scroll con inercia (Lenis-style, dentro del controlador).** La rueda de ratón llega en
saltos discretos y su velocidad sería a escalones; con inercia el flujo es continuo y la
velocidad útil. Solo en puntero fino; en táctil se queda el scroll nativo (y la velocidad se
mide igual). Debe respetar `pin`, `captureInput` (carrete con proyecto abierto) y `lockOverflow`.
Primera tarea: decidir si se escribe a mano (~80 líneas: lerp sobre `targetY`, `wheel` ya
capturada en `onWheel`) o se mete `lenis`. **Recomendado: a mano**, porque el controlador ya
captura la rueda y el proyecto ya compite por ella; una librería duplicaría esa lógica.

**Hecho (fase 0)** en `core/scroll/controller.ts`: inercia a mano (muelle exponencial, τ 95 ms rueda / 170 ms seek; trackpads nativos), `velocity()`, `subscribeVelocity()` y `--scroll-v` en `<html>`, todo en un único rAF. Aceptación: `npx tsc --noEmit`, `npm run lint`, `npm run build` limpios; sin cambios visibles
todavía salvo la sensación de la rueda.

## Fase 1 — Salida del hero: mantener, acelerar, cortar

Hoy (`Hero.tsx`, `useSceneProgress`): `easeInOut(p)` sobre todo el tramo, escala 1→0,84 y giro
−1,5°, créditos fuera en la primera mitad.

- Curva por tramos en lugar de una sola: `0–0,25` **sostiene** (el plano sigue respirando,
  créditos se van ya); `0,25–0,85` **acelera** con curva `easeIn` hacia un encogimiento mayor
  (0,84 → ~0,62) y giro creciente; `0,85–1` **corte**: el plano sale en 1 frame lógico
  (translateY + opacidad con curva casi lineal), no se funde.
- Los créditos no se apagan a la vez: el nombre se divide por palabras (ya hay máscaras) y cada
  palabra sale en sentido contrario (izquierda / derecha), el eslogan al final. Cada uno con su
  propio retardo de progreso, no de tiempo.
- **Speed ramp real.** `film.playbackRate` baja de 1 a ~0,6 mientras el plano encoge (cámara
  lenta justo antes del corte: tensión) y vuelve a 1 en la reentrada. Solo en el hero, solo
  mientras es visible, con rango acotado 0,5–1,5. Si Safari no lo respeta, no pasa nada: es
  adorno que no falta si falla.
- Parámetros nuevos en `exit` del schema (`hold`, `cutAt`, `slowTo`), con defaults; el copy no
  se toca.

**Hecho (fase 1)** en `blocks/hero/Hero.tsx` e `index.ts`: salida en tres tiempos (hold 0,25 → ramp easeIn → corte desde 0,85), escala final 0,62, giro −2,5°, `playbackRate` hasta 0,6, y créditos por turnos (cabecera arriba, nombre a la izquierda, eslogan a la derecha). La escena sube a 190vh. Las palabras no salen cada una por su lado porque su máscara `overflow:hidden` las recortaría y sus transiciones CSS de entrada retrasarían el estilo directo; se mueven los tres grupos. Nuevos `easeIn` y `segment` en `lib/easing.ts`.

## Fase 2 — Carrete: del scroll plano al montaje rápido

El carrete es una pantalla que la página rebasa; entra por tiempo (`ARRIVE_AT`, `RISE_DELAY`).

- **La entrada pasa de tiempo a progreso.** El "rise" de las tarjetas se liga a cuánto del
  carrete ha entrado (scrub 0→1 entre `top = 100vh` y `top = 15vh`), con la pausa actual
  convertida en un tramo sostenido del propio scrub. Subir y bajar lo rebobina.
- **Velocidad → cinta.** `--scroll-v` empuja la cinta: bajar rápido por la página hace que
  las tarjetas se desplacen lateralmente (parallax por velocidad, ya existe `squeeze`/`liquid`
  por velocidad de la cinta; se enchufa la del scroll a la misma entrada del motor). Al pararse
  el scroll, la cinta se asienta con el muelle que ya tiene.
- **Puntero.** Hover sobre la tarjeta central: el recuadro ember de 1px (ya existe) se estira
  hacia la tarjeta bajo el cursor; la tarjeta central inclina 2–3° hacia el cursor (solo
  puntero fino, solo transform). Sin cursor propio nuevo.
- **Continuidad desde el hero** (opcional, ver decisiones): el plano del hero acaba con la
  proporción y posición de la tarjeta central del carrete, de modo que el corte de la fase 1
  *es* la llegada a la primera tarjeta, no una desaparición.

**Hecho (fase 2)** en `lib/webgl/flex-carousel/FlexCarousel.ts` y `blocks/reel/Reel.tsx`: el «rise» sigue al scroll (`setIntroScrub`; empieza con el borde de la sección a 0,05 de pantalla y acaba 0,45 después, rebobinable; al rebobinar, la cinta deja de estar a punto y se quita `.revealed`); tras la pausa las tarjetas asoman solas hasta 0,16 para no dejar una pantalla vacía; la tarjeta central se arrima 7×5 px al cursor y crece 1,2 % (`setLean`). Ya existía «velocidad → cinta»: con la sección clavada el scroll empuja la cinta (`SCROLL_FOLLOW`) y la energía encoge las tarjetas, ahora con deltas continuos gracias a la fase 0. NO hecho: inclinar la tarjeta en perspectiva (exige tocar los shaders), estirar la marca ember hacia el cursor, y el plano del hero convertido en la tarjeta central (decisión 3: no se puede ajustar a ciegas, la tarjeta aparece mucho después de que el hero se va; mejor tras verlo en pantalla).

## Fase 3 — Equipo: valle, pero con *whip* y mano

Hoy (`GearStage.tsx`): 100vh por objeto, giro lineal `SPIN_RANGE`, fundido simétrico.

- **Tempo desigual.** El tramo de cada objeto deja de ser 100vh igual: ~70 % de espera
  sostenida (giro lento) y ~30 % de cambio. Se logra con una función `shape(k)` que remapea el
  progreso de la escena por tramos (plateau + transición), sin cambiar el `height` total.
- **Whip en el cambio.** La velocidad de giro del objeto que sale se dispara (curva `easeIn`
  fuerte) mientras sube y se funde; el que llega entra con giro rápido que *desacelera* hasta
  el reposo (`easeOut`). Cámara que barre y se asienta.
- **Agarrar el objeto.** Arrastre con el puntero gira el modelo (inercia al soltar, vuelve a
  la guía del scroll en ~600 ms). `touch-action: pan-y` en táctil para no robar el scroll
  vertical. El arrastre pasa por el visor (`lib/three/GearViewer.ts`), no por el bloque.
- **Nombres como índice vivo.** El activo se estira de ancho con el eje `wdth` (62→100) y el
  resto se queda condensado: «el ancho es la voz» aplicado al estado. Con velocidad alta, los
  nombres se desplazan un poco en sentido contrario al scroll (profundidad barata, transform).
- **Imán por objeto.** `useScrollMagnet` (hoy sin uso) asienta el scroll en el centro del
  objeto más cercano al soltar, desde el controlador. Solo si el feel check lo pide.

**Hecho (fase 3)** en `blocks/gear/GearStage.tsx`, `gear.module.css` y `lib/three/GearViewer.ts`: tramo de cada objeto con plateau (distancia al centro < 0,35 quieto, deriva lenta 0,9 rad) y cambio entre 0,35 y 0,65; el que sale acelera (easeIn, sube 28 %, giro +2,6 rad) y el que llega frena (mismo giro, asentándose); arrastre horizontal con inercia que vuelve a la guía del scroll en ~0,55 s; nombre activo a `font-stretch: 96%`; la lista se queda atrás con la velocidad (16 px). Sin imán (decisión por defecto).

## Fase 4 — Contacto: la resolución cierra el loader

Hoy (`Contact.tsx`): `IntersectionObserver` único activa `data-in`, y las dos hojas entran por
transición de tiempo.

- Pasa a **scrub**: las hojas F y L se mueven con el progreso de entrada (de `translateY ±40%`
  a juntas) y, al llegar al final del documento, el contorno se **rellena de ember** (el mismo
  gesto de relleno del loader). El visitante cierra la marca con su propio scroll.
- El titular conserva las máscaras de palabra, pero con retardo ligado a la velocidad: scroll
  rápido, todo entra casi junto; scroll lento, palabra a palabra.
- Enlace de correo: leve atracción magnética al cursor (≤ 6 px, solo puntero fino) y flecha
  que gira al hover. Ya existe el subrayado ember; no se duplica.

**Hecho (fase 4)** en `blocks/contact/Contact.tsx` y `contact.module.css`: las hojas F y L siguen la entrada de la sección (easeOut, rebobinables); entre el 70 % y el 100 % de la entrada se rellenan de ember (`--fill`, tope 0,9 en escritorio y 0,5 en móvil, porque el ember como superficie grande choca con The One Ember Rule y en móvil queda tras el texto) y al encajar hacen un golpe de escala; el escalonado del titular sale de la velocidad al entrar (`--stagger`, 0,09 → 0,012 s); el correo se atrae hasta 6 px hacia el cursor (puntero fino). Sin rotar la flecha: un `ArrowUpRight` girado deja de apuntar a «arriba a la derecha»; ya sube y se tiñe de ember al hover.

## Fase 5 — Hilo de página y timecode (opcional, ver decisiones)

Un **hilo de 1px ember** arriba del todo con el progreso total del documento (ember = progreso,
ya es su papel) y, abajo a la derecha, un **timecode** en estilo `label` (`00:00:00:00`) que
corre con el scroll: un fotograma por cada N px, y a más velocidad se acelera. Es la señal más
visible del tempo y encaja con «cartón de título». Oculto en móvil y bajo el proyecto abierto.

**Hecho (fase 5)** en `components/ui/PageProgress.tsx` (+ `page-progress.module.css`), montado en `app/layout.tsx`: hilo ember de 1px con el progreso total y timecode `HH:MM:SS:FF` (24 fps, un fotograma cada 12 px de scroll, así que volar por la página hace volar los fotogramas). El timecode va arriba al centro y no abajo a la derecha como decía el plan: ahí está el eslogan del hero. Se oculta en móvil y con un proyecto abierto (pin). Para quitar el timecode, borrar el `<span>` de `PageProgress.tsx`.

## Presupuesto de rendimiento

- Solo `transform` y `opacity` más `playbackRate`; ningún `width/height/top/left` animado.
- **Un solo rAF** de velocidad en el controlador; los bloques escriben estilo directo desde su
  suscripción (como ya hacen), nunca estado de React por frame.
- `will-change` solo mientras la escena es visible (IntersectionObserver ya presente).
- El giro por arrastre del equipo reutiliza el bucle de render del visor, sin otro rAF.
- Mobile: se mantiene el scroll nativo, la velocidad y los ramps; se quitan inclinaciones al
  puntero, la atracción magnética y el timecode.

## Movimiento reducido

`prefers-reduced-motion`: sin inercia de scroll, sin `playbackRate`, sin inclinación, sin whip,
sin parallax por velocidad. Se conservan los **estados** con cambios de opacidad (hero que cede,
nombre del equipo activo, relleno ember del contacto por opacidad). El tempo desigual del
equipo se mantiene porque es de reparto de scroll, no de movimiento.

## Orden y riesgos

1. **Fase 0** primero. Riesgo: pines y `captureInput` (carrete con proyecto abierto, equipo con
   `seek`). Probar abrir/cerrar un proyecto a mitad de inercia.
2. **Fases 1 y 3** después: son las que más cambian la sensación y son independientes.
3. **Fase 2** (toca el motor WebGL; la más delicada), luego **4**, **5** al final.

Todas se verifican con `npx tsc --noEmit`, `npm run lint` y `npm run build` (más
`grep -c ZodError` en los chunks, que debe dar 0). El feel check lo hace el usuario con
`npm run dev`; Claude no arranca el sitio.

## Decisiones abiertas (mi propuesta por defecto entre paréntesis)

1. **Inercia de scroll propia, escrita dentro del controlador** (sí) o `lenis` (no).
2. **Speed ramp del vídeo del hero** con `playbackRate` 0,6–1,5: toca el metraje del cliente, aunque
   solo su reproducción (sí, acotado; fácil de quitar con `slowTo: 1`).
3. **El plano del hero acaba siendo la tarjeta central del carrete** (sí como experimento tras la
   fase 1; si no encaja en móvil, solo escritorio).
4. **Hilo y timecode** (sí el hilo; el timecode, a tu gusto: es lo más «de cine» y lo más
   prescindible).
5. **Imán del equipo** (no al principio; se decide en el feel check).
