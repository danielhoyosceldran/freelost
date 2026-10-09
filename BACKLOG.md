# Backlog

Lo que falta para cerrar el portfolio. Lo mantiene Claude: se añade lo que aparece y se tacha lo
que se termina. Lo marcado **[cliente]** depende de material o decisiones de Guillem.

## Contenido

- [ ] **[cliente]** Licencia web de Druk Wide (un peso, woff2). Hasta entonces los títulos van en
      Archivo 125/900. Al llegar: `next/font/local` en `app/[lang]/layout.tsx` y los tokens
      `--font-title`, `--title-weight` y `--title-stretch` en `app/globals.css`. Revisar después
      el cuerpo de los títulos: Druk Wide es más ancha que el sustituto.
- [ ] **[cliente]** ¿Foto de Guillem en el About, junto al crédito? Plan 009, D8.
- [ ] Feel check del morph de contornos rótulo → eslogan (`npm run dev`). Tramos en `Hero.tsx`:
      `MORPH` (0,03–0,26), `REST_IN` (0,14–0,28), `STAGGER`; el relevo rótulo → morph es un corte
      seco en `e > 0` (si al arrancar se nota un saltito de forma, es el remuestreo, ver abajo). Composición del eslogan: `WORD_GAP` y `LEADING` (unidades de
      los SVG). Mirar: salto al arrancar (rótulo → polígonos de 256 puntos) y al aterrizar
      (polígonos → eslogan), esquinas de Druk algo redondeadas a tamaño grande (subir `N_OUTER` en
      `lib/morph/letters.ts`), fluidez en móvil (se reescriben 9 `d` por fotograma), la vuelta
      atrás con scroll, y movimiento reducido (solo fundido). El rótulo ya va en Druk Wide
      dibujado: comprobar su tamaño (`--brand`, min(21vw, 32svh)) y el aire de la máscara de
      entrada. `fit` ahora es la caja exacta de los glifos (antes, la del texto): quizá bajar `to`.
- [ ] Borrar `morph-preview.svg` de la raíz (previsualización estática del morph).
- [ ] Feel check de la salida del hero sin máscara (`npm run dev`): el eslogan crece en papel
      (`SLOGAN_GROW` 0,3–0,55) mientras el plano encoge a 70vh (`SHRINK`, `SHRINK_TO` en
      `Hero.tsx`) y luego sube 1:1 con el scroll. Escena de 340vh: tras encoger quedan ~108vh, 85
      para que el plano salga y ~23vh de eslogan solo sobre tinta. El eslogan acaba a 80vh de alto
      (`to` 0,8, capado al ancho), así que rebasa el plano de 70vh. Mirar si el velo debe irse al encoger, y
      movimiento reducido (sin escala; el plano sube a sangre).
- [ ] Feel check del ritmo nuevo (`npm run dev`): «Lo que uso» → About → contacto. About
      (`blocks/about`): ritmo de las máscaras de línea (`REVEAL_FROM`/`REVEAL_TO`), aire entre
      entradilla, cuerpo y cierre, y la columna desplazada (38% del ancho) en portátiles bajos, pantallas
      anchas y móvil. Ola de líneas: solape de 1,6 huecos y ease-out en `.word` (`about.module.css`).
      Cuerpo del crédito (0,95rem) y de entradilla/cierre en móvil: fuera de la escala de DESIGN.md.
- [ ] Feel check del título del carrete (`npm run dev`): tramo de scroll entre el título en el
      centro y el rise (`RISE_AFTER`), fundido de salida (0,6 s) y reaparición en su sitio
      (`SETTLE_DELAY`, `TITLE_SPAN`, `TITLE_MAX_S` en `blocks/reel/Reel.tsx`). Mirar si el contorno de Archivo
      variable enseña solapes de contornos dentro de las letras (pasa con `text-stroke` en fuentes
      variables); con Druk Wide no debería. «PROJECTES» en móvil. El rótulo de fondo (papel al
      12%): que se lea sin competir con las tarjetas.
- [ ] Feel check de los títulos en la fuente ancha: equipo a clamp(1.6rem, 3vw, 3rem);
      «EL QUE FAIG SERVIR» es el más largo. Titular del contacto en 3–4 líneas, también en móvil.
- [ ] **[cliente]** Títulos reales de las 12 películas del carrete. Los de `content/reel.ts` salen
      de los nombres de carpeta y fichero ("Raz Surfcamp · Camp 12", "Ironman · FL3"…).
- [ ] **[cliente]** Lista real de equipo para "Lo que uso". Hoy son tres categorías ("Cámara y
      ópticas", "Dron", "Edición") con modelos 3D procedurales genéricos (`lib/three/gearModels.ts`).
      Las etiquetas de cada categoría (`content/gear.ts`) solo nombran la Sony A7 IV: falta el
      modelo de dron y qué software de edición usa, por si quiere nombrarlos.
- [ ] Feel check de las etiquetas de "Lo que uso" con `npm run dev`, sobre todo en móvil: las
      cinco de "Edición" alargan la lista y pueden pisar el lienzo (`.stack` acaba en 34vh).
- [ ] **[cliente]** Correo de contacto. `hola@freelost.com` en `content/contact.ts` es provisional.
- [ ] **[cliente]** URLs de Instagram y Vimeo (y si hay más redes). Los enlaces no tienen `href`.
- [ ] Contacto funcional: `mailto:` real y `href` de las redes en `content/contact.ts`.
- [ ] **[cliente]** Confirmar "Filmmaker" como rol bajo el nombre en el hero.
- [ ] Fotos de `public/media/fotos/` (Bikes, Viatges, escalada): sin usar. Decidir dónde van
      (¿en el carrete, en una galería, en la vista de proyecto?) y exportarlas a tamaño web; los
      originales pesan de 2 a 106 MB.

## Medios y despliegue

- [ ] **[cliente]** Subir las películas a Vimeo y pasar sus ids en `content/reel.ts`
      (`film(slug, caption, { vimeo: "…" })`). Quitar después `public/media/web/films/` (~670 MB;
      Lofoten sola 185 MB). El carrete ya abre la conexión y precarga el SDK si hay alguna.
- [ ] Host de los MP4 del hero (`downurban-720/1080.mp4`, 6 y 13 MB): CDN de vídeo (Bunny, R2) o
      enlaces de fichero de Vimeo si el plan los da. Se configura con `NEXT_PUBLIC_VIDEO_BASE`.
      Sigue siendo `<video>` nativo, no iframe (ver `content/hero.ts`).
- [ ] **A prueba:** el hero pone Lofoten desde Vimeo (`film.vimeo` en `content/hero.ts`, iframe sin
      interfaz, `blocks/hero/vimeoFilm.ts`). Decidir si se queda: mirar arranque, loader, la cámara
      lenta de la salida y el sonido. Si se queda, el CLAUDE.md («el hero es `<video>` nativo») y
      los textos de `filmLabel` (aún hablan de Down Urban) se actualizan; si no, quitar `vimeo`.
- [ ] Al montar el CDN de imágenes, comprobar en el navegador que manda
      `Access-Control-Allow-Origin` (si no, las portadas del carrete no suben como textura) y que
      `Content-Length` llega con la imagen (el anillo de la vista de proyecto lo usa para el
      progreso; sin él cae a onload).
- [ ] Medir con Lighthouse/WebPageTest sobre el despliegue: el loader espera 6 s de búfer del
      hero (~3 MB a 1080p). Si el LCP en 4G se va de 2,5 s, bajar `BUFFER_S` o el bitrate del
      corte del hero, que va oscurecido bajo `.scrim` y lo admite.
- [ ] Sacar los originales de `public/media/` antes de desplegar: el export copia todo `public/`
      a `out/` (3,3 GB). Vercel no lo admite.
- [ ] `.gitignore` ignora `*.mp4`: las versiones web tampoco se suben. Decidir dónde viven.
- [ ] **[cliente]** Plataforma de fotos (recomendación: Cloudinary; alternativa: Bunny.net).
      `lib/media.ts` ya genera las URLs de las dos (ancho y formato automático). Falta la cuenta
      y subir `web/` con las mismas rutas.
- [ ] Despliegue en Vercel (export estático).
- [ ] Imagen Open Graph. (Favicon hecho: `app/icon.svg`; falta `.ico`/apple-touch-icon si hace falta.)

## Idiomas

- [ ] **[cliente]** Revisar las traducciones EN/CA/ES de `content/` (las he escrito yo; "Lo que uso"
      y las etiquetas del carrete sobre todo). Del copy de Guillem (7/10/2026), About
      (`content/about.ts`) y Contact (`content/contact.ts`) los ha dado en inglés: ca/es son
      traducción nuestra. Confirmar también "Qui som" / "Quiénes somos" como título del About.
- [ ] Selector de idioma: feel check en móvil (cabe junto a sonido/pausa en `.controls` del hero) y
      decidir si recordar la elección (hoy `/` va siempre a `/en`, sin detectar el navegador).
- [ ] Quitar los defaults en castellano de `labels` en `blocks/reel/index.ts` (ya se pasan desde
      `content/reel.ts`, pero el schema aún los tiene).

## Diseño (impeccable)

- [ ] Feel check de la entrada del rótulo tras el loader (`npm run dev`): ahora arranca a ~0,89 s de
      abrirse el velo (`--t-title` en `hero.module.css`) en vez de a 1,4 s, y «free» ya no asoma por
      su máscara. Si se hace largo o se pisa con el velo, ajustar el 0.5s o el 0.35; si «lost» asoma en alguna fuente de
      reserva, subir el 0.3em.

- [ ] Hero rediseñado (la marca manda, no el vídeo): rótulo «FREE / LOST» apilado en la fuente de
      título, ya sin eslogan, vídeo oscurecido (`.scrim`). Ver con `npm run dev`: tamaño del rótulo
      (`min(22vw, 34svh)`, calculado con las medidas de Archivo 125/900 sin verlo; con Druk Wide
      hay que recalcularlo), la máscara de entrada (que no asome ningún pie de letra), contraste sobre planos claros, apilado en móvil y la salida (free sube /
      lost baja). `DESIGN.md` aún dice «el metraje lidera»: revisar con la revisión final.
- [ ] Nombre del hero a 20 px (el rol de pie del carrete): comprobar en móviles bajos (360×640)
      que los créditos no pisan el rótulo.
- [ ] Etiquetas: el hero ya usa `--label-size` / `--label-track` (0,72rem, 0,18em). El carrete
      (`11px`, 0,22em) y el pie (`.legal`, 0,7rem, 0,16em) aún llevan sus propios valores.
      Pasarlos al token, o documentar por qué difieren.
- [ ] Revisión final (finish review) con capturas de escritorio y móvil, y su veredicto.
- [ ] `DESIGN.md` + `.impeccable/design.json` a partir de lo construido.
- [ ] Ajustar en dispositivo: el carrete en móvil (`--reel-card: 0.26`, tarjetas 16:9), el
      encuadre de los modelos 3D en el nuevo escenario, el desencaje del hero en móvil.
- [x] Carrete: quitada la lente de los bordes (curvatura y dispersión). Se pinta en una sola
      pasada, sin render target ni mipmaps por fotograma. Se conservan intro, parallax y squeeze.
- [ ] Feel check de las animaciones (`plans/`, 001–006, ya aplicadas): sobre todo el crecimiento del
      marco de proyecto (`blocks/reel/project.ts`, clip-path + escala). En móvil la proporción de la
      tarjeta y la del viewport difieren y el recorte del primer frame puede no coincidir con la
      tarjeta WebGL; si se nota, decidir entre crossfade o recalcular la escala con la proporción
      de la imagen.

- [ ] Montaje del scroll (`plans/007-montaje-del-scroll.md`): fases 0–5 aplicadas. Falta el feel
      check conjunto con `npm run dev` (inercia de la rueda, salida del hero, rise del carrete,
      barrido del equipo, relleno del contacto, timecode) y decidir: plano del hero → tarjeta
      central, inclinación en perspectiva de la tarjeta (shaders) e imán del equipo.

- [ ] Feel check de la salida del hero → carrete: el plano encoge a 70vh hacia su pie (escena de
      160vh, `hold` 0.2), el carrete llega con su borde a 0,45 de pantalla, pausa de 200 ms y rise de
      1,5 s con recorrido 0,35 del alto. Si las tarjetas suben antes de verse, bajar ARRIVE_AT.
- [ ] Feel check del scroll durante el rise: la cinta ya sigue el scroll mientras suben las
      tarjetas (`nudge` solo se bloquea con proyecto abierto o barrido) y el abanico se calcula
      desde la posición inicial (`intro.origin`). Comprobar que no hay saltos al bajar rápido a
      mitad de la subida; si los hay, volver a la opción de acumular el delta y aplicarlo al acabar.

- [ ] "Lo que uso" con morph volumétrico (`lib/three/GearMorph.ts` + `sdfWorker.ts`): feel check
      con `npm run dev`. Ajustes a mano en GearMorph: `MORPH_SECONDS` (0,5 s), `SWAP` (relevo malla ↔
      volumen, 12 %), `BULGE` (volumen extra a mitad, 0,06) y `SDF_RES` (128: más es más fiel y más
      caro). Mirar si el relevo al principio y al final se nota (el volumen pierde teclas, rejillas
      y palas finas), el coste del raymarching a DPR 2 en portátiles flojos, el encuadre en la caja
      del escenario y en móvil, y si el brillo frío #e6ecf5 encaja con el papel #eef1f0.

- [ ] Velo de trama sobre el equipo (adaptación del DitherVeil de React Bits, en `GearMorph`:
      pasada `makeDither` + estela `makeMask`, ruido azul en `lib/three/blueNoise.ts`): feel check
      con `npm run dev`. Configuración del panel de React Bits: celda 1 px, tintas #120f17 /
      #f4f1ea, contraste 1,15, radio 200 px, suavidad 0,6, estela 1 s. Floyd no es posible (CPU,
      imagen fija): va ruido azul. La tinta de la trama es la del fondo (#060a0c, no la #120f17
      del panel, que se veía morada) y la onda al clic está apagada (`CLICK_BURST`). Mirar que el
      lienzo ya no se distinga del escenario.

- [ ] Página de todos los proyectos (bloque `projects`, `content/pages/projects.ts`): hoy solo
      es el fondo naranja y la cruz de volver. Falta el contenido.
- [ ] Salida del carrete a todos los proyectos y vuelta: feel check con `npm run dev`. Ida:
      barrido de `max(n, 15)` tarjetas en 1,15 s (`SWEEP_S` en `blocks/reel/Reel.tsx`) con el
      recuadro 50vw × 50vh como cola, que crece en 0,7 s (`.box` en `reel.module.css`). Vuelta
      (cruz, Esc o atrás del navegador): lo mismo al revés, con el relevo de
      `core/transition/handoff.ts` (sin loader). Revisar en móvil (tarjetas a 0,26 del alto),
      el hueco entre la última y el recuadro (`SWEEP_MARGIN` en FlexCarousel) y que la home
      vuelva bien colocada (scroll, gear, hero) tras la vuelta.

- [ ] Feel check de las pistas (`npm run dev`). Scroll en el hero (`.hint`, abajo a la derecha):
      entra 1,4 s después del rótulo, el trazo baja por un hilo de 44px cada 2,4 s y se va con el
      5 % de la escena. Arrastre en el carrete (`.drag`, abajo a la izquierda): entra 0,4 s tras
      las tarjetas y se va con el primer `pointerdown` sobre la cinta. Mirar en móvil (360 px) que
      la del hero no pise el nombre y la del carrete no pise «todos los proyectos»; y si «Arrastra»
      convence en táctil o mejor «Desliza». Etiquetas en `content/hero.ts` y `content/reel.ts`.

## Panel de administración

- [ ] Plan `plans/010-panel-de-admin.md`: decidir D1–D8 (almacén y auth, Deploy Hook, proyectos
      solo foto, categorías, zod en el panel, idioma del panel, contenido de la vista de proyecto).
- [ ] Fase 0: modelo de contenido (`content/data/schema.ts` + `site.json`) y `content/*.ts`
      leyendo de él, sin cambios visibles. `lib/media.ts` acepta URLs absolutas.
- [ ] Fase 1: `/admingsz` local (localStorage + exportar `site.json`), sin escritura remota
      mientras no haya autenticación.

## Limpieza de v4

- [ ] Quitar el chrome heredado que ya no usa nadie: `Cursor`, `Reveal`, el bloque `cut`, y en
      `app/globals.css` los tokens dorados y
      las clases `.glass-card`, `.action-pill`, `.btn-flat-gold`, `.text-glow-*`,
      `.irregular-cut-*`, `.scroll-reveal`, `.animate-float`, `.custom-cursor`.
- [ ] `core/scroll/ScrollGate.tsx`, `core/scroll/useScrollMagnet.ts` y `core/scroll/schemas.ts`:
      ya no los usa ningún bloque (el carrete se arrastra). Decidir si se quedan en el núcleo.

## Hecho

- [x] Peticiones de Guillem del 7/10/2026 (`plans/009-guille-plan.md`): Instrument Sans para el
      texto y tokens de título (Archivo 125/900 hasta tener Druk Wide); Contact con su copy
      (Email con la dirección en pequeño, e Instagram); bloque About; eslogan descubierto en su
      escena entre «Lo que uso» y About; hero y pie sin eslogan; `DESIGN.md` al día.

- [x] Optimización de carga (impeccable optimize):
  - Fuentes precargadas de ~390 KB a 113 KB: Archivo solo `latin` y sin cursiva. El eslogan del
    pie pasa a Instrument Serif, como el del hero.
  - `/` redirige en el borde (`vercel.json`) o con meta refresh, sin bajar React.
  - Capa de medios `lib/media.ts` con preconnect a los CDN; la foto del carrete ya no es Pexels.
  - Las portadas se descodifican antes de subir como textura.
  - Fuera `ShowreelModal`, `Modal`, `Toast` y `core/ui/store.ts`.

- [x] Idiomas EN / CA / ES: rutas `app/[lang]/` prerenderizadas, `/` redirige a `/en`, copy por
      idioma en `content/`, selector EN · CA · ES en el hero.
- [x] Marco de la vista de proyecto: crece con `clip-path` y `transform` (FLIP), sin layout.
- [x] Tokens `--ease-*` y `--t-veil`; HUD del carrete sale en 180 ms; título del pie interrumpible;
      hover del correo a 280 ms; hover solo con puntero fino y `:active` en botones.

- [x] Loader con la marca (entrada de los trazos, relleno con la carga real, apertura por la
      costura).
- [x] Hero con la película FL1 a sangre, nombre, marca y eslogan; sonido y pausa.
- [x] Salida del hero: el plano encoge a 70vh sin borde ni fundido y se queda pegado al carrete.
- [x] Carrete de proyectos con las 12 películas reales y reproducción completa en local.
- [x] Entrada del carrete: pausa al llegar y después el rise de React Bits.
- [x] Carrete con la física de React Bits: arrastre con inercia, bucle infinito, ajuste natural,
      hueco 12 px, rueda vertical libre para la página; lente de los bordes solo en ordenador.
- [x] "Lo que uso": escena clavada, un objeto por tramo, giro con el scroll.
- [x] Sección de contacto y pie (solo estilo, sin funcionalidad).
