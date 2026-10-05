---
version: 1
slug: "content-pages-home-ts"
primary_target: "content/pages/home.ts"
related_targets: ["blocks/hero/Hero.tsx","blocks/loader/PageLoader.tsx","blocks/reel/Reel.tsx","blocks/gear/GearStage.tsx"]
---

# Home: loader → hero → projects → what I use

Scope: the home route. Sections: loader, hero, projects carousel (12 real films, full playback from local transcodes), "Lo que uso" (3 gear models, names only). Visitor mode: **Experience**: the film leads from the first viewport.
Audience and job: see PRODUCT.md. Constraints: static export, local media for v1 (Vimeo later), ES/EN/CA later via content files.
Unresolved: contact email, social URLs, real film titles (captions are provisional, from file names), real gear list, the close of the page (contact/footer), locale routing.

Sections after the first viewport:
- **Projects:** the WebGL strip. Its entry is scroll-driven along the last 70% of the stage's arrival: each card rides a cubic arc from below-right into its slot, banking with the tangent, and the lens forms at the end. "PROYECTOS" title top-left; ember 1px tick and caption fade in at the end of the arc. No gate: plain scroll into the next section.
- **Lo que uso:** a pinned scene, one viewport per object. The object fills the stage and turns with the scroll. When the next one comes in, the outgoing object rises and fades while the incoming one rises from below. The name list at bottom-left is the index (clickable) and the progress (ember 1px fill).

## Direction contract

THESIS: the category standard, played straight and finished at the level of top film-studio portfolios: a fullscreen film framed like a title card. It rejects any concept costume. The single owned moment is the brand mark assembling itself and opening the film along its own seam.

OWN-WORLD: blue-black ink taken from the film's shadows (#060a0c), cool paper white (#eef1f0), and one accent, ember (#e0602a), the low sun and autumn leaves that complement the teal grade. Archivo variable on its width axis: 72% condensed 800 uppercase for the name, 125% expanded for the studio wordmark, 300 italic for the slogan. Hairline 1px outlines, square corners, no cards, no glass.

STORY: the visitor watches the F fall and the L rise until they lock, the fill reports real loading, and the veil splits along the seam to reveal the film. They read who this is (Guillem Salvador, filmmaker, free lost) and the promise ("Feel free to get lost."), and can turn the sound on.

FIRST VIEWPORT: film at 100dvh, object-fit cover. The logo mark starts centred at 36svh (168–380px) under the loader's mark, then flies to the top-left into a lockup with the "free lost" wordmark (56px tall, 44px on mobile), so the film's centred subjects stay clear. Top-right: Sound toggle plus play/pause. Bottom-left: GUILLEM SALVADOR at up to 6rem with "Filmmaker" beneath. Bottom-right: slogan in italic. On mobile the name breaks onto two lines and the credits stack bottom-left.

FORM: canon (standing exit chosen by the user). Seed key 7dcbb4db. Signature interaction: blade lock → loading fill (F top-down, L bottom-up) → seam-split veil (left half up, right half down) → mark crossfades ember→white → the mark flies from the centre into the corner lockup → staggered word-mask reveal of the name.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
