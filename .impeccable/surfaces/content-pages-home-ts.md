---
version: 1
slug: "content-pages-home-ts"
primary_target: "content/pages/home.ts"
related_targets: ["blocks/hero/Hero.tsx","blocks/loader/PageLoader.tsx","blocks/reel/Reel.tsx","blocks/gear/GearStage.tsx","blocks/contact/Contact.tsx"]
---

# Home: loader → hero → projects → what I use → contact

Scope: the home route. Sections: loader, hero, projects carousel (12 real films, full playback from local transcodes), "Lo que uso" (3 gear models, names only). Visitor mode: **Experience**: the film leads from the first viewport.
Audience and job: see PRODUCT.md. Constraints: static export, local media for v1 (Vimeo later), ES/EN/CA later via content files.
Unresolved: contact email, social URLs, real film titles (captions are provisional, from file names), real gear list, locale routing.

Sections after the first viewport:
- **Hero exit:** the hero is a short pinned scene (165vh). On scroll, the film frame comes unseated: it scales subtly to 0.9 with no rotation, while the credits and controls leave in the first half. Then the scene releases.
- **Projects:** a one-screen section; the page scrolls past it normally. It is React Bits' FlexCarousel with its own physics: drag with inertia and a spring to the nearest card, an infinite loop, natural 16:9 fit and a 12px gap. Only horizontal wheel is taken; vertical wheel stays with the page. On arrival the "PROYECTOS" title enters first, then after a 550ms pause the cards play the "rise". The edge lens (0.74 × 1.18, 65°, roundness 1, bend 0.34, reach 0.38, twist, dispersion 0.45) is desktop only (fine pointer); touch shows flat cards. Clicking the centre card opens the project; clicking a side card brings it to the centre, then opens it.
- **Contact (close):** full-viewport ink section. A giant outline logo (1px, paper 16%) is cropped at the right; on entry its F drops and its L rises, as in the loader. The title HABLEMOS DE TU PRÓXIMO RODAJE uses the same word-mask reveal as the hero name. The email is a large light link whose underline fills with ember; Instagram/Vimeo are small tracked links. Links are inert until real data exists. The footer repeats the mark+studio lockup, the legal line and the slogan.
- **Lo que uso:** a pinned scene, one viewport per object. The object fills the stage and turns with the scroll. When the next one comes in, the outgoing object rises and fades while the incoming one rises from below. The name list at bottom-left is the index (clickable) and the progress (ember 1px fill).

## Direction contract

THESIS: the category standard, played straight and finished at the level of top film-studio portfolios: a fullscreen film framed like a title card. It rejects any concept costume. The single owned moment is the brand mark assembling itself and opening the film along its own seam.

OWN-WORLD: blue-black ink taken from the film's shadows (#060a0c), cool paper white (#eef1f0), and one accent, ember (#e0602a), the low sun and autumn leaves that complement the teal grade. Archivo variable on its width axis: 72% condensed 800 uppercase for the name, 125% expanded for the studio wordmark, 300 italic for the slogan. Hairline 1px outlines, square corners, no cards, no glass.

STORY: the visitor watches the F fall and the L rise until they lock, the fill reports real loading, and the veil splits along the seam to reveal the film. They read who this is (Guillem Salvador, filmmaker, free lost) and the promise ("Feel free to get lost."), and can turn the sound on.

FIRST VIEWPORT: film at 100dvh, object-fit cover. The logo mark starts centred at 36svh (168–380px) under the loader's mark, then flies to the top-left into a lockup with the "free lost" wordmark (56px tall, 44px on mobile), so the film's centred subjects stay clear. Top-right: Sound toggle plus play/pause. Bottom-left: GUILLEM SALVADOR at up to 6rem with "Filmmaker" beneath. Bottom-right: slogan in italic. On mobile the name breaks onto two lines and the credits stack bottom-left.

FORM: canon (standing exit chosen by the user). Seed key 7dcbb4db. Signature interaction: blade lock → loading fill (F top-down, L bottom-up) → seam-split veil (left half up, right half down) → mark crossfades ember→white → the mark flies from the centre into the corner lockup → staggered word-mask reveal of the name.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
