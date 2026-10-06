# 003 — Hover del correo: subrayado a 280 ms, entrada intacta

- **Status**: DONE (pendiente de feel check del usuario)
- **Commit**: ad330db
- **Severity**: MEDIUM
- **Category**: Easing y duración
- **Estimated scope**: 1 fichero CSS, ~10 líneas

## Problem

El correo (el CTA de la página) comparte una única lista de transiciones entre su entrada y su
hover. El subrayado de acento (`background-size`) tarda 0,7 s en llenarse: demasiado blando para un
hover (presupuesto 150–250 ms).

```css
/* blocks/contact/contact.module.css:174-190 — current */
.mail,
.channels {
  opacity: 0;
  transform: translateY(12px);
  transition-property: opacity, transform, background-size;
  transition-duration: 0.9s, 0.9s, 0.7s;
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.mail { transition-delay: 0.45s, 0.45s, 0s; }
.channels { transition-delay: 0.6s, 0.6s, 0s; }
```

(`.channels` no usa `background-size`; está en la lista por compartir regla.)

## Target

- Entrada (`opacity`, `transform`): 0,9 s con la curva actual, mismos retardos.
- Subrayado de `.mail`: 280 ms, `cubic-bezier(0.23, 1, 0.32, 1)`, sin retardo, en ambos sentidos.

```css
/* blocks/contact/contact.module.css — sustituye las reglas de :174-190 */
.mail,
.channels {
  opacity: 0;
  transform: translateY(12px);
  transition-property: opacity, transform;
  transition-duration: 0.9s;
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1); /* var(--ease-out-expo) si existe */
}

.mail {
  /* El subrayado es hover, no entrada: va a su aire y rápido. */
  transition-property: opacity, transform, background-size;
  transition-duration: 0.9s, 0.9s, 0.28s;
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1), cubic-bezier(0.16, 1, 0.3, 1),
    cubic-bezier(0.23, 1, 0.32, 1); /* tokens: var(--ease-out-expo) ×2, var(--ease-out) */
  transition-delay: 0.45s, 0.45s, 0s;
}

.channels {
  transition-delay: 0.6s;
}
```

## Repo conventions to follow

- El estado de entrada es `.contact[data-in] …` (líneas 192-196): no se toca.
- Si el plan 001 está aplicado, usa los tokens indicados en los comentarios.

## Steps

1. En `contact.module.css`, sustituye las reglas `.mail, .channels {…}`, `.mail {…}` y
   `.channels {…}` de las líneas 174-190 por el bloque de arriba.
2. No toques `.arrow` ni `.channel` (se tratan en el plan 006).
3. Comprueba que el bloque `@media (prefers-reduced-motion: reduce)` (línea ~208) sigue ganando:
   `transition: opacity 0.4s ease` en `.mail, .channels` debe seguir después de las reglas nuevas.

## Boundaries

- No cambies markup ni la lógica de `Contact.tsx`.
- No toques el hover de `.channel`.
- No arranques el sitio; el usuario lo ejecuta.
- Si el CSS no coincide con lo citado, para y avisa.

## Verification

- **Mecánica**: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Feel check (lo hace el usuario)**: baja al contacto:
  - el correo y las redes entran igual que antes (misma duración y retardo);
  - el subrayado naranja se llena de un golpe ágil al pasar el ratón y se vacía igual de rápido;
  - al hacer hover antes de que acabe la entrada, el subrayado responde sin esperar los 0,45 s;
  - con DevTools a 10 % el subrayado acaba mucho antes que la entrada del correo;
  - con `prefers-reduced-motion`, el correo aparece con un fundido corto y sin desplazamiento.
- **Done when**: la entrada es idéntica y el hover del correo se siente inmediato.
