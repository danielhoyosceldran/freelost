---
name: free lost
description: Portfolio de Guillem Salvador. Una película a pantalla completa enmarcada como cartón de título; tinta azulada, blanco frío y un solo acento naranja. Títulos anchos (Druk Wide), texto en Instrument Sans.
colors:
  ink: "#060a0c"
  paper: "#eef1f0"
  ember: "#e0602a"
typography:
  brand:
    fontFamily: "Druk Wide (sustituto: Archivo wdth 125 / 900), Arial Black, sans-serif"
    fontSize: "min(22vw, 34svh)"
    fontWeight: 900
    lineHeight: 0.84
  display:
    fontFamily: "Druk Wide (sustituto: Archivo wdth 125 / 900), Arial Black, sans-serif"
    fontSize: "clamp(2rem, 5vw, 4.75rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "0"
  headline:
    fontFamily: "Druk Wide (sustituto: Archivo wdth 125 / 900), Arial Black, sans-serif"
    fontSize: "clamp(1.6rem, 3vw, 3rem)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "0"
  lead:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 3.4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.01em"
  slogan:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(1.25rem, 1.8vw, 1.6rem)"
    fontWeight: 400
    fontStyle: "italic"
    lineHeight: 1.1
  title:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 88"
  body:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.125rem, 1.7vw, 1.6rem)"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "normal"
  label:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.18em"
  wordmark:
    fontFamily: "Druk Wide (sustituto: Archivo wdth 125 / 900), Arial Black, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 900
    lineHeight: 1
rounded:
  none: "0px"
spacing:
  gutter: "clamp(1.25rem, 2.6vw, 2.5rem)"
  hit: "44px"
components:
  control:
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "44px"
    padding: "0 0.6rem"
  control-pressed:
    textColor: "{colors.paper}"
  mail-link:
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
  channel-link:
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    height: "44px"
  footer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "1.25rem 2.5rem"
---

# Design System: free lost

## Overview

**Creative North Star: "El cartón de título"**

Una película a pantalla completa, enmarcada como el título de un film: el plano manda y todo lo demás son créditos en sus márgenes. La interfaz es tinta y papel; nunca compite con las imágenes. El sistema es la norma de la categoría, jugada en serio y rematada a nivel de portfolio de estudio de cine, y rechaza cualquier disfraz conceptual. Su único momento propio es la marca montándose a sí misma y abriendo la película por su costura.

Es una superficie de modo Experience: el artefacto (el metraje) lidera desde el primer viewport. Esquinas rectas, hilos de 1px, ni tarjetas ni cristal ni sombras. La jerarquía la dan la escala y el ancho de la tipografía, no los contenedores. Todo movimiento sale de una sola gramática: entradas largas con curva expo, máscaras de palabra que suben desde su línea de corte, y el gesto de la marca (la F baja, la L sube).

**Key Characteristics:**
- Tinta azulada, blanco frío y un único acento, ember, que solo marca estado y progreso.
- Títulos en una grotesca muy ancha (Druk Wide, elección de Guillem), también para el rótulo del hero; texto en Instrument Sans y el eslogan en Instrument Serif cursiva.
- Mayúsculas anchas para títulos; versalitas espaciadas para etiquetas.
- Hilos de 1px y esquinas rectas; cero sombras, cero cristal, cero tarjetas.
- Créditos en los márgenes: abajo a la izquierda el texto, arriba los controles.

## Colors

Paleta tomada de la propia película del hero, sin ningún tono ajeno al plano.

### Primary
- **Ember, el sol bajo** (#e0602a): el único acento. Relleno de la marca tras cargar, progreso de 1px (carga, índice de equipo, scrub), subrayado del correo, foco de teclado, estado activo de los controles, selección de texto. Complementario del verde azulado del etalonaje.

### Neutral
- **Tinta de sombras** (#060a0c): fondo de todo. Negro que tira al azul de las sombras de la película; nunca #000.
- **Papel de cielo** (#eef1f0): texto y marca. Blanco frío, el del cielo del plano. Se atenúa por opacidad (0,72 secundario, 0,6 legal, 0,3 inactivo, 0,16 contorno gigante, 0,1 hilos) en lugar de introducir grises.

### Named Rules
**The One Ember Rule.** Ember es el único color del sistema y aparece solo como estado, progreso o foco; nunca como relleno de superficie ni de texto corrido.

**The Tinted Neutral Rule.** No hay grises: la jerarquía de tono se hace con papel a distinta opacidad sobre la tinta.

## Typography

Tres voces, cada una con un solo papel (Guillem, 7/10/2026):

- **Títulos:** Druk Wide (Commercial Type, de pago). Mientras no haya licencia la sustituye Archivo a `wdth` 125 y peso 900. Todo cuelga de tres tokens en `app/globals.css` (`--font-title`, `--title-weight`, `--title-stretch`): cambiar de fuente es cambiar esos tres y cargar el woff2 con `next/font/local`.
- **Texto:** Instrument Sans variable (peso 400–700, anchura 75–100). Cuerpo, entradillas, etiquetas, pies y el índice del equipo.
- **Rótulo del hero:** Druk Wide ya, dibujado: contornos exportados de Figma (`public/media/words/*-hero.svg`, una `<path>` por letra) que se leen en el build (`content/words.ts`). «FREE» sobre «LOST» siempre apiladas, como las dos hojas de la marca; mayúsculas de 0,686em de `--brand` (min(21vw, 32svh)) y 0,154em entre líneas.
- **Eslogan:** Instrument Serif cursiva, también dibujado (`*-slogan.svg`, una palabra por fichero). Ninguna de las dos fuentes se carga: el morph del hero necesita las formas como contornos.

### Hierarchy
- **Display** (título, 900, clamp(2rem, 5vw, 4.75rem), 0.92, mayúsculas): titular del contacto, entre 3 y 4 líneas.
- **Headline** (título, 900, clamp(1.6rem, 3vw, 3rem), 0.9, mayúsculas): títulos de sección (Proyectos, Lo que uso, About), arriba a la izquierda.
- **Lead** (Instrument Sans 400, clamp(1.75rem, 3.4vw, 3rem), 1.12): entradilla y cierre del About.
- **Title** (600, 20px, 1.25, wdth 88%, mayúsculas): pie de foto del proyecto activo en el carrete; el nombre en el hero.
- **Body** (400, clamp(1.125rem, 1.7vw, 1.6rem), 1.35, papel 0,72): cuerpo del About; subtítulo del contacto algo menor.
- **Label** (500, 0.72rem, 0,18em de tracking, mayúsculas): rol, controles, canales, contador, aviso legal, dirección de correo.
- **Wordmark** (título a 0,8rem, minúsculas «free lost»): en el pie.
- **Slogan** (Instrument Serif cursiva dibujada, «Feel free» / «to get lost.», a 0,92em entre líneas base y 0,24em entre palabras; sin cuerpo fijo: lo escala la salida del hero del 42 % al 94 % de lo que cabe en pantalla).

### Named Rules
**The Wide-Is-Title Rule.** La fuente ancha es solo para títulos cortos y la marca escrita; nunca para párrafos ni para el eslogan.

**The Tight Display Rule.** Los títulos llevan interlineado 0,9 y tracking 0; las máscaras de palabra reservan aire abajo (0,06–0,12em) para no cortar astas ni descendentes.

## Layout

Cada bloque es una pantalla a sangre (100svh) sin contenedor ni rejilla de columnas: el contenido se ancla a los márgenes del plano con `--gutter` (clamp(1.25rem, 2.6vw, 2.5rem)). Convención de créditos: título de sección arriba a la izquierda; texto de cierre abajo a la izquierda; controles arriba a la derecha. El eslogan no tiene sitio fijo en el chrome: vive solo en la salida del hero. El pie usa dos columnas (marca, aviso legal) que en móvil se apilan.

Orden de la home: hero (con el eslogan en su salida) → carrete → «Lo que uso» → About → contacto → pie. Los bloques se apoyan en escenas de scroll (spacer + sticky): el hero es una escena fijada de 340vh, el carrete es una sola pantalla que la página rebasa con scroll normal, «Lo que uso» baja encima del carrete y fija un viewport por objeto, y el About es flujo normal (unos 300svh de lectura). Breakpoint único de diseño: 720px (móvil), con composiciones distintas, no solo reducidas. Zonas táctiles mínimas de 44px. La lente curva del carrete es solo de puntero fino.

## Elevation & Depth

Plano por completo. No hay sombras, desenfoques ni cristal en el sistema nuevo. La profundidad la dan el propio metraje, un scrim degradado de tinta en los bordes del hero (0,78 abajo, 0,5 arriba) solo para leer los créditos, y el movimiento: el plano del hero se desasienta (escala 0,84, giro −1,5°) al salir.

### Named Rules
**The Flat Frame Rule.** Ninguna superficie lleva sombra, borde grueso ni cristal. Si algo debe separarse, se usa un hilo de 1px a papel al 10%.

## Shapes

Esquinas rectas en todo (0px). Contornos de 1px (papel al 16% en la marca gigante, 10% en el hilo del pie, 14% en pistas de progreso). La marca son dos hojas de pincel independientes: una F que sube (punta arriba, izquierda) y una L que baja (punta abajo, derecha); proporción 422:1441 (0,29285). Los controles son iconos de trazo de 1,5px, sin contenedor.

## Components

### Controls (sonido, play/pausa)
- **Shape:** sin caja; solo etiqueta e icono de 15px, hit de 44×44.
- **Default:** papel al 78%. **Hover / pressed:** papel pleno; el icono activo pasa a ember.
- **Press:** escala 0,96 en 0,14s. **Focus:** contorno de 1px ember, desplazamiento −6px.

### Mail link (el contacto)
- Titular en display y subtítulo en body debajo. El enlace es la palabra «Email», grande, en peso 300 con flecha, y la dirección va debajo en etiqueta (seleccionable de un clic); el subrayado de 1px papel al 25% se rellena de ember al hover o foco (0,28s). Hover solo con puntero fino. Foco: contorno de 1px ember a 6px.

### Channel links
- Etiquetas de 0,72rem con icono de 13px, papel al 72%, hit de 44px; pasan a papel pleno al hover.

### Footer
- Hilo superior de 1px (papel 10%), fondo tinta; marca de 32px + «free lost» en la fuente de título, aviso legal en etiqueta (papel 60%). Sin eslogan: se descubre antes, en su escena.

### Signature: la marca (loader → lockup)
- Las dos hojas entran por la costura (F desde arriba, L desde abajo) en 0,6s y frenan en seco, sin pasarse; el relleno ember arranca en el mismo frame y sube a velocidad constante (0,7s mínimo). El velo se parte por la costura (mitad izquierda sube, derecha baja, 1,1s). Sin pausa, la marca ember se funde en 0,3s sobre la blanca, que vuela a la esquina del hero en 1,3s y se asienta junto a «free lost». En el contacto, la marca gigante en contorno repite el gesto.

### Pistas (scroll y arrastre)
- Dos hermanas con la misma gramática: etiqueta en label (papel 0,72) y un hilo de 1px a papel 14% por el que corre un trazo de papel con `--ease-in-out` (2,4s). Sin caja, flecha ni ember: son un crédito más. **Scroll**, en el hero, abajo a la derecha: hilo vertical de 44px, el trazo baja; entra la última de los créditos y se va con el primer scroll. **Arrastre**, en el carrete, abajo a la izquierda (frente a «todos los proyectos»): hilo horizontal de 44px, el trazo va y vuelve como la cinta; entra tras las tarjetas y se va con el primer gesto sobre ellas. Con movimiento reducido el trazo se queda quieto.

### Carrete de proyectos
- Tarjetas 16:9 con separación de 12px, arrastre con inercia, bucle infinito. La banda es el 50% de la altura de la sección. Marca de 1px ember sobre la tarjeta central; pie con título y contador de dígitos que ruedan; progreso de 1px ember. Desktop: lente curva en los bordes; táctil: tarjetas planas.

### Eslogan
- «Feel free to get lost.» es la salida del hero. Con el scroll se van los créditos y la película se queda quieta, a sangre. El rótulo no se va: se convierte en el eslogan. Cada letra de «FREE» y «LOST» se transforma en la suya de «free» y «lost.» (F→f, R→r… el contorno de una se deforma en el de la otra; los huecos que solo tiene una nacen o mueren en un punto, y el punto final crece desde el suyo) mientras la palabra viaja a su sitio en la frase y encoge (0,03–0,26 de la escena). Las letras arrancan escalonadas, de izquierda a derecha. Mientras tanto «Feel», «to get» y el punto aparecen alrededor (0,14–0,28). El eslogan, en papel y en dos líneas, crece de forma geométrica hasta 80vh de alto, o lo que quepa a lo ancho (0,3–0,55). Siempre es papel: no hay máscara. Mientras crece, la película (con su velo, en cámara lenta, 0,6×) encoge desde el centro hasta 70vh de alto; ahí se queda de ese tamaño y sube lo mismo que el scroll, como si la página la soltara, mientras el eslogan sigue quieto. Cuando sale, queda el eslogan en blanco sobre tinta y la escena se suelta sin costura con el carrete. Con movimiento reducido no crece: aparece a su tamaño final y solo cambian las opacidades. Nunca en la fuente de título.

### Carrete (título)
- «Proyectos» entra en contorno (1px papel, sin relleno): la primera vez que se llega aparece solo en el centro, grande (78% del ancho, máx. 3,2× su tamaño), por detrás del lienzo. Las tarjetas esperan un tramo de scroll (hasta que la sección clavada ha subido 0,3 pantallas): al empezar a subir, el título del centro se desvanece, y al acabar el rise reaparece arriba a la izquierda (a 2,2 gutters del techo) como rótulo de fondo disimulado: relleno, sin contorno, papel al 12% y más grande (clamp(2.4rem, 7vw, 7.5rem)). Con movimiento reducido, o volviendo de todos los proyectos, está ya en su sitio.

### About
- Título de sección arriba a la izquierda; entradilla sola en su pantalla; cuerpo en una columna de 34ch desplazada a la derecha; cierre con media pantalla de aire encima; crédito de Guillem pequeño tras un hilo de 1px. Cada párrafo sube por líneas (máscara por palabra, agrupadas por línea) ligado al scroll, así que se rebobina: las líneas se solapan (cada una ocupa 1,6 huecos) y frenan al asentarse. Los lectores de pantalla leen el párrafo entero, no las palabras partidas.

### Equipo («Lo que uso»)
- Lista de nombres en Instrument Sans 700 a 75% de ancho, papel al 62% (85% hover, pleno el activo, que se ensancha al 100%) que hace de índice y progreso (hilo de 1px ember). Un único lienzo 3D rellena el escenario: objetos negros con brillo de borde y contorno claro; al cambiar de objeto la forma se funde en la siguiente (morph de campos de distancia, 0,5 s, siempre completo, sin partículas).

## Do's and Don'ts

### Do:
- **Do** dejar que el metraje lidere: la interfaz a los márgenes, el centro del plano limpio.
- **Do** usar solo tinta (#060a0c), papel (#eef1f0) y ember (#e0602a); la jerarquía, por opacidad del papel.
- **Do** mover con las curvas de la casa: `--ease-out` (cubic-bezier(0.23, 1, 0.32, 1)) para UI, `--ease-out-expo` (cubic-bezier(0.16, 1, 0.3, 1)) para entradas largas, `--ease-in-out` (cubic-bezier(0.77, 0, 0.175, 1)) para movimiento en pantalla.
- **Do** respetar `prefers-reduced-motion`: sin traslación y con fundido de 0,4s.
- **Do** revelar texto con máscara de palabra desde la línea de corte, con retraso escalonado o ligado al scroll.
- **Do** mantener hit de 44px en todo lo clicable y foco visible con 1px ember.

### Don't:
- **Don't** usar la identidad v4 (negro/oro, Cinzel, Cormorant, Syne), ni `glass-card`, `action-pill` ni los cortes angulares: son residuo heredado que se va con los bloques antiguos. Hoy sobreviven en `components/ui/Cursor.tsx`, `Reveal.tsx` y la barra de `core/scroll/ScrollGate.tsx` (oro); no son referencia.
- **Don't** poner tarjetas, cristal, sombras, esquinas redondeadas ni desenfoque en el chrome.
- **Don't** usar ember como relleno de superficie, texto corrido ni decoración.
- **Don't** añadir una quinta familia ni grises neutros, ni usar la fuente de título en texto corrido.
- **Don't** hardcodear copy en los componentes: viene de `content/` por props.
- **Don't** afirmar créditos, clientes ni premios que el cliente no haya confirmado.
