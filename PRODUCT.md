# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the people who commission a filmmaker. That means sport and outdoor brands, event and
camp organisers (races, triathlons, surf camps), athletes and agencies, plus corporate clients. They arrive from a
link (Vimeo, Instagram, IMDb, a referral) and decide in a few minutes whether this cinematographer
can deliver in their conditions. Most serious evaluation happens on a laptop or large screen. Phone
visits from social links are secondary but must still feel deliberate.

The specialty is read from the client's real footage (see Evidence): endurance and action sport
(road cycling, triathlon/Ironman, CrossFit, surf camps, climbing), travel (Lofoten) and corporate
work. The v4 premise (polar expeditions, -40 °C, hostile engineering) was invented and is retired.

## Product Purpose

This is the portfolio of Guillem Salvador, a working filmmaker, under the studio name free lost.
It exists to win commissions: show the work, make it obvious he can keep up with athletes in
motion, and turn interest into a direct email. Success means qualified producers and brands write in.

## Positioning

The claim a neighbouring portfolio could not copy has to come from the client's real footage,
It sits close to the athlete, shooting handheld and on the move, and the free lost name and slogan
promise the freedom of getting lost outdoors. Credits, client lists and records are still
unconfirmed, so the site must not claim them.

## Operating Context

- **v1:** videos and photos are served locally from `public/media/`.
- **Later:** videos move to Vimeo (embedded with `@vimeo/player`) and the site deploys to Vercel.
- Photos will be hosted on an external image platform (**undecided**). It must serve CORS headers,
  because stills are used as WebGL textures, and it must deliver resized/modern formats, because the
  static export cannot optimise images.
- Visitors also reach the client through Vimeo, Instagram and IMDb profiles. The footer links to
  them. URLs are pending.

## Capabilities and Constraints

- **Direction:** redesign. Keep the engine (block/registry architecture, `scrollController`, the
  WebGL2 reel engine, the three.js gear viewers) and replace the v4 look. The "1:1 parity with v4"
  goal in CLAUDE.md is superseded by this decision.
- **Hosting:** Vercel, as a Next.js static export (`output: 'export'`). Nothing may require a server.
- **Languages:** Spanish, English and Catalan. Copy lives in content files per locale, never in
  components. Locale routing must prerender statically (no middleware-based i18n).
- **Contact:** email link only (mailto plus direct contact details). The current mock form is to
  be removed. The client's email address is pending.
- **Devices:** desktop-first. Desktop gets the full cinematic experience. Mobile gets a lighter but
  polished version, and components or animations may differ by device rather than only scale
  down.
- **3D:** only in the gear section, where it is now. That section becomes a short scroll-driven
  sequence that lets the visitor discover the kit the filmmaker works with. It is secondary to the
  footage but should be memorable. Three.js stays lazy-loaded as its own chunk.
- **Library policy:** lean by default (Tailwind v4, zustand, own components and engines). The
  following are allowed when they earn their weight:
  - React Bits (reactbits.dev) for animations and carousels;
  - GSAP or Motion for timelines and text reveals;
  - headless primitives (Radix / Base UI), styled in-house;
  - Lenis-style smooth scroll.
  
  Anything that moves scroll must go through `scrollController`, which remains the single owner.

## Brand Commitments

- **Client:** Guillem Salvador.
- **Studio name:** free lost.
- **Slogan:** "Feel free to get lost."
- **Logo:** two brush-stroke blades side by side, an F rising (point up, left) and an L falling
  (point down, right). Master vector: `public/media/logos/freelost_logo.svg.svg` (two paths, white
  fill). Raster variants live in `public/media/logos/`. The two strokes are separate paths and may
  be animated independently.
- **Loader:** the two strokes travel in, the F from the top and the L from the bottom, lock together
  and then fill with a second colour (requested by the client).
- **Hero:** name, logo and slogan over a fullscreen autoplaying film
  (`public/media/videos/bici/FL1 insta.mp4`).
- The v4 identity (dark/gold, Cinzel / Cormorant / Syne) is not binding.

## Evidence on Hand

Real material (in `public/media/`, untracked so far):

- **Films** (`videos/`, originals plus 4-second `-reel-4s` cuts): `bici/` (FL1, downUrban),
  `crossfit/` (FL2, xfit), `ironman/` (FL3), `Raz_surfcamp/` (aftermovies, summer recap), `Lofoten/`,
  `Corporatiu/` (airtècnics).
- **Stills** (`fotos/`): `Bikes/`, `Viatges/`, `escalada/`, as full-size camera originals of 2–106 MB
  each.
- **Logos** (`logos/`).

Still placeholder: the gear list in `content/gear.ts`, the reel slides in `content/reel.ts`
(Pexels/Vimeo test clips) and every v4 headline and paragraph in `content/`.

The originals (some close to 1 GB) are not web deliverables. The site ships transcoded versions.

Do not fabricate: brands or clients worked with (e.g. the "Red Bull Media" placeholder), credits,
awards, press, testimonials, the athletes' identities or gear the client does not actually use.

## Product Principles

1. **The footage is the product.** The interface recedes. Every section is judged by whether it
   makes the work look better or gets in its way.
2. **Desktop is the full experience; mobile is designed, not degraded.** A different component on
   mobile is fine. A broken or cramped copy of desktop is not.
3. **Effects earn their weight.** WebGL, 3D and motion libraries load only where they serve the
   work, and never at the cost of first-frame speed for the footage.
4. **One step to contact.** A producer who is convinced should reach an email address instantly,
   in any language.
5. **Swappable truth.** Content and locales change without touching components. Nothing
   unconfirmed reads as fact.
