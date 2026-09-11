# Hardik Dewra - portfolio

Two iterations of my personal portfolio, built from one repo and deployed as two
Vercel projects.

| Iteration | Live | Folder | Idea |
|---|---|---|---|
| 1, "Night Shift" | https://hardikdewra.vercel.app | `v1/` | Dark navy index. The work reads like a studio ledger: four opened-up case panels, a twelve-row index with a screenshot that follows the cursor, a 45-template mosaic, live New Delhi clock in the nav. Smooth scroll. |
| 2, "Annotated" | https://hardik-dewra.vercel.app | `v2/` | Light editorial. Serif headlines, a gold highlighter that draws under key phrases, and real pages with numbered pins explaining why each design decision is there. Horizontal gallery, template marquee, a seven-point landing page checklist. Native scroll. |

I design landing pages in Figma and build them in Framer. I run
[We Design Landing Pages](https://wedesignlandingpages.com).

## One brand, two layouts

Both iterations share one palette and one type system, and differ only in layout,
motion and light/dark. That's deliberate: variations of one brand should explore
layout within the same DNA, not swap fonts per version.

| Token | Hex | Role |
|---|---|---|
| Navy | `#020526` | ground in v1, ink in v2 |
| Paper | `#F2EEE2` | ink in v1, ground in v2 |
| Gold | `#FFD700` | the single accent. On paper it is only ever a fill under navy text (1.2:1 as text) |

Type: Geist (UI and body), Geist Mono (labels), Instrument Serif (accents in v1,
headlines in v2). Flat colour only: no gradients, no glows, no blur shadows. The
button "plate" is a real offset element, not a shadow. Radius is 8px everywhere.

## What's on the page, and what isn't

Everything claimed on both pages can be checked from a link on the page.

- Numbers used: 45 Framer templates built, 11 languages on my agency site,
  8 months of CRO for a DTC supplement brand, LinkedIn follower count.
- Structure studies (Tessera, Osprey, Orbit, Harbor, Operator, Dr. Maya Iyer) are
  labelled as such, with the site whose layout they follow named on the page.
- The 45 templates are labelled as rebuilt from a third-party Figma kit.
- No testimonials yet. I'll add real ones (full name, company, city, outcome) as
  clients send them.

## How it's built

Plain HTML, CSS and JavaScript. No framework and no build step on Vercel: each
folder is a static site.

- Scroll motion: [GSAP](https://gsap.com) + ScrollTrigger + SplitText (free under
  GSAP's standard licence). v1 adds [Lenis](https://lenis.darkroom.engineering) smooth scroll.
- Icons: [Phosphor](https://phosphoricons.com), injected as an inline SVG sprite.
- Tool logos: brand SVGs from [svgl](https://svgl.app).
- Fonts, all self-hosted and free for commercial use:
  - Geist + Geist Mono (SIL Open Font License, Vercel)
  - Instrument Serif (SIL Open Font License)
  - Clash Display (ITF Free Font License, Fontshare), kept in `shared/` for later use
- Every page respects `prefers-reduced-motion`, renders fully without JavaScript,
  and has `?static=1` to switch motion off for full-page captures.

## Layout

```
shared/          source of truth: fonts, vendor libs, tokens.css, base.css, motion.js,
                 icons, logos, portrait, work screenshots (WebP)
scripts/
  sync-shared.sh      copy shared/ into both sites (run after changing shared/)
  inject-icons.mjs    build the Phosphor sprite each page actually uses
  capture-work.mjs    clean screenshots of live work (hides Framer's badge + edit bar)
  optimize-images.py  PNG captures -> responsive WebP
  render-og.mjs       render each site's og.html to og.png with the real fonts
  render-icons.mjs    favicon PNG sizes from favicon.svg
  verify.mjs          overflow, console errors, failed requests, dead links, screenshots
  interact.mjs        hover preview, menus, FAQ, pins, gallery, reduced-motion checks
v1/              iteration 1 -> Vercel project "hardikdewra"
v2/              iteration 2 -> Vercel project "hardik-dewra"
```

Each Vercel project is git-linked with its Root Directory set to its folder, and an
ignored-build command that skips the deploy when its folder didn't change.

## Run and check locally

```bash
npm install                      # puppeteer-core, for the check scripts only
./scripts/sync-shared.sh
node scripts/inject-icons.mjs v1/index.html v2/index.html
python3 -m http.server 4173 -d v1 &
python3 -m http.server 4174 -d v2 &
node scripts/verify.mjs http://127.0.0.1:4173 out-v1 --widths=1440,810,390 --stops=14
node scripts/interact.mjs http://127.0.0.1:4173/ http://127.0.0.1:4174/ out-interact
```
