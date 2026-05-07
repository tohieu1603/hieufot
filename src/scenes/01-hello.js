import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 01 — HELLO
 * Particle field + central FBM nebula billboard.
 */
export default function scene01() {
  const group = new THREE.Group();

  /* ---- Particles (squarish points) ---- */
  const PARTICLES = 900;
  const positions = new Float32Array(PARTICLES * 3);
  const sizes     = new Float32Array(PARTICLES);
  const seeds     = new Float32Array(PARTICLES);

  for (let i = 0; i < PARTICLES; i++) {
    // bias particles AWAY from the center so HELLO text stays readable
    const u = Math.random();
    const r = 2.2 + Math.pow(u, 0.55) * 11.0;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    positions[i*3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
    positions[i*3 + 2] = -Math.random() * 14 - 1;
    sizes[i]   = Math.random() < 0.04 ? 2.6 : (0.7 + Math.random() * 1.2);
    seeds[i]   = Math.random() * 1000.0;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
  pGeo.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1));

  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 1 },
      uSize:    { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aSeed;
      uniform float uTime;
      uniform float uSize;
      varying float vSize;
      varying float vSeed;
      void main() {
        vec3 p = position;
        // gentle drift
        p.y += sin(uTime * 0.4 + aSeed) * 0.15;
        p.x += cos(uTime * 0.3 + aSeed * 0.7) * 0.15;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uSize * (180.0 / -mv.z);
        vSize = aSize;
        vSeed = aSeed;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vSize;
      varying float vSeed;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float box = max(abs(c.x), abs(c.y));
        float a = step(box, 0.45);
        float intensity = a;
        gl_FragColor = vec4(vec3(0.85), intensity * uOpacity * 0.55);
      }
    `,
  });

  const points = new THREE.Points(pGeo, pMat);
  group.add(points);

  /* ---- FBM nebula plane (faces camera) ---- */
  const nebulaGeo = new THREE.PlaneGeometry(8, 8, 1, 1);
  const nebulaMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${utils}
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv - 0.5;
        float r = length(uv);
        float n = fbm3(vec3(uv * 2.2, uTime * 0.07));
        n = pow(abs(n), 1.6);
        // RING falloff: dark hole in middle (so HELLO text is readable), wisp around it
        float ring = smoothstep(0.05, 0.18, r) * smoothstep(0.42, 0.12, r);
        float v = clamp(n * ring * 0.45, 0.0, 0.5);
        float glitch = step(0.987, fract(uv.y * 30.0 + uTime * 0.6)) * ring * 0.28;
        v += glitch;
        vec3 col = vec3(v);
        gl_FragColor = vec4(col, v * uOpacity);
      }
    `,
  });
  const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
  nebula.position.z = -2;
  group.add(nebula);

  return {
    group,
    setOpacity(a) {
      pMat.uniforms.uOpacity.value      = a;
      nebulaMat.uniforms.uOpacity.value = a;
    },
    update(t, dt, local) {
      pMat.uniforms.uTime.value      = t;
      nebulaMat.uniforms.uTime.value = t;
      group.position.z = local * 4 - 2;
    },
  };
}
