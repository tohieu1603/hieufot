# Phase 01 — Foundation & Scroll Orchestrator

**Date:** 2026-05-07 · **Priority:** P0 · **Status:** pending

## Context links
- [plan.md](plan.md)
- [phase-02-scenes.md](phase-02-scenes.md)

## Key Insights
- One full-screen `<canvas>` shared by all scenes; we swap the active scene's `Group` rather than nuking the renderer.
- Scroll position drives a single `progress` float (0-1). Each scene owns a `[start, end]` window of progress and listens for it.
- Camera + post-FX persist; scenes mount/unmount their own meshes/lights.

## Requirements
- Three.js (`r161+` from `esm.sh`).
- GSAP `ScrollTrigger` for scroll snap and progress mapping.
- Lenis smooth scroll for buttery feel (`@studio-freight/lenis`).
- Fullscreen renderer with `pixelRatio = min(devicePixelRatio, 2)`.
- Resize handler.

## Architecture
```
index.html        — canvas + HTML overlays (titles, menu, scroll hint)
src/main.js       — boot: renderer, camera, post composer, scene manager
src/sceneManager.js — registers scenes, drives progress, mount/unmount
src/scenes/*.js   — one file per scene; exports { mount(ctx), update(t,p), unmount() }
src/shaders/*.glsl.js — exported template literals for GLSL strings
src/postfx.js     — EffectComposer with FilmPass + UnrealBloomPass
src/util/noise.glsl.js — shared noise functions
styles.css        — overlays, typography, cursor
```

## Implementation Steps
1. Write `index.html` with `<canvas id="gl">`, header (menu), section markers (10 sections × 100vh), scroll hint, font links.
2. Write `styles.css` (black bg, white type, Space Grotesk + Bebas Neue, all-caps tracked headings).
3. Write `main.js`: renderer + camera + clock + composer + scene manager + render loop + resize.
4. Write `sceneManager.js` with `register(name, sceneFactory, [startP, endP])`, `update(progress, time)` calls each active scene's `onProgress` and `onUpdate`.
5. Wire Lenis + ScrollTrigger so global progress = scroll / max.

## Todo
- [ ] index.html scaffold + section markers
- [ ] styles.css typography & overlays
- [ ] main.js boot
- [ ] sceneManager.js
- [ ] postfx.js
- [ ] noise.glsl.js shared

## Success Criteria
- Empty black canvas renders at 60 fps.
- Scroll updates a debug HUD showing `progress = 0.0…1.0`.

## Risk Assessment
- Mixing Lenis with ScrollTrigger needs `Lenis.on('scroll', ScrollTrigger.update)`.
- `esm.sh` may rate-limit; use `?bundle` query for stability.
