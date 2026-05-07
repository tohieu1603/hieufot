import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 02 — METEOR FALLS, WATER RIPPLES
 * Inspired by video 1 (00:02–00:06):
 *   • multiple bright WHITE SQUARES fall straight down from the top of the frame
 *   • each square leaves a thin solid VERTICAL line trail (head bright → top dim)
 *   • one HERO square impacts a low-poly water plane at the bottom
 *   • impact triggers a circular ripple that expands across the water
 * No HTML text overlays — purely the visual effect, scroll-driven.
 */

export default function scene02_meteorWater() {
  const group = new THREE.Group();

  /* =========================================================
   * Water — vertex displaced plane with ambient + impact ripple
   * ========================================================= */
  const waterGeo = new THREE.PlaneGeometry(40, 40, 220, 220);
  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
    uniforms: {
      uTime:           { value: 0 },
      uOpacity:        { value: 1 },
      uImpactTime:     { value: -10.0 },
      uImpactPos:      { value: new THREE.Vector2(0, 0) },
      uImpactStrength: { value: 0 },
    },
    vertexShader: /* glsl */ `
      ${utils}
      uniform float uTime;
      uniform float uImpactTime;
      uniform vec2  uImpactPos;
      uniform float uImpactStrength;
      varying vec3  vWorld;
      varying float vRipple;
      void main() {
        vec3 p = position;
        float amb = sin(p.x * 0.8 + uTime * 0.7) * 0.06
                  + cos(p.y * 0.6 + uTime * 0.5) * 0.06
                  + fbm3(vec3(p.xy * 0.3, uTime * 0.1)) * 0.04;
        float dist = distance(p.xy, uImpactPos);
        float ageT = max(uTime - uImpactTime, 0.0);
        float wave = sin(dist * 4.0 - ageT * 7.0);
        float ringMask = smoothstep(0.0, 0.4, ageT * 3.0 - dist) *
                        (1.0 - smoothstep(ageT * 3.0, ageT * 3.0 + 1.4, dist));
        float damping  = exp(-dist * 0.18 - ageT * 0.22);
        float rippleH  = wave * ringMask * damping * uImpactStrength;
        p.z += amb + rippleH * 1.6;
        vWorld = p;
        vRipple = rippleH;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uTime;
      varying vec3  vWorld;
      varying float vRipple;
      void main() {
        vec2 g = abs(fract(vWorld.xy * 0.55) - 0.5);
        float grid = smoothstep(0.04, 0.0, min(g.x, g.y));
        float ripple = smoothstep(0.05, 0.5, abs(vRipple));
        float fade = smoothstep(18.0, 1.0, length(vWorld.xy));
        float v = grid * 0.45 + ripple * 0.85;
        v *= fade;
        gl_FragColor = vec4(vec3(v), fade * uOpacity);
      }
    `,
    extensions: { derivatives: true },
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1.8;
  group.add(water);

  /* =========================================================
   * Meteors — multiple SQUARES + thin vertical line trails
   * ========================================================= */
  const TOP_Y    =  3.6;     // y where squares spawn / where the trail starts
  const WATER_Y  = -1.78;    // surface
  const HERO_X   =  0.0;     // hero meteor x position (centred → impact at origin)

  const meteorGroup = new THREE.Group();
  group.add(meteorGroup);

  // Helper to build a single (square + trail) pair
  function buildMeteor({ x, size, isHero }) {
    const subg = new THREE.Group();

    // Trail = a thin vertical plane spanning from TOP_Y down to current y.
    // Built with pivot at the BOTTOM (= meteor head), height = (TOP_Y - y).
    // Easier: use a 1-unit tall plane and scale.y to (TOP_Y - y) each frame.
    const trailGeo = new THREE.PlaneGeometry(size * 0.18, 1, 1, 1);
    trailGeo.translate(0, 0.5, 0);  // pivot at bottom edge
    const trailMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 1 }, uVisible: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform float uVisible;
        varying vec2 vUv;
        void main() {
          // bright at the head (vUv.y=0), faded toward top of trail (vUv.y=1)
          float head = pow(1.0 - vUv.y, 2.0);
          float horiz = smoothstep(0.5, 0.0, abs(vUv.x - 0.5) * 2.0);
          float a = head * horiz * uVisible;
          gl_FragColor = vec4(vec3(1.0), a * uOpacity);
        }
      `,
    });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    subg.add(trail);

    // Square head — small white plane (additive)
    const sqGeo = new THREE.PlaneGeometry(size, size, 1, 1);
    const sqMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 1 }, uVisible: { value: 1 } },
      vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity; uniform float uVisible;
        void main() {
          gl_FragColor = vec4(vec3(1.0), uVisible * uOpacity);
        }
      `,
    });
    const square = new THREE.Mesh(sqGeo, sqMat);
    subg.add(square);

    // For hero, add a soft glow halo behind it
    let halo = null;
    if (isHero) {
      const haloMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uOpacity: { value: 1 }, uVisible: { value: 1 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uOpacity; uniform float uVisible;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv - 0.5;
            float r = length(p);
            float halo = exp(-r * 5.5);
            gl_FragColor = vec4(vec3(1.0), halo * uVisible * uOpacity * 0.4);
          }
        `,
      });
      halo = new THREE.Mesh(new THREE.PlaneGeometry(size * 6, size * 6), haloMat);
      subg.add(halo);
    }

    subg.position.x = x;
    return { group: subg, trail, trailMat, square, sqMat, halo, x, size, isHero };
  }

  // Hero meteor (centred, larger)
  const hero = buildMeteor({ x: HERO_X, size: 0.28, isHero: true });
  meteorGroup.add(hero.group);

  // Background atmosphere — a few smaller squares falling at different x positions/speeds
  const ambient = [];
  const ambientCount = 7;
  const xSeeds = [-3.6, -2.4, -1.4, 1.2, 2.0, 3.0, 3.8];
  for (let i = 0; i < ambientCount; i++) {
    const m = buildMeteor({
      x: xSeeds[i] + (Math.random() - 0.5) * 0.4,
      size: 0.06 + Math.random() * 0.10,
      isHero: false,
    });
    m.speed       = 0.35 + Math.random() * 0.55;
    m.phase       = Math.random();
    m.zOffset     = -1 - Math.random() * 3;
    m.group.position.z = m.zOffset;
    meteorGroup.add(m.group);
    ambient.push(m);
  }

  /* ---------- timing constants ---------- */
  const FALL_END    = 0.80;   // local progress at which hero hits the water
  const RIPPLE_FADE = 0.30;   // local-progress window over which ripple peaks then decays
  let lastImpactTime = -10;

  function updateMeteorVisual(meteor, y) {
    // Position the head
    meteor.square.position.y = y;
    // Trail spans from TOP_Y down to y. With pivot at trail bottom, place at (x, y, 0)
    // and scale.y = (TOP_Y - y).
    const trailLen = Math.max(0.05, TOP_Y - y);
    meteor.trail.position.y = y;
    meteor.trail.scale.y = trailLen;
    if (meteor.halo) {
      meteor.halo.position.y = y;
    }
  }

  return {
    group,
    setOpacity(a) {
      waterMat.uniforms.uOpacity.value = a;
      hero.trailMat.uniforms.uOpacity.value = a;
      hero.sqMat.uniforms.uOpacity.value = a;
      if (hero.halo) hero.halo.material.uniforms.uOpacity.value = a;
      ambient.forEach(m => {
        m.trailMat.uniforms.uOpacity.value = a;
        m.sqMat.uniforms.uOpacity.value    = a;
      });
    },
    update(t, dt, local /* 0..1 within this scene */) {
      waterMat.uniforms.uTime.value = t;

      /* ---- Hero meteor: scroll-driven straight vertical fall ---- */
      const fallT = Math.min(local / FALL_END, 1.0);
      const fallE = fallT * fallT;          // ease-in (faster near impact)
      const heroY = TOP_Y + (WATER_Y - TOP_Y) * fallE;
      updateMeteorVisual(hero, heroY);
      // Hide the head right at impact moment so the splash reads cleanly
      const heroVisible = local < FALL_END ? 1.0
        : 1.0 - Math.min((local - FALL_END) / 0.04, 1.0);
      hero.sqMat.uniforms.uVisible.value    = heroVisible;
      hero.trailMat.uniforms.uVisible.value = heroVisible;
      if (hero.halo) hero.halo.material.uniforms.uVisible.value = heroVisible;

      /* ---- Ambient background squares: continuous looping falls ---- */
      ambient.forEach(m => {
        const cycle = (t * m.speed + m.phase) % 1.0;     // 0..1 forever
        const y = TOP_Y + (WATER_Y - TOP_Y) * cycle;
        updateMeteorVisual(m, y);
        // brief flash at start, brief fade at end
        const vis = Math.min(1.0, cycle * 12.0) * (1.0 - Math.max(0.0, (cycle - 0.92) * 12.0));
        m.sqMat.uniforms.uVisible.value    = vis;
        m.trailMat.uniforms.uVisible.value = vis;
      });

      /* ---- Impact: trigger water ripple when hero hits the surface ---- */
      if (local >= FALL_END && lastImpactTime < t - 0.5) {
        waterMat.uniforms.uImpactTime.value = t;
        waterMat.uniforms.uImpactPos.value.set(HERO_X, 0);
        lastImpactTime = t;
      }
      if (local < FALL_END * 0.5) lastImpactTime = -10;   // arm again on scroll-back

      let impactStrength = 0;
      if (local >= FALL_END) {
        const phase = (local - FALL_END) / RIPPLE_FADE;   // 0..1
        impactStrength = phase < 0.12
          ? phase / 0.12
          : Math.exp(-(phase - 0.12) * 3.0);
      }
      waterMat.uniforms.uImpactStrength.value = impactStrength;
    },
  };
}
