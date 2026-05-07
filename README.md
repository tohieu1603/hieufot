# Hieu — Three.js Monochrome Scroll Reel

A scroll-driven monochromatic 3D portfolio built with **vanilla Three.js + hand-written GLSL shaders**. 11 scenes, no build step, no framework.

Live profile of **To Trong Hieu** — Backend × DevOps Engineer (Vietnam).

---

## ⚙️ Tech stack — "what do I need to run this?"

| Layer | What's used | Why it matters when you clone |
|-------|-------------|-------------------------------|
| Markup | Plain `index.html` | nothing to compile |
| Style  | Plain `styles.css` | nothing to compile |
| Scripts | ES modules (`<script type="module">`) | **must be served over `http://`** — opening `file://index.html` in the browser will fail because ES modules don't load from the file system |
| 3D engine | Three.js r161 via [esm.sh](https://esm.sh) | loaded straight from CDN at runtime — no `npm install` needed |
| Smooth scroll | `lenis` + `gsap` + `gsap/ScrollTrigger` | also pulled from esm.sh at runtime |
| Browser | Anything modern with WebGL 2 | Chrome / Edge / Firefox / Safari (≥ 2022) |

**There is no `package.json`, no `node_modules`, no Webpack, no Vite, no Next.js — anyone can clone the repo and serve the folder with any static HTTP server.**

---

## 🚀 Run locally — pick one

### Option A — Python (already on every Mac / Linux)
```bash
git clone https://github.com/tohieu1603/hieufot.git
cd hieufot
python3 -m http.server 8765
# open http://localhost:8765
```

### Option B — Node (if you have it installed)
```bash
git clone https://github.com/tohieu1603/hieufot.git
cd hieufot
npx serve .          # or:  npx http-server -p 8765
```

### Option C — VS Code "Live Server" extension
1. `git clone https://github.com/tohieu1603/hieufot.git`
2. Open the folder in VS Code
3. Right-click `index.html` → **"Open with Live Server"**

### Option D — Any other static host
GitHub Pages, Netlify drop, Vercel "Deploy with one click", Cloudflare Pages — drop the folder and it just works. No build command.

---

## 🌐 Deploy to GitHub Pages (zero-config)
1. In your repo settings → **Pages** → Source = **Deploy from branch** → branch `main`, folder `/ (root)` → Save
2. Wait ~1 min, then visit `https://<you>.github.io/hieufot/`

That's it — the same `index.html` you ran locally is the production site.

---

## 🎬 What's in here

11 full-screen scenes, each with at least one custom GLSL shader:

| # | Title | Frag technique | Vert technique |
|---|-------|----------------|----------------|
| 01 | HELLO | FBM smoke nebula (ring-falloff) | Particle drift |
| 02 | FROM AN IDEA | SDF concentric ripples + procedural grid | – |
| 03 | GIVE SHAPE | Domain-warped zebra + rim light | – |
| 04 | FOLLOW THE TRENDS | Toon quantize + glowing 王 SDF + dust | – |
| 05 | LET IT MORPH | Topo contour lines (fwidth-based) | 3-D simplex displacement |
| 06 | EYES ON THE HORIZON | World-space stripes + horizon mist | sin·cos + FBM heightfield |
| 07 | KEEP TRYING | Bayer 4×4 ordered dither | – |
| 08 | KEEP LEARNING | Radial sun glow + low-poly mountain ridge | – |
| 09 | WORK AS A TEAM | Animated grid lines | 1/r gravity-well displacement |
| 10 | THANKS | Toon shading + radial fade | Per-triangle Rodrigues rotation + outward expansion |
| 11 | PROFILE / LET'S CONNECT | Wireframe geodesic + electron orbits + continuous fragment burst + glow orb | Per-tri exhaling expansion (cyclic) |

## 📁 Project layout
```
index.html
styles.css
src/
  main.js              — boot: renderer · camera · post-fx · scroll
  sceneManager.js      — registers scenes, drives per-scene local progress
  postfx.js            — bloom + grain + chromatic aberration + vignette
  shaders/util.glsl.js — Ashima simplex 3-D, FBM, Bayer, SDF helpers
  scenes/01-hello.js … 11-profile.js
  util/cursor.js       — custom cursor + Fullscreen toggle (F)
plans/                 — design plan
docs/                  — design guidelines
```

## ⌨️ Controls
- **Scroll** — drives the entire reel, snap-aware via Lenis
- **Mouse move** — subtle camera parallax
- **F** — toggle fullscreen
- **Hover** sockets `[data-hover]` enlarge the cursor

## 🛠 Editing
- Edit any `src/scenes/*.js`, save, refresh — no rebuild needed.
- Add a brand-new scene: drop a file in `src/scenes/`, then register it in `src/main.js` `factories[]` array. The counter and progress bands auto-recalculate.

## 📡 Find me
- GitHub: <https://github.com/tohieu1603>
- Facebook: <https://www.facebook.com/share/1CdWqYDuKz/?mibextid=wwXIfr>
- TikTok: [@tthieu160304](https://www.tiktok.com/@tthieu160304)
- Instagram: [@tthieu160304](https://www.instagram.com/tthieu160304/)
- Email: <hieu.totrong@proton.me>

---
Hand-coded with three.js + GLSL. © 2026 To Trong Hieu.
