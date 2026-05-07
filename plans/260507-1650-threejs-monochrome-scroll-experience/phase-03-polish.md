# Phase 03 — Transitions, Post-FX, Polish

**Date:** 2026-05-07 · **Priority:** P1 · **Status:** pending

## Context links
- [plan.md](plan.md) · [phase-02-scenes.md](phase-02-scenes.md)

## Requirements
- Scene cross-fade via per-scene `uOpacity` uniform (rather than dispose/re-add).
- Glitch transitions: 200ms RGB-shift + UV-block scramble triggered when crossing scene boundary.
- Soft Bloom for highlights (light rays, sun, glow symbol).
- Subtle film grain via fullscreen frag pass.
- Custom HTML cursor (small white circle, scales on interactives).

## Implementation Steps
1. Add `uOpacity` to every scene material; sceneManager fades 0↔1 over 0.5s on enter/leave.
2. Build `postfx.js` using `EffectComposer`, `RenderPass`, `UnrealBloomPass(0.4, 0.8, 0.85)`, `ShaderPass(grainShader)`, `ShaderPass(glitchShader)`.
3. Glitch trigger: `uIntensity` GSAP-animated 0→1→0 over 0.4s on `ScrollTrigger` boundary.
4. Cursor: HTML `<div id="cursor">` follows mousemove with lerp; expand on `[data-hover]` elements.
5. HTML overlay text per scene fades + slides in/out via GSAP timelines synced to scroll progress windows.

## Todo
- [ ] uOpacity fade in every scene material
- [ ] Bloom + grain composer
- [ ] Glitch shader + trigger
- [ ] Cursor + scroll hint animation
- [ ] Per-scene title overlays

## Success Criteria
- No flicker at scene transitions.
- Glow on white objects visible but not overblown.
- 60 fps on a modern laptop.
