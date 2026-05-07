# Design guidelines — HELLO Reel

## Visual language

- **Palette:** strict monochrome — `#000` background, `#FFF` foreground, with mid-greys generated only via shader luminance, dither, or fade.
- **Mood:** experimental editorial / agency reel; high-contrast, slightly imperfect (grain, CA, glitch).
- **Composition:** every scene centres on a single hero element (sphere, mask, terrain, fragments). Empty negative space is intentional.

## Typography

| Use | Family | Weight | Tracking | Notes |
|-----|--------|--------|----------|-------|
| Display titles | **Bebas Neue** | 400 | 0.04em | clamp(56px, 12vw, 196px), `mix-blend-mode: difference` |
| Eyebrows / HUD | **Space Grotesk** | 400-500 | 0.35-0.55em | upper-case, 11-12 px |
| Italic captions | **Cormorant Garamond** | 300 italic | 0.04em | reserved for sub-lines under display |

All loaded via Google Fonts.

## Layout & spacing

- HUD is fixed top + bottom, padding `22px 28px`.
- Section heights are `100vh` each, snap not enforced (Lenis smooth scroll).
- Display titles vertically + horizontally centred inside `.step__inner`.
- Subtle vignette + film grain unify the canvas with the page.

## Motion

- Scroll progress drives a single global `0..1` value; each scene gets a `[s,e]` slice with a 0.06 (≈ 6 %) overlap on each side for cross-fade.
- Idle motion uses `sin(uTime * f + seed)` for floating, `t * speed` for orbits.
- Camera position lerps toward the cursor with damping 0.05.
- Scene materials all expose `uOpacity` so the manager can fade them, no dispose / re-add churn.

## Shader principles

- **Always pass world-space and view position** when the technique relies on lighting or screen-space effects.
- **Reuse the noise toolkit** in `shaders/util.glsl.js` (Ashima simplex 3-D + FBM, Bayer 4×4, SDFs).
- **Keep highlights in the 0..1 range**; the bloom pass thresholds at 0.62 and we do not want HDR blow-out.
- **Vertex displacement** (scenes 5 / 6 / 9 / 10) must keep meshes inside the 0.1-near / 200-far frustum.

## Post-FX

| Pass | Setting |
|------|---------|
| Bloom | strength 0.28 · radius 0.55 · threshold 0.62 |
| Grain + CA | grain 0.06 · vignette 0.7 · chroma 0.0012 |
| Output | sRGB (default Three.js OutputPass) |

## Accessibility & responsiveness

- Cursor is restored to default on touch / coarse-pointer devices.
- Text scales with `clamp()` between phone and ultra-wide.
- All overlays use `mix-blend-mode: difference` so they remain readable over any shader output.
