import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 04 — FOLLOW THE TRENDS
 * Floating tetrahedrons + constellation lines + central glowing SDF "symbol" + particle dust.
 */
export default function scene04() {
  const group = new THREE.Group();

  /* ---- Tetrahedrons ---- */
  const tetraMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uOpacity: { value: 1 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec3 p = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vNormal;
      void main() {
        float light = max(0.0, dot(vNormal, normalize(vec3(0.4,0.7,0.5))));
        float l = step(0.4, light) * 0.85 + step(0.7, light) * 0.15;
        gl_FragColor = vec4(vec3(l), uOpacity);
      }
    `,
  });

  const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true });

  const TETRA_COUNT = 14;
  const tetras = [];
  const tetraCenters = []; // for constellation
  for (let i = 0; i < TETRA_COUNT; i++) {
    const sz = 0.35 + Math.random() * 0.5;
    const geo = new THREE.TetrahedronGeometry(sz, 0);
    const m = new THREE.Mesh(geo, tetraMat.clone());
    m.position.set((Math.random()-0.5)*7, (Math.random()-0.5)*4, (Math.random()-0.5)*4 - 1);
    m.userData = {
      basePos: m.position.clone(),
      sx: Math.random()*0.4+0.2,
      sy: Math.random()*0.4+0.2,
      seed: Math.random()*10,
      orbit: 0.15 + Math.random() * 0.25,
    };

    const edges = new THREE.EdgesGeometry(geo);
    const w = new THREE.LineSegments(edges, wireMat.clone());
    m.add(w);

    tetras.push(m);
    tetraCenters.push(m);
    group.add(m);
  }

  /* ---- Constellation lines: connect each tetra to its nearest 2-3 neighbours, animate dashes ---- */
  // We'll build LineSegments where each segment connects two tetra centers; positions update each frame.
  const PAIRS = [];
  for (let i = 0; i < tetras.length; i++) {
    const dists = [];
    for (let j = 0; j < tetras.length; j++) {
      if (j === i) continue;
      const d = tetras[i].position.distanceTo(tetras[j].position);
      dists.push({ j, d });
    }
    dists.sort((a, b) => a.d - b.d);
    for (let k = 0; k < 2; k++) {
      const j = dists[k].j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!PAIRS.find(p => p.key === key)) {
        PAIRS.push({ a: i, b: j, key, baseDist: dists[k].d });
      }
    }
  }

  const lineGeo = new THREE.BufferGeometry();
  const linePos = new Float32Array(PAIRS.length * 6);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const constMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const constellation = new THREE.LineSegments(lineGeo, constMat);
  group.add(constellation);

  /* ---- Central SDF "symbol" (glowing 王) with halo + ring ---- */
  const symGeo = new THREE.PlaneGeometry(2.6, 2.6, 1, 1);
  const symMat = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: { uOpacity: { value: 1 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      ${utils}
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;

      float bar(vec2 p, vec2 size) { return sdBox(p, size); }

      void main() {
        vec2 p = (vUv - 0.5) * 2.6;
        float h1 = bar(p - vec2(0.0,  0.6), vec2(0.5, 0.05));
        float h2 = bar(p,                   vec2(0.4, 0.05));
        float h3 = bar(p - vec2(0.0, -0.6), vec2(0.5, 0.05));
        float v1 = bar(p,                   vec2(0.05, 0.7));
        float d = min(min(h1, h2), min(h3, v1));
        // pulse
        float pulse = 0.45 + 0.55 * sin(uTime * 1.4);
        float core = smoothstep(0.0, -0.005, d);
        float glow = exp(-d * 7.0) * (0.45 + 0.35 * pulse);

        // outer ring (halo) at radius ~0.95
        float r = length(p);
        float ring = smoothstep(0.02, 0.0, abs(r - 1.05))
                   + smoothstep(0.018, 0.0, abs(r - 1.18)) * 0.4;

        // dashes around the ring
        float ang = atan(p.y, p.x);
        float dash = step(0.5, fract(ang * 14.0 / 6.28318 + uTime * 0.15));
        ring *= 0.55 + 0.45 * dash;

        float a = max(core, glow * 0.7) + ring * 0.5;
        gl_FragColor = vec4(vec3(1.0), clamp(a, 0.0, 1.0) * uOpacity);
      }
    `,
  });
  const symbol = new THREE.Mesh(symGeo, symMat);
  symbol.position.set(0, 0, 0);
  group.add(symbol);

  /* ---- Particle dust around symbol ---- */
  const PARTICLES = 180;
  const dpos = new Float32Array(PARTICLES * 3);
  const dseed = new Float32Array(PARTICLES);
  for (let i = 0; i < PARTICLES; i++) {
    // bias dust outward + push behind so it never sits in front of the camera
    const r = 1.4 + Math.random() * 2.0;
    const a = Math.random() * Math.PI * 2;
    dpos[i*3+0] = Math.cos(a) * r;
    dpos[i*3+1] = (Math.random() - 0.5) * 3.0;
    dpos[i*3+2] = Math.sin(a) * r - 0.5;
    dseed[i]    = Math.random() * 1000;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  dustGeo.setAttribute('aSeed',    new THREE.BufferAttribute(dseed, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      void main() {
        vec3 p = position;
        // slow swirl
        float ang = uTime * 0.18 + aSeed * 0.001;
        float ca = cos(ang), sa = sin(ang);
        vec2 xz = vec2(p.x * ca - p.z * sa, p.x * sa + p.z * ca);
        p.x = xz.x; p.z = xz.y;
        p.y += sin(uTime * 0.6 + aSeed) * 0.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        // clamp size so close particles don't blob out
        float sz = (1.0 + sin(aSeed) * 0.4) * (60.0 / max(-mv.z, 1.0));
        gl_PointSize = clamp(sz, 1.0, 6.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.0, length(c));
        gl_FragColor = vec4(vec3(1.0), a * 0.45 * uOpacity);
      }
    `,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  group.add(dust);

  return {
    group,
    setOpacity(a) {
      symMat.uniforms.uOpacity.value = a;
      dustMat.uniforms.uOpacity.value = a;
      constMat.opacity = a * 0.18;
      tetras.forEach(m => {
        m.material.uniforms.uOpacity.value = a;
        m.children[0].material.opacity = a;
      });
    },
    update(t, dt, local) {
      symMat.uniforms.uTime.value  = t;
      dustMat.uniforms.uTime.value = t;

      tetras.forEach(m => {
        m.rotation.x += dt * m.userData.sx;
        m.rotation.y += dt * m.userData.sy;
        // subtle orbit drift around their base
        const u = m.userData;
        m.position.x = u.basePos.x + Math.sin(t * u.orbit + u.seed) * 0.25;
        m.position.y = u.basePos.y + Math.cos(t * u.orbit * 0.8 + u.seed) * 0.20;
      });

      // update constellation lines
      const arr = lineGeo.attributes.position.array;
      let idx = 0;
      const maxDist = 4.0;
      for (const pair of PAIRS) {
        const a = tetras[pair.a].position;
        const b = tetras[pair.b].position;
        // hide far pairs by collapsing them to a single point (won't render)
        const d = a.distanceTo(b);
        if (d < maxDist) {
          arr[idx+0] = a.x; arr[idx+1] = a.y; arr[idx+2] = a.z;
          arr[idx+3] = b.x; arr[idx+4] = b.y; arr[idx+5] = b.z;
        } else {
          arr[idx+0] = a.x; arr[idx+1] = a.y; arr[idx+2] = a.z;
          arr[idx+3] = a.x; arr[idx+4] = a.y; arr[idx+5] = a.z;
        }
        idx += 6;
      }
      lineGeo.attributes.position.needsUpdate = true;

      // gentle scale pulse on the symbol
      const s = 1.0 + Math.sin(t * 1.4) * 0.04;
      symbol.scale.set(s, s, s);
      symbol.rotation.z = Math.sin(t * 0.4) * 0.02;

      group.rotation.y = (local - 0.5) * 0.12;
    },
  };
}
