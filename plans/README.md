# Planes de animación

Auditoría de movimiento sobre el commit `ad330db`. Cada plan es autocontenido y lo puede ejecutar
cualquier agente. Ninguno arranca el sitio: el feel check lo hace el usuario con `npm run dev`.

| # | Plan | Sev. | Estado |
| --- | --- | --- | --- |
| 001 | [Tokens de easing y de tiempos del hero](001-tokens-de-easing.md) | MEDIUM | DONE |
| 002 | [El HUD del carrete sale rápido al abrir un proyecto](002-hud-sale-rapido.md) | MEDIUM | DONE |
| 003 | [Hover del correo: subrayado a 280 ms](003-hover-del-correo.md) | MEDIUM | DONE |
| 004 | [El título del carrete no se reinicia a cada tarjeta](004-titulo-del-carrete-interrumpible.md) | MEDIUM | DONE |
| 005 | [El marco del proyecto crece con transform y clip-path](005-marco-del-proyecto-flip.md) | HIGH | DONE |
| 006 | [Pulido: hover fino, pulsación, controles inertes](006-pulido-hover-pulsacion-controles.md) | LOW | DONE |
| 007 | [El scroll como montaje](007-montaje-del-scroll.md) | HIGH | EN CURSO |
| 008 | [Loader: golpe, relleno y apertura en un solo gesto](008-loader-golpe-relleno-apertura.md) | HIGH | HECHO (feel check pendiente) |
| 009 | [Guille plan: About, eslogan descubierto, Contact y tipografía](009-guille-plan.md) | HIGH | PROPUESTO |

## Orden recomendado

1. **001** primero: introduce los tokens que los demás citan (todos funcionan también sin él, con la
   curva literal).
2. **002, 003, 004**: independientes entre sí y pequeños. 002 y 004 tocan `reel.module.css` en
   zonas distintas, y 003 toca `contact.module.css`.
3. **005**: el de más riesgo y más impacto. Va solo, tras 002 (ambos tocan `reel.module.css`).
4. **006** al final: comparte `contact.module.css` con 003 y `reel.module.css` con 002/004/005.

## Dependencias

- 008 es independiente: solo toca el loader (`app/globals.css:158-242`, `blocks/loader/`) y `DESIGN.md:164`.
  Sustituye al sobrepaso, al destello y al pulso del loader, que antes estaban fuera de alcance.

- 003 → 006 (mismo fichero, mismas reglas de `.mail`).
- 002, 004, 005 → no se bloquean, pero conviene ejecutarlos en serie para no pelearse con
  `reel.module.css`.
- 005 deja una decisión abierta si el recorte inicial no coincide con la tarjeta (ver su paso 6).

## Fuera de alcance (deliberado)

Entradas largas del hero y del carrete, el muelle del carrete y el
movimiento reducido: están bien resueltos. El código muerto de v4 (`.scroll-reveal`,
`.action-pill`…) se va con la limpieza del backlog, no con estos planes.
