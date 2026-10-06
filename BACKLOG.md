# Backlog

Lo que falta para cerrar el portfolio. Lo mantiene Claude: se añade lo que aparece y se tacha lo
que se termina. Lo marcado **[cliente]** depende de material o decisiones de Guillem.

## Contenido

- [ ] **[cliente]** Títulos reales de las 12 películas del carrete. Los de `content/reel.ts` salen
      de los nombres de carpeta y fichero ("Raz Surfcamp · Camp 12", "Ironman · FL3"…).
- [ ] **[cliente]** Lista real de equipo para "Lo que uso". Hoy son tres categorías ("Cámara y
      ópticas", "Dron", "Edición") con modelos 3D procedurales genéricos (`lib/three/gearModels.ts`).
- [ ] **[cliente]** Correo de contacto. `hola@freelost.com` en `content/contact.ts` es provisional.
- [ ] **[cliente]** URLs de Instagram y Vimeo (y si hay más redes). Los enlaces no tienen `href`.
- [ ] Contacto funcional: `mailto:` real y `href` de las redes en `content/contact.ts`.
- [ ] **[cliente]** Confirmar "Filmmaker" como rol bajo el nombre en el hero.
- [ ] Fotos de `public/media/fotos/` (Bikes, Viatges, escalada): sin usar. Decidir dónde van
      (¿en el carrete, en una galería, en la vista de proyecto?) y exportarlas a tamaño web; los
      originales pesan de 2 a 106 MB.

## Medios y despliegue

- [ ] Pasar las películas a Vimeo (`VimeoClip` ya existe en `blocks/reel/vimeo.ts`; el tipo de
      diapositiva `video` lo usa) y el vídeo del hero a un reproductor de Vimeo o a un host de
      vídeo. Quitar `public/media/web/films/` (~670 MB; Lofoten sola 185 MB).
- [ ] Sacar los originales de `public/media/` antes de desplegar: el export copia todo `public/`
      a `out/` (3,3 GB). Vercel no lo admite.
- [ ] `.gitignore` ignora `*.mp4`: las versiones web tampoco se suben. Decidir dónde viven.
- [ ] Plataforma de fotos (recomendación: Cloudinary; alternativa: Bunny.net). Necesita CORS para
      las texturas WebGL y redimensionado al vuelo.
- [ ] Despliegue en Vercel (export estático).
- [ ] Imagen Open Graph. (Favicon hecho: `app/icon.svg`; falta `.ico`/apple-touch-icon si hace falta.)

## Idiomas

- [ ] **[cliente]** Revisar las traducciones EN/CA/ES de `content/` (las he escrito yo; el título
      de contacto, "Lo que uso" y las etiquetas del carrete sobre todo).
- [ ] Selector de idioma: feel check en móvil (cabe junto a sonido/pausa en `.controls` del hero) y
      decidir si recordar la elección (hoy `/` va siempre a `/en`, sin detectar el navegador).
- [ ] Quitar los defaults en castellano de `labels` en `blocks/reel/index.ts` (ya se pasan desde
      `content/reel.ts`, pero el schema aún los tiene).

## Diseño (impeccable)

- [ ] Hero rediseñado (la marca manda, no el vídeo): rótulo «free lost» en Six Caps y eslogan en
      Instrument Serif cursiva, vídeo oscurecido (`.scrim`). Ver con `npm run dev`: tamaño del rótulo
      (`min(46vw, 54svh)` calculado sin verlo), contraste sobre planos claros, apilado en móvil y la
      salida (free sube / lost baja). `DESIGN.md` queda desfasado (una sola familia, «el metraje lidere»,
      eslogan a la derecha): actualizar al cerrar.
- [ ] Revisión final (finish review) con capturas de escritorio y móvil, y su veredicto.
- [ ] `DESIGN.md` + `.impeccable/design.json` a partir de lo construido.
- [ ] Ajustar en dispositivo: el carrete en móvil (`--reel-card: 0.26`, tarjetas 16:9), el
      encuadre de los modelos 3D en el nuevo escenario, el desencaje del hero en móvil.
- [ ] Carrete: probar en ordenador la lente del panel de React Bits (0,74 × 1,18, 65°…) con las
      portadas 16:9; si curva demasiado, retocar `lens` en `blocks/reel/index.ts`.
- [ ] Feel check de las animaciones (`plans/`, 001–006, ya aplicadas): sobre todo el crecimiento del
      marco de proyecto (`blocks/reel/project.ts`, clip-path + escala). En móvil la proporción de la
      tarjeta y la del viewport difieren y el recorte del primer frame puede no coincidir con la
      tarjeta WebGL; si se nota, decidir entre crossfade o recalcular la escala con la proporción
      de la imagen.

- [ ] Montaje del scroll (`plans/007-montaje-del-scroll.md`): fases 0–5 aplicadas. Falta el feel
      check conjunto con `npm run dev` (inercia de la rueda, salida del hero, rise del carrete,
      barrido del equipo, relleno del contacto, timecode) y decidir: plano del hero → tarjeta
      central, inclinación en perspectiva de la tarjeta (shaders) e imán del equipo.

- [ ] "Lo que uso" con morph volumétrico (`lib/three/GearMorph.ts` + `sdfWorker.ts`): feel check
      con `npm run dev`. Ajustes a mano en GearMorph: `MORPH_SECONDS` (0,5 s), `SWAP` (relevo malla ↔
      volumen, 12 %), `BULGE` (volumen extra a mitad, 0,06) y `SDF_RES` (128: más es más fiel y más
      caro). Mirar si el relevo al principio y al final se nota (el volumen pierde teclas, rejillas
      y palas finas), el coste del raymarching a DPR 2 en portátiles flojos, el encuadre en la caja
      del escenario y en móvil, y si el brillo frío #e6ecf5 encaja con el papel #eef1f0.

- [ ] Página de todos los proyectos (bloque `projects`, `content/pages/projects.ts`): hoy solo
      es el fondo naranja y la cruz de volver. Falta el contenido.
- [ ] Salida del carrete a todos los proyectos y vuelta: feel check con `npm run dev`. Ida:
      barrido de `max(n, 15)` tarjetas en 1,15 s (`SWEEP_S` en `blocks/reel/Reel.tsx`) con el
      recuadro 50vw × 50vh como cola, que crece en 0,7 s (`.box` en `reel.module.css`). Vuelta
      (cruz, Esc o atrás del navegador): lo mismo al revés, con el relevo de
      `core/transition/handoff.ts` (sin loader). Revisar en móvil (tarjetas a 0,26 del alto),
      el hueco entre la última y el recuadro (`SWEEP_MARGIN` en FlexCarousel) y que la home
      vuelva bien colocada (scroll, gear, hero) tras la vuelta.

## Limpieza de v4

- [ ] Quitar el chrome heredado que ya no usa nadie: `ShowreelModal`, `Modal`, `Toast`, `Cursor`,
      `Reveal`, `core/ui/store.ts`, el bloque `cut`, y en `app/globals.css` los tokens dorados y
      las clases `.glass-card`, `.action-pill`, `.btn-flat-gold`, `.text-glow-*`,
      `.irregular-cut-*`, `.scroll-reveal`, `.animate-float`, `.custom-cursor`.
- [ ] `core/scroll/ScrollGate.tsx`, `core/scroll/useScrollMagnet.ts` y `core/scroll/schemas.ts`:
      ya no los usa ningún bloque (el carrete se arrastra). Decidir si se quedan en el núcleo.

## Hecho

- [x] Idiomas EN / CA / ES: rutas `app/[lang]/` prerenderizadas, `/` redirige a `/en`, copy por
      idioma en `content/`, selector EN · CA · ES en el hero.
- [x] Marco de la vista de proyecto: crece con `clip-path` y `transform` (FLIP), sin layout.
- [x] Tokens `--ease-*` y `--t-veil`; HUD del carrete sale en 180 ms; título del pie interrumpible;
      hover del correo a 280 ms; hover solo con puntero fino y `:active` en botones.

- [x] Loader con la marca (entrada de los trazos, relleno con la carga real, apertura por la
      costura).
- [x] Hero con la película FL1 a sangre, nombre, marca y eslogan; sonido y pausa.
- [x] Salida del hero: el plano se desencaja con el scroll (sutil: encoge a 0.9, sin giro).
- [x] Carrete de proyectos con las 12 películas reales y reproducción completa en local.
- [x] Entrada del carrete: pausa al llegar y después el rise de React Bits.
- [x] Carrete con la física de React Bits: arrastre con inercia, bucle infinito, ajuste natural,
      hueco 12 px, rueda vertical libre para la página; lente de los bordes solo en ordenador.
- [x] "Lo que uso": escena clavada, un objeto por tramo, giro con el scroll.
- [x] Sección de contacto y pie (solo estilo, sin funcionalidad).
