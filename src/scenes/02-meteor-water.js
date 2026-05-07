import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 02 — METEOR FALLS, WATER RIPPLES
 * Faithful recreation of video1 seconds 02–09:
 *   • Multiple bright WHITE SQUARES fall straight down with thin vertical beams
 *     extending up from each cube to the top of the frame.
 *   • One HERO cube descends to a virtual liquid plane at the bottom third.
 *   • At impact, the hero cube STAYS at the impact point and continues to glow.
 *   • From the impact origin, 3–4 concentric ripple rings expand outward across
 *     the water plane, staggered with delays and fading exponentially.
 *   • A secondary smaller pulse rises after the first set of rings fades.
 *   • Background "dust" pixels drift slowly UPWARD for a parallax sense of
 *     "falling deeper into space".
 *   • Subtle zoom-out (camera FOV felt as group scale) during the descent.
 * No HTML text overlays.
 */

export default function scene02_meteorWater() {
  const group = new THREE.Group();

  /* =========================================================
   * Water — single shader with up to 4 concentric rings + secondary pulse
   * ========================================================= */
  const waterGeo = new THREE.PlaneGeometry(40, 40, 240, 240);
  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
    uniforms: {
      uTime:           { value: 0 },
      uOpacity:        { value: 1 },
      uImpactTime:     { value: -10.0 },     // wall-clock t at primary impact
      uImpactPos:      { value: new THREE.Vector2(0, 0) },
      uImpactStrength: { value: 0 },         // 0..1 master ring intensity
      uPulseTime:      { value: -10.0 },     // secondary smaller pulse
      uPulseStrength:  { value: 0 },
    },
    vertexShader: /* glsl */ `
      ${utils}
      uniform float uTime;
      uniform float uImpactTime;
      uniform vec2  uImpactPos;
      uniform float uImpactStrength;
      uniform float uPulseTime;
      uniform float uPulseStrength;
      varying vec3  vWorld;
      varying float vRipple;

      // staggered concentric ring sum
      float concentricRings(vec2 pXY, float ageT, float strength) {
        float total = 0.0;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float t  = ageT - fi * 0.18;
          if (t <= 0.0) continue;
          float dist = distance(pXY, uImpactPos);
          float front = t * 3.6;                 // wave front speed
          // narrow expanding ring window
          float ringMask = smoothstep(front - 0.6, front, dist)
                         * (1.0 - smoothstep(front, front + 1.0, dist));
          float wave = sin(dist * 6.0 - t * 8.0);
          float damping = exp(-dist * 0.20 - t * 0.45);
          total += wave * ringMask * damping * (1.0 - fi * 0.18);
        }
        return total * strength;
      }

      void main() {
        vec3 p = position;
        // ambient gentle waves
        float amb = sin(p.x * 0.8 + uTime * 0.7) * 0.06
                  + cos(p.y * 0.6 + uTime * 0.5) * 0.06
                  + fbm3(vec3(p.xy * 0.3, uTime * 0.1)) * 0.04;

        float ageT  = max(uTime - uImpactTime, 0.0);
        float ageT2 = max(uTime - uPulseTime,  0.0);

        float r1 = concentricRings(p.xy, ageT,  uImpactStrength);
        float r2 = concentricRings(p.xy, ageT2, uPulseStrength * 0.5);

        float rippleH = (r1 + r2);
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
        // wave crest brightness (additive feel)
        float ripple = smoothstep(0.05, 0.5, abs(vRipple));
        float fade = smoothstep(18.0, 1.0, length(vWorld.xy));
        float v = grid * 0.45 + ripple * 0.95;
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
   * Meteors — square heads + thin vertical beams to top of frame
   * ========================================================= */
  const TOP_Y    =  6.0;     // beam origin (well off-screen for "infinite" feel)
  const SPAWN_Y  =  4.0;     // y where ambient cubes spawn
  const WATER_Y  = -1.78;    // surface
  const HERO_X   =  0.0;     // hero meteor x position (centered)

  const meteorGroup = new THREE.Group();
  group.add(meteorGroup);

  function buildMeteor({ x, size, isHero }) {
    const subg = new THREE.Group();

    // Beam — thin vertical plane spanning from TOP_Y down to current y.
    // Built with pivot at the BOTTOM (= meteor head); height scaled per-frame.
    const beamGeo = new THREE.PlaneGeometry(size * 0.18, 1, 1, 1);
    beamGeo.translate(0, 0.5, 0);
    const beamMat = new THREE.ShaderMaterial({
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
          // bright at the head (vUv.y=0), fades long-ways toward the top of the trail
          float head = pow(1.0 - vUv.y, 1.6);
          float horiz = smoothstep(0.5, 0.0, abs(vUv.x - 0.5) * 2.0);
          float a = head * horiz * uVisible;
          gl_FragColor = vec4(vec3(1.0), a * uOpacity);
        }
      `,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    subg.add(beam);

    // Square head
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

    // Hero halo
    let halo = null;
    if (isHero) {
      const haloMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uVisible: { value: 1 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform float uOpacity; uniform float uVisible;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv - 0.5;
            float r = length(p);
            float halo = exp(-r * 5.5);
            float pulse = 0.85 + 0.15 * sin(uTime * 8.0);
            gl_FragColor = vec4(vec3(1.0), halo * uVisible * uOpacity * 0.55 * pulse);
          }
        `,
      });
      halo = new THREE.Mesh(new THREE.PlaneGeometry(size * 8, size * 8), haloMat);
      subg.add(halo);
    }

    subg.position.x = x;
    return { group: subg, beam, beamMat, square, sqMat, halo, x, size, isHero };
  }

  // Hero meteor — bigger, centered
  const hero = buildMeteor({ x: HERO_X, size: 0.32, isHero: true });
  meteorGroup.add(hero.group);

  // Ambient atmosphere — a few smaller cubes falling at varied speeds/x
  const ambient = [];
  const xSeeds = [-3.6, -2.4, -1.4, 1.2, 2.0, 3.0, 3.8];
  for (let i = 0; i < xSeeds.length; i++) {
    const m = buildMeteor({
      x: xSeeds[i] + (Math.random() - 0.5) * 0.4,
      size: 0.06 + Math.random() * 0.10,
      isHero: false,
    });
    m.speed   = 0.35 + Math.random() * 0.55;
    m.phase   = Math.random();
    m.zOffset = -1 - Math.random() * 3;
    m.group.position.z = m.zOffset;
    meteorGroup.add(m.group);
    ambient.push(m);
  }

  /* =========================================================
   * Background dust — tiny pixels drifting UPWARD (parallax)
   * ========================================================= */
  const DUST = 350;
  const dustPositions = new Float32Array(DUST * 3);
  const dustSeeds     = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPositions[i*3+0] = (Math.random() - 0.5) * 14;
    dustPositions[i*3+1] = (Math.random() - 0.5) * 8;
    dustPositions[i*3+2] = -Math.random() * 8 - 0.5;
    dustSeeds[i] = Math.random() * 100;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeo.setAttribute('aSeed',    new THREE.BufferAttribute(dustSeeds, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      void main() {
        vec3 p = position;
        // upward drift, recycled at top
        p.y = mod(p.y + uTime * 0.55 + aSeed * 0.1, 8.0) - 4.0;
        // tiny lateral wobble
        p.x += sin(uTime * 0.4 + aSeed) * 0.05;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((0.8 + aSeed * 0.02) * (140.0 / -mv.z), 1.0, 3.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      void main() {
        // crisp pixel
        vec2 c = gl_PointCoord - 0.5;
        float a = step(max(abs(c.x), abs(c.y)), 0.45);
        gl_FragColor = vec4(vec3(1.0), a * 0.45 * uOpacity);
      }
    `,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  group.add(dust);

  /* ---------- timing constants ---------- */
  const FALL_END    = 0.50;   // local progress at which hero hits the water
  const PULSE_DELAY = 0.28;   // local progress AFTER FALL_END at which secondary pulse fires
  let lastImpactTime = -10;
  let lastPulseTime  = -10;

  function placeMeteor(meteor, y) {
    meteor.square.position.y = y;
    const beamLen = Math.max(0.05, TOP_Y - y);
    meteor.beam.position.y = y;
    meteor.beam.scale.y = beamLen;
    if (meteor.halo) meteor.halo.position.y = y;
  }

  return {
    group,
    setOpacity(a) {
      waterMat.uniforms.uOpacity.value = a;
      hero.beamMat.uniforms.uOpacity.value = a;
      hero.sqMat.uniforms.uOpacity.value   = a;
      if (hero.halo) hero.halo.material.uniforms.uOpacity.value = a;
      ambient.forEach(m => {
        m.beamMat.uniforms.uOpacity.value = a;
        m.sqMat.uniforms.uOpacity.value   = a;
      });
      dustMat.uniforms.uOpacity.value = a;
    },
    update(t, dt, local) {
      waterMat.uniforms.uTime.value = t;
      dustMat.uniforms.uTime.value  = t;
      if (hero.halo) hero.halo.material.uniforms.uTime.value = t;

      /* ---- Hero meteor: scroll-driven straight vertical fall ---- */
      let heroY;
      if (local <= FALL_END) {
        const fallT = local / FALL_END;          // 0..1
        const fallE = fallT * fallT;             // ease-in (faster near impact)
        heroY = SPAWN_Y + (WATER_Y - SPAWN_Y) * fallE;
      } else {
        heroY = WATER_Y;                          // STAY at the impact point
      }
      placeMeteor(hero, heroY);
      hero.sqMat.uniforms.uVisible.value   = 1.0;  // always visible
      hero.beamMat.uniforms.uVisible.value = 1.0;
      if (hero.halo) hero.halo.material.uniforms.uVisible.value = 1.0;

      /* ---- Ambient cubes: continuous looping falls in the background ---- */
      ambient.forEach(m => {
        const cycle = (t * m.speed + m.phase) % 1.0;
        const y = SPAWN_Y + (WATER_Y - SPAWN_Y) * cycle;
        placeMeteor(m, y);
        // brief flash at start, brief fade at end of each loop
        const vis = Math.min(1.0, cycle * 12.0) * (1.0 - Math.max(0.0, (cycle - 0.92) * 12.0));
        m.sqMat.uniforms.uVisible.value   = vis;
        m.beamMat.uniforms.uVisible.value = vis;
      });

      /* ---- Impact: trigger primary ripple at the hit moment ---- */
      if (local >= FALL_END && lastImpactTime < t - 0.5) {
        waterMat.uniforms.uImpactTime.value = t;
        waterMat.uniforms.uImpactPos.value.set(HERO_X, 0);
        lastImpactTime = t;
        lastPulseTime  = -10;     // arm secondary pulse
      }
      if (local < FALL_END * 0.5) {
        lastImpactTime = -10;
        lastPulseTime  = -10;
      }

      // Primary ring strength: ramp 0 → 1 right after impact, then exponential decay
      let primary = 0;
      if (local >= FALL_END) {
        const phase = (local - FALL_END) / 0.40;
        primary = phase < 0.10 ? phase / 0.10 : Math.exp(-(phase - 0.10) * 2.4);
      }
      waterMat.uniforms.uImpactStrength.value = primary;

      /* ---- Secondary pulse (smaller, after the first rings settle) ---- */
      if (local >= FALL_END + PULSE_DELAY && lastPulseTime < t - 0.5) {
        waterMat.uniforms.uPulseTime.value = t;
        lastPulseTime = t;
      }
      let secondary = 0;
      if (local >= FALL_END + PULSE_DELAY) {
        const phase2 = (local - FALL_END - PULSE_DELAY) / 0.20;
        secondary = phase2 < 0.10 ? phase2 / 0.10 : Math.exp(-(phase2 - 0.10) * 3.0);
      }
      waterMat.uniforms.uPulseStrength.value = secondary * 0.6;

      /* ---- Subtle whole-scene zoom-out during fall ---- */
      // start at scale 1.04 → end at scale 0.96, then settle 0.94 after impact
      const z = local <= FALL_END
        ? 1.04 - (local / FALL_END) * 0.10
        : 0.94;
      group.scale.setScalar(z);
    },
  };
}
