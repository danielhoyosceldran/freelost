---
name: free lost
description: Portfolio de Guillem Salvador. Una película a pantalla completa enmarcada como cartón de título; tinta azulada, blanco frío y un solo acento naranja.
colors:
  ink: "#060a0c"
  paper: "#eef1f0"
  ember: "#e0602a"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.75rem, 6.4vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.012em"
    fontVariation: "'wdth' 72"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2rem, 4.2vw, 4rem)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.012em"
    fontVariation: "'wdth' 72"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 88"
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.125rem, 1.7vw, 1.6rem)"
    fontWeight: 300
    lineHeight: 1.15
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.18em"
    fontVariation: "'wdth' 112"
  wordmark:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 125"
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
- Una familia (Archivo) trabajada en su eje de anchura: condensada para titulares, expandida para la marca.
- Mayúsculas condensadas para nombre y títulos; versalitas espaciadas para etiquetas.
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

**Display / Body / Label Font:** Archivo variable (con Helvetica Neue, Arial, sans-serif), eje de anchura `wdth` 62–125, cargada con `next/font`. Una sola familia, sin segunda fuente.

**Character:** El mismo tipo en tres anchos cuenta tres voces: condensado y rotundo para el nombre, expandido y sereno para el estudio, cursiva ligera para la promesa.

### Hierarchy
- **Display** (800, clamp(2.75rem, 6.4vw, 6rem), 0.86, wdth 72%, mayúsculas): nombre en el hero y titular del contacto. Cada palabra entra con máscara. En móvil el nombre se parte en dos líneas.
- **Headline** (800, clamp(2rem, 4.2vw, 4rem), 0.86, wdth 72%, mayúsculas): títulos de sección (Proyectos, Lo que uso), arriba a la izquierda.
- **Title** (600, 20px, 1.25, wdth 88%, mayúsculas): pie de foto del proyecto activo en el carrete.
- **Body** (300, clamp(1.125rem, 1.7vw, 1.6rem), 1.15): eslogan en cursiva de 16ch como máximo; el correo, en 300 hasta 3,25rem.
- **Label** (500, 0.72rem, 0,18em de tracking, wdth 112%, mayúsculas): rol, controles, canales, contador, aviso legal.
- **Wordmark** (600, 0,95rem, wdth 125%, minúsculas «free lost»): junto a la marca en el hero y el pie.

### Named Rules
**The Width-Is-Voice Rule.** El ancho comunica el rol: 72% titulares, 88% pies, 112% etiquetas, 125% marca. No se añade otra familia para diferenciar.

**The Tight Display Rule.** Los titulares condensados llevan interlineado 0,86 y tracking −0,012em; las máscaras de palabra reservan 0,06em de aire abajo para no cortar astas.

## Layout

Cada bloque es una pantalla a sangre (100svh) sin contenedor ni rejilla de columnas: el contenido se ancla a los márgenes del plano con `--gutter` (clamp(1.25rem, 2.6vw, 2.5rem)). Convención de créditos: título de sección arriba a la izquierda; texto de cierre abajo a la izquierda; controles arriba a la derecha; eslogan abajo a la derecha. El pie usa tres columnas (marca, aviso legal, eslogan) que en móvil se apilan.

Los bloques se apoyan en escenas de scroll (spacer + sticky): el hero es una escena fijada de 165vh, el carrete es una sola pantalla que la página rebasa con scroll normal, y «Lo que uso» fija un viewport por objeto. Breakpoint único de diseño: 720px (móvil), con composiciones distintas, no solo reducidas. Zonas táctiles mínimas de 44px. La lente curva del carrete es solo de puntero fino.

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
- Enlace grande en peso 300 con flecha; el subrayado de 1px papel al 25% se rellena de ember al hover o foco (0,28s). Hover solo con puntero fino. Foco: contorno de 1px ember a 6px.

### Channel links
- Etiquetas de 0,72rem con icono de 13px, papel al 72%, hit de 44px; pasan a papel pleno al hover.

### Footer
- Hilo superior de 1px (papel 10%), fondo tinta; marca de 32px + «free lost», aviso legal en etiqueta (papel 60%), eslogan en cursiva 300 a la derecha.

### Signature: la marca (loader → lockup)
- Las dos hojas entran por la costura (F desde arriba, L desde abajo) en 0,6s y frenan en seco, sin pasarse; el relleno ember arranca en el mismo frame y sube a velocidad constante (0,7s mínimo). El velo se parte por la costura (mitad izquierda sube, derecha baja, 1,1s). Sin pausa, la marca ember se funde en 0,3s sobre la blanca, que vuela a la esquina del hero en 1,3s y se asienta junto a «free lost». En el contacto, la marca gigante en contorno repite el gesto.

### Carrete de proyectos
- Tarjetas 16:9 con separación de 12px, arrastre con inercia, bucle infinito. La banda es el 50% de la altura de la sección. Marca de 1px ember sobre la tarjeta central; pie con título y contador de dígitos que ruedan; progreso de 1px ember. Desktop: lente curva en los bordes; táctil: tarjetas planas.

### Equipo («Lo que uso»)
- Lista de nombres en 800 condensado a papel al 30% (62% hover, pleno el activo) que hace de índice y progreso (hilo de 1px ember). Un único lienzo 3D rellena el escenario: objetos negros con brillo de borde y contorno claro; al cambiar de objeto la forma se funde en la siguiente (morph de campos de distancia, 0,5 s, siempre completo, sin partículas).

## Do's and Don'ts

### Do:
- **Do** dejar que el metraje lidere: la interfaz a los márgenes, el centro del plano limpio.
- **Do** usar solo tinta (#060a0c), papel (#eef1f0) y ember (#e0602a); la jerarquía, por opacidad del papel.
- **Do** mover con las curvas de la casa: `--ease-out` (cubic-bezier(0.23, 1, 0.32, 1)) para UI, `--ease-out-expo` (cubic-bezier(0.16, 1, 0.3, 1)) para entradas largas, `--ease-in-out` (cubic-bezier(0.77, 0, 0.175, 1)) para movimiento en pantalla.
- **Do** respetar `prefers-reduced-motion`: sin traslación y con fundido de 0,4s.
- **Do** revelar texto con máscara de palabra desde la línea de corte, con retraso escalonado.
- **Do** mantener hit de 44px en todo lo clicable y foco visible con 1px ember.

### Don't:
- **Don't** usar la identidad v4 (negro/oro, Cinzel, Cormorant, Syne), ni `glass-card`, `action-pill` ni los cortes angulares: son residuo heredado que se va con los bloques antiguos.
- **Don't** poner tarjetas, cristal, sombras, esquinas redondeadas ni desenfoque en el chrome.
- **Don't** usar ember como relleno de superficie, texto corrido ni decoración.
- **Don't** añadir un segundo tipo de letra ni grises neutros.
- **Don't** hardcodear copy en los componentes: viene de `content/` por props.
- **Don't** afirmar créditos, clientes ni premios que el cliente no haya confirmado.
