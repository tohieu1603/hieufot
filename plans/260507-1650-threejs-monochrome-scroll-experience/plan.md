# Plan — Three.js Monochrome Scroll Experience

Recreate Video 1 (monochromatic scroll-driven 3D narrative) using Three.js + custom GLSL fragment & vertex shaders, with a tribute liquid-distortion segment from Video 2.

## Source

- Video 1: `/Users/admin/HieuTo/profile/Ghi Màn hình 2026-05-06 lúc 22.55.01.mov` (53s, monochrome multi-scene)
- Video 2: `/Users/admin/HieuTo/profile/Ghi Màn hình 2026-05-07 lúc 16.14.04.mov` (44s, liquid distortion portfolio)
- Analysis: `.tmp/analysis/video1.md`, `.tmp/analysis/video2.md`

## Stack

- Vanilla HTML/CSS/JS, Three.js via CDN (ESM imports), GSAP + ScrollTrigger
- Pure GLSL shaders inline (frag + vert), no build step
- Single `index.html` entry, modular `src/` ESM files

## Phases

| # | Phase | Status |
|---|-------|--------|
| 01 | Foundation, scaffold, scroll orchestrator | pending → see [phase-01](phase-01-foundation.md) |
| 02 | Scene shaders (frag + vert) for 10 scenes | pending → see [phase-02-scenes.md](phase-02-scenes.md) |
| 03 | Transitions, post-FX, polish, browser test | pending → see [phase-03-polish.md](phase-03-polish.md) |

## Success Criteria

- Loads in modern browser without errors.
- 10 scrollable scenes matching Video 1 narrative beats.
- Each scene uses at least one custom GLSL shader (vert + frag where appropriate).
- Smooth scroll with snap on each scene; subtle parallax tilt on mouse move.
- Monochromatic palette only (#000 / #FFF + grays).
- Soft film grain + bloom post-fx.
- Total bundle stays static — runnable by opening `index.html` (or via simple file server for ESM).

## Open Questions

- Fonts: best monochrome wide-tracked sans — defaulting to **Space Grotesk + Bebas Neue** (Google Fonts).
- Live server: assume user can use VS Code Live Server / `python3 -m http.server` for ESM.
