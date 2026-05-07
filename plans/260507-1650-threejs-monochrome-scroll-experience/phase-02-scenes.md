# Phase 02 — 10 Scenes (frag + vert shaders)

**Date:** 2026-05-07 · **Priority:** P0 · **Status:** pending

## Context links
- [plan.md](plan.md) · [phase-01-foundation.md](phase-01-foundation.md) · [phase-03-polish.md](phase-03-polish.md)

## Key Insights
- Each scene = self-contained Three.js Group + 1-2 ShaderMaterials. Reuse `BufferGeometry` where possible.
- Vert shader where geometry deforms (terrain, head morph, gravity-well grid). Frag shader for procedural patterns (zebra, ripples, FBM, dither).

## Scenes

| # | Title | Shader focus |
|---|-------|--------------|
| 1 | HELLO | FBM nebula (frag) + GPU points (vert size attenuation) |
| 2 | FROM AN IDEA | SDF concentric ripples on floor (frag), light rays raymarched volumetric (frag) |
| 3 | GIVE SHAPE | Zebra-stripe sphere (frag step+sin), bezier "hair" lines (LineSegments) |
| 4 | FOLLOW THE TRENDS | Floating tetrahedra (vert wobble) + glowing SDF symbol (frag) |
| 5 | LET IT MORPH | Contour-line head: vert displaces sphere by FBM-3D, frag draws horizontal contours |
| 6 | EYES ON THE HORIZON | Wave terrain — vert sin*cos displacement, frag horizontal stripes |
| 7 | KEEP TRYING | Ordered-dither face — frag bayer matrix on lit sphere |
| 8 | KEEP LEARNING | Low-poly mountains (icosahedron flat-shaded) + radial sun glow (frag) |
| 9 | WORK AS A TEAM | Solar system + curved gravity-well grid (vert displaces planar grid by 1/r) |
| 10 | THANKS | Triangle-fragment explosion (vert offsets along normals scaled by progress) |

## Shared GLSL utilities (`shaders/util.glsl.js`)
- `hash21`, `hash33`, simplex 3D noise (Ashima), `fbm2`, `fbm3`, bayer 4×4 matrix, `sdCircle`, `sdBox`.

## Implementation Steps
1. Build `shaders/util.glsl.js` (export const utils = `…`).
2. For each scene, create `src/scenes/sceneN.js`:
   - export factory returning `{ group, onProgress(p), onUpdate(t), onMouse(m) }`.
   - Ramp opacity in/out via `progress` mapped to local `[0,1]`.
3. Register scenes 1-10 in `sceneManager` with progress windows of 0.1 each.
4. Add subtle parallax: camera `lookAt(0,0,0)` with `position.x/y` lerping toward mouse.

## Todo
- [ ] util.glsl.js shared
- [ ] scene1 HELLO particles + nebula
- [ ] scene2 FROM AN IDEA cubes + ripples
- [ ] scene3 GIVE SHAPE zebra sphere
- [ ] scene4 FOLLOW THE TRENDS tetra + symbol
- [ ] scene5 LET IT MORPH contour head
- [ ] scene6 EYES ON THE HORIZON terrain
- [ ] scene7 KEEP TRYING dither face
- [ ] scene8 KEEP LEARNING mountains + sun
- [ ] scene9 WORK AS A TEAM solar system + grid
- [ ] scene10 THANKS fragments explosion

## Success Criteria
- Each scene visually matches video at corresponding scroll position.
- All scenes run together at ≥45 fps on M1.
- No visible seams between active scenes — fade overlap.

## Risk Assessment
- 3D noise on large meshes can stutter — keep mesh detail moderate (sphere segments 96, terrain 128×128 max).
- Line antialiasing on Mac WebGL is poor — use thicker LineMaterial or instanced quads if needed.
