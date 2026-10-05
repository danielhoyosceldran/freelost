# Backlog

Lo que falta para cerrar el portfolio. Lo mantiene Claude: se añade lo que aparece y se tacha lo
que se termina. Lo marcado **[cliente]** depende de material o decisiones de Guillem.

## Contenido

- [ ] **[cliente]** Títulos reales de las 12 películas del carrete. Los de `content/reel.ts` salen
      de los nombres de carpeta y fichero ("Raz Surfcamp · Camp 12", "Ironman · FL3"…).
- [ ] **[cliente]** Lista real de equipo para "Lo que uso". Hoy son tres categorías ("Cámara y
      ópticas", "Dron", "Edición") con modelos 3D genéricos.
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
- [ ] Favicon / iconos (se borró `app/favicon.ico` en la migración) e imagen Open Graph.

## Idiomas

- [ ] ES / EN / CA: rutas por idioma prerenderizadas (`app/[lang]/` + `generateStaticParams`,
      sin middleware), copy por idioma en `content/`, selector de idioma en el hero.
- [ ] Etiquetas sueltas aún en castellano dentro de schemas por defecto (`blocks/reel/index.ts`:
      "Proyectos", "Carrete de fotografías", "de"…): moverlas a `content/`.

## Diseño (impeccable)

- [ ] Revisión final (finish review) con capturas de escritorio y móvil, y su veredicto.
- [ ] `DESIGN.md` + `.impeccable/design.json` a partir de lo construido.
- [ ] Ajustar en dispositivo: el carrete en móvil (`--reel-card: 0.26`, tarjetas 16:9), el
      encuadre de los modelos 3D en el nuevo escenario, el desencaje del hero en móvil.
- [ ] Carrete: probar en ordenador la lente del panel de React Bits (0,74 × 1,18, 65°…) con las
      portadas 16:9; si curva demasiado, retocar `lens` en `blocks/reel/index.ts`.
- [ ] Detector: el marco de la vista de proyecto anima `left/top/width/height`
      (`blocks/reel/reel.module.css`, `.growing`). Pasarlo a FLIP con `transform`.

## Limpieza de v4

- [ ] Quitar el chrome heredado que ya no usa nadie: `ShowreelModal`, `Modal`, `Toast`, `Cursor`,
      `Reveal`, `core/ui/store.ts`, el bloque `cut`, y en `app/globals.css` los tokens dorados y
      las clases `.glass-card`, `.action-pill`, `.btn-flat-gold`, `.text-glow-*`,
      `.irregular-cut-*`, `.scroll-reveal`, `.animate-float`, `.custom-cursor`.
- [ ] `core/scroll/ScrollGate.tsx`, `core/scroll/useScrollMagnet.ts` y `core/scroll/schemas.ts`:
      ya no los usa ningún bloque (el carrete se arrastra). Decidir si se quedan en el núcleo.

## Hecho

- [x] Loader con la marca (entrada de los trazos, relleno con la carga real, apertura por la
      costura).
- [x] Hero con la película FL1 a sangre, nombre, marca y eslogan; sonido y pausa.
- [x] Salida del hero: el plano se desencaja (encoge y se ladea) con el scroll.
- [x] Carrete de proyectos con las 12 películas reales y reproducción completa en local.
- [x] Entrada del carrete: pausa al llegar y después el rise de React Bits.
- [x] Carrete con la física de React Bits: arrastre con inercia, bucle infinito, ajuste natural,
      hueco 12 px, rueda vertical libre para la página; lente de los bordes solo en ordenador.
- [x] "Lo que uso": escena clavada, un objeto por tramo, giro con el scroll.
- [x] Sección de contacto y pie (solo estilo, sin funcionalidad).
