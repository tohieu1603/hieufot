import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 11 — PROFILE
 * Calm "atom" composition: central glow orb + slowly-rotating wireframe geodesic
 * sphere + electron-style particles in inclined orbits + drifting dust + caustic
 * backdrop. Quieter than scene 10's fragment explosion so the profile rail can
 * breathe.
 */

const TAU = Math.PI * 2;

/* ===== Caustic backplane ===== */
function buildCaustic() {
  const g = new THREE.PlaneGeometry(22, 14, 1, 1);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${utils}
      uniform float uTime; uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5;
        vec2 q = p + vec2(fbm3(vec3(p * 1.6, uTime * 0.04))) * 0.4;
        float n = fbm3(vec3(q * 1.8, uTime * 0.05));
        float falloff = smoothstep(0.85, 0.1, length(p));
        float v = clamp(abs(n) * falloff * 0.16, 0.0, 0.18);
        gl_FragColor = vec4(vec3(v), v * uOpacity);
      }
    `,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.z = -4.5;
  return { mesh, material: m };
}

/* ===== Central glow orb (the "core") ===== */
function buildOrb() {
  const group = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  group.add(core);

  const haloMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        float core = smoothstep(0.18, 0.0, r);
        float halo = exp(-r * 6.5);
        float pulse = 0.7 + 0.3 * sin(uTime * 1.4);
        float a = (core + halo * 0.6) * pulse;
        gl_FragColor = vec4(vec3(1.0), a * uOpacity * 0.85);
      }
    `,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), haloMat);
  group.add(halo);

  return { group, core, halo, haloMat };
}

/* ===== Wireframe geodesic sphere ===== */
function buildWireSphere(radius = 2.0, detail = 3) {
  const base = new THREE.IcosahedronGeometry(radius, detail);
  const wireGeo = new THREE.WireframeGeometry(base);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vPos;
      void main() {
        // tiny breathing scale
        vec3 p = position * (1.0 + sin(uTime * 0.6) * 0.012);
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uOpacity;
      varying vec3 vPos;
      void main() {
        // emphasize the front-facing hemisphere
        float face = smoothstep(-0.6, 1.6, vPos.z);
        float wave = 0.55 + 0.45 * sin(uTime * 0.6 + vPos.y * 1.2);
        float a = (0.18 + face * 0.35) * wave;
        gl_FragColor = vec4(vec3(1.0), a * uOpacity);
      }
    `,
  });
  return new THREE.LineSegments(wireGeo, mat);
}

/* ===== Electron particles in inclined orbits ===== */
function buildElectrons(count = 80) {
  const positions = new Float32Array(count * 3);
  const seeds     = new Float32Array(count);
  const orbitR    = new Float32Array(count);
  const tilts     = new Float32Array(count);
  const speeds    = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    seeds[i]   = Math.random() * TAU;
    orbitR[i]  = 1.6 + Math.random() * 1.4;
    tilts[i]   = Math.random() * Math.PI;
    speeds[i]  = (0.25 + Math.random() * 0.35) * (Math.random() < 0.5 ? -1 : 1);
    positions[i*3+0] = 0; positions[i*3+1] = 0; positions[i*3+2] = 0;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('aSeed',   new THREE.BufferAttribute(seeds, 1));
  g.setAttribute('aOrbitR', new THREE.BufferAttribute(orbitR, 1));
  g.setAttribute('aTilt',   new THREE.BufferAttribute(tilts, 1));
  g.setAttribute('aSpeed',  new THREE.BufferAttribute(speeds, 1));

  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aOrbitR;
      attribute float aTilt;
      attribute float aSpeed;
      uniform float uTime;
      varying float vBright;
      void main() {
        float a = aSeed + uTime * aSpeed;
        // orbit in XY then tilt around X by aTilt
        vec3 p = vec3(cos(a) * aOrbitR, sin(a) * aOrbitR, 0.0);
        float ct = cos(aTilt), st = sin(aTilt);
        p = vec3(p.x, p.y * ct - p.z * st, p.y * st + p.z * ct);
        // tiny radial breath
        p *= (1.0 + sin(uTime * 0.8 + aSeed) * 0.02);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(2.5 * (140.0 / -mv.z), 1.5, 6.0);
        // dim particles on the far side
        vBright = smoothstep(-1.5, 1.0, p.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vBright;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0), a * (0.35 + 0.55 * vBright) * uOpacity);
      }
    `,
  });
  return new THREE.Points(g, m);
}

/* ===== Triangle fragment bursts (continuously exhaling from the orb) ===== */
function buildBurst() {
  // Build an icosahedron, then split into individual triangles with per-tri attributes.
  const base = new THREE.IcosahedronGeometry(0.18, 2);
  const pos = base.attributes.position;
  const triCount = pos.count / 3;

  const aDir   = new Float32Array(pos.count * 3);
  const aSeed  = new Float32Array(pos.count);
  const aPhase = new Float32Array(pos.count);

  for (let i = 0; i < triCount; i++) {
    const ix = i * 9;
    const cx = (pos.array[ix]   + pos.array[ix+3] + pos.array[ix+6]) / 3;
    const cy = (pos.array[ix+1] + pos.array[ix+4] + pos.array[ix+7]) / 3;
    const cz = (pos.array[ix+2] + pos.array[ix+5] + pos.array[ix+8]) / 3;
    const len = Math.sqrt(cx*cx + cy*cy + cz*cz) || 1;
    const dx = cx/len, dy = cy/len, dz = cz/len;
    const seed  = Math.random();
    const phase = Math.random();              // staggered so the explosion is continuous
    for (let k = 0; k < 3; k++) {
      aDir[ix + k*3 + 0] = dx;
      aDir[ix + k*3 + 1] = dy;
      aDir[ix + k*3 + 2] = dz;
      aSeed [i*3 + k] = seed;
      aPhase[i*3 + k] = phase;
    }
  }

  base.setAttribute('aDir',   new THREE.BufferAttribute(aDir, 3));
  base.setAttribute('aSeed',  new THREE.BufferAttribute(aSeed, 1));
  base.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 1 },
      uCycle:   { value: 4.5 }, // seconds per fragment cycle
    },
    vertexShader: /* glsl */ `
      attribute vec3  aDir;
      attribute float aSeed;
      attribute float aPhase;
      uniform float uTime;
      uniform float uCycle;
      varying float vAlpha;
      void main() {
        // Continuous expansion: each tri's progress loops 0..1, staggered by aPhase
        float prog = fract((uTime + aPhase * uCycle) / uCycle);
        // Ease-out so they pop out fast and drift
        float ease = 1.0 - pow(1.0 - prog, 2.0);
        // Distance traveled outward
        float dist = ease * (1.6 + aSeed * 1.2);
        // Tumble each tri a bit
        float ang  = ease * (aSeed * 6.28 + 1.5);
        vec3 axis  = normalize(vec3(sin(aSeed*5.0), cos(aSeed*7.0), sin(aSeed*3.0)+0.001));
        vec3 v = position;            // local tri vertex relative to icosahedron origin
        // push the triangle outward along its center direction
        vec3 p = v + aDir * dist;
        // small swirl
        float c = cos(ang), s = sin(ang);
        vec3 r = v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
        p = aDir * dist + r;
        // alpha: fade in fast then fade out as it leaves
        vAlpha = smoothstep(0.0, 0.12, prog) * (1.0 - smoothstep(0.55, 1.0, prog));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(vec3(1.0), vAlpha * uOpacity * 0.55);
      }
    `,
  });

  return new THREE.Mesh(base, mat);
}

/* ===== Drifting bubble dust ===== */
function buildDust(count = 110) {
  const positions = new Float32Array(count * 3);
  const seeds     = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i*3+0] = (Math.random() - 0.5) * 9;
    positions[i*3+1] = (Math.random() - 0.5) * 6 - 1;
    positions[i*3+2] = (Math.random() - 0.5) * 6;
    seeds[i] = Math.random() * 1000;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      void main() {
        vec3 p = position;
        p.y += mod(uTime * 0.18 + aSeed * 0.01, 7.0) - 3.0;
        p.x += sin(uTime * 0.4 + aSeed) * 0.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((1.0 + sin(aSeed)*0.5) * (130.0 / -mv.z), 1.0, 4.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a = step(max(abs(c.x), abs(c.y)), 0.45);
        gl_FragColor = vec4(vec3(1.0), a * 0.35 * uOpacity);
      }
    `,
  });
  return new THREE.Points(g, m);
}

/* ===== Scene ===== */
export default function scene11() {
  const group = new THREE.Group();

  const caustic = buildCaustic();
  group.add(caustic.mesh);

  const orb = buildOrb();
  orb.group.position.set(0, 0, -1.0);
  group.add(orb.group);

  const sphere = buildWireSphere(2.0, 3);
  sphere.position.z = -1.0;
  group.add(sphere);

  // outer thinner sphere for layered depth
  const sphere2 = buildWireSphere(2.55, 2);
  sphere2.position.z = -1.0;
  sphere2.material.uniforms.uOpacity.value = 0.55;
  group.add(sphere2);

  const electrons = buildElectrons(90);
  electrons.position.z = -1.0;
  group.add(electrons);

  // Continuously-exhaling triangle fragments from the orb
  const burst = buildBurst();
  burst.position.z = -1.0;
  group.add(burst);

  // Larger, slower secondary burst
  const burst2 = buildBurst();
  burst2.position.z = -1.0;
  burst2.material.uniforms.uCycle.value = 7.0;
  burst2.scale.setScalar(1.5);
  group.add(burst2);

  const dust = buildDust(110);
  group.add(dust);

  // gentle group tilt
  group.rotation.x = -0.18;

  return {
    group,
    setOpacity(a) {
      caustic.material.uniforms.uOpacity.value = a;
      orb.haloMat.uniforms.uOpacity.value = a;
      orb.core.material.transparent = true;
      orb.core.material.opacity = a;
      sphere.material.uniforms.uOpacity.value = a;
      sphere2.material.uniforms.uOpacity.value = a * 0.55;
      electrons.material.uniforms.uOpacity.value = a;
      burst.material.uniforms.uOpacity.value = a;
      burst2.material.uniforms.uOpacity.value = a * 0.6;
      dust.material.uniforms.uOpacity.value = a;
    },
    update(t, dt, local) {
      caustic.material.uniforms.uTime.value = t;
      orb.haloMat.uniforms.uTime.value = t;
      orb.core.scale.setScalar(1 + Math.sin(t * 1.6) * 0.06);

      sphere.material.uniforms.uTime.value = t;
      sphere2.material.uniforms.uTime.value = t;
      sphere.rotation.y = t * 0.10;
      sphere.rotation.x = Math.sin(t * 0.07) * 0.25;
      sphere2.rotation.y = -t * 0.06;
      sphere2.rotation.z = Math.cos(t * 0.05) * 0.2;

      electrons.material.uniforms.uTime.value = t;
      burst.material.uniforms.uTime.value = t;
      burst2.material.uniforms.uTime.value = t;
      burst.rotation.y  = t * 0.05;
      burst2.rotation.y = -t * 0.03;
      dust.material.uniforms.uTime.value = t;

      const s = 0.85 + local * 0.18;
      group.scale.setScalar(s);
    },
  };
}
