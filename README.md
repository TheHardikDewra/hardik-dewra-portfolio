# Hardik Dewra - portfolio

Two iterations of my personal portfolio, built from one repo.

| Iteration | Live | Folder |
|---|---|---|
| 1 | https://hardikdewra.vercel.app | `v1/` |
| 2 | https://hardik-dewra.vercel.app | `v2/` |

I design high-converting landing pages in Figma and build them in Framer. I run
[WeDesignLandingPages.com](https://wedesignlandingpages.com).

## How it's built

Plain HTML, CSS and JavaScript. No framework, no build step - each folder is a
static site Vercel serves as-is.

- Scroll motion: [GSAP](https://gsap.com) + ScrollTrigger, smooth scroll by [Lenis](https://lenis.darkroom.engineering)
- Icons: [Phosphor](https://phosphoricons.com), inlined as SVG
- Fonts, all self-hosted and free for commercial use:
  - Geist + Geist Mono (SIL Open Font License, Vercel)
  - Instrument Serif (SIL Open Font License)
  - Clash Display (ITF Free Font License, Fontshare)

## Layout

```
shared/          source of truth for fonts + vendor libraries
scripts/         sync-shared.sh copies shared/ into both sites
v1/              iteration 1  -> Vercel project "hardikdewra"
v2/              iteration 2  -> Vercel project "hardik-dewra"
```

Each Vercel project is git-linked with its Root Directory set to its folder, so a
push to `main` redeploys whichever site changed.

## Run locally

```bash
./scripts/sync-shared.sh
npx serve v1   # or v2
```
