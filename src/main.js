import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { SceneManager } from './sceneManager.js';
import { buildPostFX }   from './postfx.js';
import { initCursor, initFullscreen } from './util/cursor.js';

import sHello   from './scenes/01-hello.js';
import sMeteor  from './scenes/02-meteor-water.js';
import sIdea    from './scenes/02-from-an-idea.js';
import sShape   from './scenes/03-give-shape.js';
import sTrends  from './scenes/04-follow-the-trends.js';
import sMorph   from './scenes/05-let-it-morph.js';
import sHorizon from './scenes/06-eyes-on-the-horizon.js';
import sTrying  from './scenes/07-keep-trying.js';
import sLearn   from './scenes/08-keep-learning.js';
import sTeam    from './scenes/09-work-as-a-team.js';
import sThanks  from './scenes/10-thanks.js';
import sProfile from './scenes/11-profile.js';

gsap.registerPlugin(ScrollTrigger);

/* ---------- Device profile ---------- */
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const IS_NARROW = window.innerWidth < 820;
const IS_MOBILE = IS_TOUCH && IS_NARROW;
// PR cap: desktop high-DPI = 2 (sharp), mobile = 1.4 (saves ~50% fragment work)
const PR_CAP = IS_MOBILE ? 1.4 : 2;
document.body.classList.toggle('is-mobile', IS_MOBILE);

/* ---------- Renderer ---------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !IS_MOBILE,           // disable MSAA on mobile (heavy)
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, PR_CAP));
renderer.setClearColor(0x000000, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog        = new THREE.FogExp2(0x000000, 0.05);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(0, 0, 6);
camera.lookAt(0, 0, 0);

/* ---------- Lighting ---------- */
const hemi = new THREE.HemisphereLight(0xffffff, 0x111111, 0.8);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 1.4);
dir.position.set(2.5, 4, 3);
scene.add(dir);

/* ---------- Post-FX ---------- */
const composer = buildPostFX(renderer, scene, camera);

/* ---------- Scene manager ---------- */
const ctx = { renderer, scene, camera };
const sceneMgr = new SceneManager(ctx);

const factories = [
  sHello,   // 01
  sMeteor,  // 02 (NEW: meteor + water ripples, no text)
  sIdea,    // 03 (was 02)
  sShape,   // 04
  sTrends,  // 05
  sMorph,   // 06
  sHorizon, // 07
  sTrying,  // 08
  sLearn,   // 09
  sTeam,    // 10
  sThanks,  // 11
  sProfile, // 12
];
factories.forEach((factory, i) => {
  const start = i / factories.length;
  const end   = (i + 1) / factories.length;
  sceneMgr.register(`scene-${i+1}`, factory, [start, end]);
});

/* ---------- Resize ---------- */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  sceneMgr.onResize(w, h);
}
window.addEventListener('resize', onResize);
onResize();

/* ---------- Mouse ---------- */
const mouse = new THREE.Vector2(0, 0);
const targetMouse = new THREE.Vector2(0, 0);
window.addEventListener('mousemove', (e) => {
  targetMouse.x = (e.clientX / window.innerWidth)  * 2 - 1;
  targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

/* ---------- Lenis smooth scroll (desktop only — mobile uses native momentum) ---------- */
let lenis = null;
if (!IS_TOUCH) {
  lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    syncTouch: false,           // never hijack touch — native momentum is smoother
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
} else {
  // On touch devices, ScrollTrigger reads native scroll directly.
  ScrollTrigger.normalizeScroll(true);
}

/* ---------- Scroll progress ---------- */
let scrollProgress = 0;
ScrollTrigger.create({
  trigger: 'body',
  start: 'top top',
  end:   'bottom bottom',
  onUpdate: (self) => {
    scrollProgress = self.progress;
    const pct = (scrollProgress * 100).toFixed(1);
    const bar = document.getElementById('progressBar');
    if (bar) bar.style.width = pct + '%';
    const total = factories.length;
    const idx = Math.min(total, Math.floor(scrollProgress * total) + 1);
    const cnt = document.getElementById('counterCurrent');
    if (cnt) cnt.textContent = String(idx).padStart(2, '0');
  },
});

/* ---------- Cursor + Fullscreen ---------- */
initCursor();
initFullscreen();

/* ---------- Render loop ---------- */
const clock = new THREE.Clock();
function tick() {
  const t  = clock.getElapsedTime();
  const dt = clock.getDelta();

  // smooth mouse parallax
  mouse.x += (targetMouse.x - mouse.x) * 0.05;
  mouse.y += (targetMouse.y - mouse.y) * 0.05;

  // gentle camera tilt by mouse
  camera.position.x = mouse.x * 0.3;
  camera.position.y = 0.3 + mouse.y * 0.2;
  camera.lookAt(0, 0, 0);

  sceneMgr.update(scrollProgress, t, dt, mouse);

  composer.render();
  requestAnimationFrame(tick);
}

document.documentElement.classList.remove('is-loading');
requestAnimationFrame(tick);
