# 009 — Guille plan: About, eslogan descubierto, Contact y tipografía

- **Status**: HECHO (pendiente del feel check y de la licencia de Druk Wide). Decisiones tomadas
  con los defaults recomendados: D1 traducir, D3 sin eslogan en el pie, D4 Vimeo fuera del contacto,
  D5 la palabra "Email" con la dirección debajo, D6 "Free Lost" en el texto. D2: el rótulo del hero también pasa a la fuente de título (apilado). Abiertas: D7, D8.
- **Cambio sobre el plan**: «Lo que uso» no puede separarse del carrete (su escenario baja encima
  de él mientras sigue clavado, `ENTRY_VH` en `blocks/gear/Gear.tsx`). El orden real es hero →
  carrete → «Lo que uso» → **eslogan** → **About** → contacto. El eslogan va antes del About para
  que el cierre de este sea un eco y no una repetición pegada.
- **Origen**: mensajes de Guillem del 7/10/2026
- **Severity**: HIGH (copy oficial del cliente y cambio de tipografía de todo el sitio)
- **Category**: Contenido / ritmo del scroll / tipografía
- **Estimated scope**: 2 bloques nuevos (`about`, `slogan`), 3 bloques tocados (`hero`, `contact`,
  `footer`), fuentes en `app/[lang]/layout.tsx` y `app/globals.css`, `content/`, `DESIGN.md`

## Lo que pide el cliente

1. **Eslogan oficial: "Feel free to get lost."** Debe aparecer *más adelante* en el scroll,
   discreto, con mucho aire alrededor, casi como si el visitante lo descubriera.
2. **Sección About** con este texto (y, separado y más pequeño, la línea de Guillem):

   > Free Lost creates films and visual stories around sport, nature, adventure and people.
   >
   > We are drawn to the moments that feel real — effort, uncertainty, movement, silence, connection.
   >
   > The aim is not to make life look perfect, but to capture what makes it worth living.
   >
   > Stories about people who move, explore, try, fail, push forward and choose to experience life
   > rather than simply pass through it.
   >
   > Because sometimes getting lost is part of finding where you want to go.

   > *Free Lost is led by Guillem Salvador, a filmmaker based in Catalonia working across
   > documentary, branded content and outdoor storytelling.*

3. **Contact**: título "Let’s make something worth remembering.", debajo "Available for selected
   projects and collaborations.", y dos enlaces: **Email** e **Instagram**.
4. **Tipografía**: para títulos le gusta **Druk Wide** (dudaba entre Druk Wide, Founders Grotesk
   Condensed, League Gothic y Archivo Black); para el texto normal, **Instrument Sans**.

## Estado actual que choca con esto

- El eslogan ya está **dos veces** y muy visible: debajo del rótulo del hero (Instrument Serif
  cursiva, `content/hero.ts`) y en el pie (`content/contact.ts → footerContent`). Si sale en la
  primera pantalla, ya no se puede "descubrir". **Hay que quitarlo del hero.**
- No existe sección About.
- El contacto dice "Let’s talk about your next shoot", enseña el correo como texto grande y lista
  Instagram + Vimeo (`content/contact.ts`).
- Fuentes hoy (`app/[lang]/layout.tsx`): Archivo variable (todo), Six Caps (rótulo del hero),
  Instrument Serif cursiva (eslogan). `DESIGN.md` aún dice "una sola familia" y está desfasado.

## Ritmo: dónde va cada cosa

El plan 007 montó la página como una película: planteamiento → pico → valle → resolución. About y
el eslogan se meten en ese montaje sin romperlo.

### Orden propuesto de la home

| # | Bloque | Papel en el ritmo | Carácter |
| --- | --- | --- | --- |
| 1 | loader → hero | Planteamiento | Lento, sostenido. **Sin eslogan.** Solo marca, nombre y rol. |
| 2 | reel | Pico | Rápido, cinético. Primero el trabajo: es lo que decide al cliente. |
| 3 | **about** | Bajada: la voz | Lectura tranquila. Tras ver las películas, quién las hace y por qué. |
| 4 | gear | Valle | Contemplación, objeto 3D. |
| 5 | **slogan** | Silencio | Casi una pantalla vacía. El eslogan aparece pequeño, descentrado. |
| 6 | contact | Resolución | El título nuevo cierra; la marca se rellena como en el loader. |
| 7 | footer | Créditos | Sin eslogan (ver decisión D3). |

**Por qué About después del carrete y no antes:** quien encarga llega a ver si puede rodar en sus
condiciones (PRODUCT.md). Primero la prueba, luego la voz. Un About antes del carrete retrasa el
metraje y suena a presentación.

**Por qué el eslogan entre "Lo que uso" y el contacto, y no justo después del About:** el About
acaba en "Because sometimes getting lost is part of finding where you want to go". Si el eslogan
viene justo detrás, es la conclusión del párrafo (se lee como repetición). Con el equipo en medio
es un **eco**: el visitante ya ha olvidado la frase, y al encontrarse "Feel free to get lost." en
el silencio la reconoce. Además, es lo último antes de "Let’s make something worth remembering":
la invitación a perderse justo antes de la invitación a escribir.

Alternativa si el eco no funciona en el feel check: el eslogan justo tras el carrete, como respiro
después del pico (y el About detrás, explicándolo). Cambiar de sitio = mover una línea en
`content/pages/home.ts`.

## Bloque nuevo `about`

**Composición** (fondo tinta, sin imagen; todo en Instrument Sans salvo la etiqueta):

1. Etiqueta de sección "About", arriba a la izquierda (convención de créditos, `DESIGN.md`).
   Opcional: el título en Druk Wide en lugar de etiqueta, igual que los demás títulos de sección.
2. **Entradilla**: "Free Lost creates films…". Grande (≈ clamp(1.75rem, 3.4vw, 3rem)), ancho de
   ~22ch, ocupa la primera pantalla sola. Es la frase que explica el estudio a quien no lo conoce.
3. **Cuerpo**: los tres párrafos siguientes en una columna de ~34ch, tamaño body
   (clamp(1.125rem, 1.7vw, 1.6rem)), papel al 0,72. Desplazada hacia la derecha respecto a la
   entradilla, para que la lectura baje en diagonal y no sea un bloque de texto de web corporativa.
4. **Cierre**: "Because sometimes getting lost…" sola, con una pantalla de aire encima, mismo tamaño
   que la entradilla pero en papel al 100 %. Es el gancho del eco con el eslogan.
5. **Crédito de Guillem**, separado por un hilo de 1px al 10 % y bastante aire: tamaño small
   (~0,95rem), papel al 0,6, ancho ~48ch. "Más pequeño" como pide el cliente; no compite.

**Movimiento** (gramática existente, sin nada nuevo):
- Cada párrafo entra con **máscara de línea** que sube desde su corte, **ligada al scroll (scrub)**,
  no disparada una vez: se puede rebobinar (tesis del plan 007, punto 5).
- La lista "effort, uncertainty, movement, silence, connection" puede entrar palabra a palabra con el
  stagger que depende de la velocidad (como el titular de contacto). Solo esa frase; el resto, por
  líneas, para no convertir la lectura en un efecto.
- Sin escena fijada: flujo normal, ~250–300svh en total. Lo mueve `scrollController.subscribe`, como
  las hojas del contacto. Ningún listener propio.
- `prefers-reduced-motion`: todo visible, sin máscaras.

**Móvil (<720px)**: una columna, entradilla a ~1,6rem, el desplazamiento diagonal desaparece, el
cierre conserva su pantalla de aire.

**Ficheros**:
- `blocks/about/index.ts` (schema zod: `anchor` = "about", `label`, `lead`, `body: string[]`,
  `closing`, `credit`, `lang?`), `About.tsx`, `about.module.css`.
- `blocks/registry.ts`: registrar.
- `content/about.ts`: copy por idioma (ver decisión D1).

## Bloque nuevo `slogan`

Una escena casi vacía. Lo que la hace funcionar es el **aire**, no el efecto.

- **Escena**: `ScrollScene` de ~180vh con sticky de 100svh. El visitante baja por tinta vacía (tras
  el valle del equipo) y la frase está ahí, quieta.
- **Posición**: descentrada, no en el centro. Por ejemplo en el tercio inferior, alineada a la
  columna derecha del gutter. Un eslogan centrado es un cartel; uno descentrado se encuentra.
- **Tamaño**: pequeño. Instrument Serif cursiva (la voz que ya tiene el eslogan) a ~1,25–1,6rem,
  papel al 0,72. Nada de Druk Wide aquí: el cliente dice *discreto*.
- **Aparición**: opacidad de 0 a 0,72 y una subida de unos pocos px en el tramo central de la
  escena (≈ 0,3–0,55 del progreso), y se apaga al salir. Scrub con `useSceneProgress`.
- **Opcional, el "descubrimiento"**: usar el canal de velocidad (`scrollController.velocity()`) para
  que la frase gane opacidad cuando el visitante baja despacio o se para, y se quede tenue si pasa
  rápido. Nunca a 0 del todo: no se puede perder. Decidir en el feel check.
- `prefers-reduced-motion`: visible y quieta.
- `lang="en"` en ca/es (ya se hace así en hero y pie).

**Ficheros**: `blocks/slogan/index.ts`, `Slogan.tsx`, `slogan.module.css`; registrar. El texto sale
de una constante única (`content/brand.ts`: `SLOGAN`) para no tenerlo escrito en tres sitios.

## Hero: quitar el eslogan

- `content/hero.ts`: fuera `slogan` y `sloganLang`; `blocks/hero/index.ts`: quitarlos del schema.
- `Hero.tsx` / `hero.module.css`: el rótulo, el hueco y el eslogan cuelgan de `--brand` (`.title`).
  Sin eslogan hay que reequilibrar: el rótulo puede crecer o bajar un poco, y la salida (free sube /
  lost baja) sigue igual.
- **Ojo**: `hero.module.css` y `app/globals.css` tienen cambios sin commitear. Hacer esto después de
  que el usuario los cierre, no encima.

## Contact

- `content/contact.ts`:
  - `title`: "Let’s make something worth remembering." (apóstrofo tipográfico).
  - Nuevo campo `subtitle`: "Available for selected projects and collaborations."
  - Enlaces: **Email** e **Instagram**. Vimeo sale del contacto (puede seguir en el pie, ver D4).
- `blocks/contact/index.ts`: añadir `subtitle`. Decidir si el correo se enseña como dirección o como
  la palabra "Email" (D5). Si es la palabra, Email e Instagram pasan a ser dos enlaces iguales, y el
  imán del correo se queda solo en el de Email.
- Título en Druk Wide, mayúsculas, interlineado ~0,9. Con una fuente ancha la frase va en 3–4 líneas
  a tamaño display: es lo esperable y le da peso. Subtítulo en Instrument Sans, papel al 0,72.
- Las hojas F/L y el relleno ember se quedan como están.

## Tipografía

### Opinión para Guillem sobre los títulos

- **Druk Wide** es buena elección: ancha y pesada, se lee como deporte y aire libre, y contrasta
  bien con un texto fino como Instrument Sans. Funciona mejor **grande, corta y con mucho espacio
  alrededor**, justo lo que pide para el sitio. Riesgos: está muy vista en marcas deportivas y de
  ropa, y con frases largas pesa mucho. Por eso solo títulos cortos (secciones, título de contacto),
  nunca párrafos.
- **Es de pago** (Commercial Type). Hace falta comprar la **licencia web** (va por visitas al mes) y
  basta **un solo peso** (p. ej. Bold o Heavy), en woff2 con subconjunto latino. Founders Grotesk
  Condensed (Klim) también es de pago. League Gothic y Archivo Black son gratis (Google Fonts):
  League Gothic es condensada (la línea de Six Caps, lo contrario de Druk Wide); Archivo Black es
  correcta pero genérica.
- **Mientras no haya licencia**: se maqueta con Archivo a `wdth` 125 y peso 900 (ya está cargada),
  detrás de un token `--font-title`. Cambiar a Druk Wide será cambiar el token y el fichero.

### Instrument Sans para el texto

- Gratis, en Google Fonts, variable en peso (400–700) y anchura (75–100). Sustituye a Archivo en
  cuerpo, etiquetas y pies.
- Consecuencia: la regla "el ancho es la voz" de `DESIGN.md` (Archivo de 62 a 125) ya no aplica
  igual. Etiquetas a `wdth` 100 con tracking; la marca "free lost" del hero y del pie podría pasar a
  Druk Wide pequeña (lo más parecido al Archivo 125 actual).

### Presupuesto de fuentes

Hoy se precargan ~113 KB. Objetivo: no pasar de ~4 ficheros.

| Fuente | Uso | Queda |
| --- | --- | --- |
| Druk Wide (1 peso, `next/font/local`) | Títulos, título de contacto, ¿rótulo del hero?, ¿marca? | Sí |
| Instrument Sans (variable, `latin`) | Todo el texto | Sí |
| Instrument Serif cursiva | Solo el eslogan | Sí (pero sin precargar: el eslogan ya no está en la primera pantalla, `preload: false`) |
| Six Caps | Rótulo del hero | **Sale** (D2: el rótulo pasa a la fuente de título) |
| Archivo | Todo | **Sale** al terminar |

### Ficheros

- `app/[lang]/layout.tsx`: `Instrument_Sans` desde `next/font/google`; Druk Wide con
  `next/font/local` (woff2 en `app/fonts/`); quitar Archivo cuando no quede ningún uso.
  Antes de escribir, leer la guía de fuentes en `node_modules/next/dist/docs/` (AGENTS.md).
- `app/globals.css` (`@theme`): `--font-sans` → Instrument Sans, nuevo `--font-title`, revisar
  `--font-display` y los `font-variation-settings: 'wdth'` que se queden huérfanos.
- Barrido de `wdth` en los `.module.css` de los bloques.

## Idiomas

El cliente ha dado el copy solo en inglés y el sitio es EN / CA / ES. El eslogan se queda en inglés
en los tres (ya se hace así). Para About y Contact, ver D1.

## Orden de ejecución

1. **Fuentes con sustituto**: tokens `--font-title` (Archivo 125/900 por ahora) e Instrument Sans.
   Es la base de todo lo demás.
2. **Contact**: copy nuevo, subtítulo y enlaces. Es el cambio más pequeño y visible.
3. **About**: bloque nuevo y su sitio en `home.ts`.
4. **Slogan**: bloque nuevo, en `home.ts` entre `gear` y `contact`.
5. **Hero sin eslogan** (después de commitear los cambios pendientes del hero) y pie según D3.
6. **Druk Wide real** cuando llegue la licencia: cambiar el fichero y el token.
7. `DESIGN.md` (familias, jerarquía, regla del ancho, nuevas secciones) y `BACKLOG.md`.

Comprobaciones tras cada paso (sin arrancar el sitio): `npx tsc --noEmit`, `npm run lint`,
`npm run build`, y `grep -c ZodError` en los chunks que cita `out/index.html` = 0. El feel check lo
hace el usuario con `npm run dev`: ritmo About → gear → silencio → contacto, si el eslogan se
encuentra o se pierde, y el título de contacto en móvil.

## Decisiones abiertas

- **D1 — Idiomas.** ¿About y Contact en inglés en las tres versiones, o se traducen a CA/ES?
  Recomendado: traducir (el resto del sitio está traducido); las traducciones las redacto y Guillem
  las revisa. **[cliente]**
- **D2 — ¿Qué es "el título"?** ¿Druk Wide solo para títulos de sección y contacto, o también para
  el rótulo "free lost" del hero (hoy Six Caps, muy estrecha: lo contrario de Druk Wide)?
  Recomendado: probar las dos con capturas antes de decidir; mezclar ultraestrecha y ultraancha en
  la misma página es arriesgado. **[cliente]**
- **D3 — Eslogan en el pie.** Si el eslogan se descubre dos pantallas antes, repetirlo en el pie lo
  debilita. Recomendado: quitarlo del pie (queda marca + aviso legal). **[cliente]**
- **D4 — Vimeo.** El cliente lista solo Email e Instagram en Contact. ¿Vimeo (e IMDb) siguen en el
  pie? Recomendado: sí en el pie, no en Contact.
- **D5 — Correo visible o la palabra "Email".** El cliente escribe "Email". Enseñar la dirección
  deja copiarla sin abrir el cliente de correo; la palabra queda más limpia. Recomendado: la palabra
  "Email" como enlace `mailto:` y la dirección como `title`/texto secundario pequeño.
- **D6 — "Free Lost" o "free lost".** El copy del cliente usa mayúsculas iniciales; la marca del
  sitio va en minúsculas. Recomendado: minúsculas en la marca (logo, wordmark) y respetar "Free
  Lost" en el texto corrido, como lo escribe él. **[cliente]**
- **D7 — Licencia de Druk Wide.** ¿La compra Guillem? Hasta entonces, sustituto. **[cliente]**
- **D8 — ¿Foto de Guillem en el About?** No la ha pedido. Si quiere, iría junto al crédito pequeño,
  no en la entradilla. **[cliente]**
