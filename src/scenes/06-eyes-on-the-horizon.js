import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 06 — EYES ON THE HORIZON
 * Wavy striped terrain stretching to a glowing horizon line, drifting particles, atmospheric fog.
 */
export default function scene06() {
  const group = new THREE.Group();

  /* ---- Terrain (vert displacement + frag stripes + horizon mist) ---- */
  const geo = new THREE.PlaneGeometry(80, 60, 320, 220);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      ${utils}
      uniform float uTime;
      varying vec3 vWorld;
      varying float vH;
      varying vec2  vUv;
      void main() {
        vec3 p = position;
        // primary swell + cross-swell + fbm detail
        float h =  sin(p.x * 0.42 + uTime * 0.55) * 0.85
                + cos(p.y * 0.32 + uTime * 0.40) * 0.55
                + fbm3(vec3(p.xy * 0.32, uTime * 0.18)) * 0.85;
        // amplify wave heights along the rows further from camera (depth)
        float depthAmp = smoothstep(-30.0, 30.0, p.y);
        h *= 0.5 + depthAmp * 1.4;
        p.z += h;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorld = wp.xyz;
        vH = h;
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uTime;
      varying vec3  vWorld;
      varying float vH;
      varying vec2  vUv;

      void main() {
        // STRIPES: derivative-based for constant width regardless of slope
        float band = sin(vWorld.x * 5.0 - uTime * 1.0 + vWorld.z * 1.0);
        float fw = fwidth(band) * 1.6;
        float s = smoothstep(-fw, fw, band);

        // distance from "camera"-ish axis → fade to horizon
        float dist = length(vWorld.xy * vec2(1.0, 0.7));
        float distFade = smoothstep(38.0, 6.0, dist);

        // horizon mist near top of plane (high vUv.y)
        float horizon = smoothstep(0.55, 1.0, vUv.y);
        float mist = horizon * 0.85;

        // peak highlight + valley shadow
        float peak   = smoothstep(0.5, 1.5, vH) * 0.25;
        float trough = smoothstep(-1.5,-0.2, -vH) * 0.15;

        float v = s * distFade + peak;
        v -= trough;
        v = clamp(v, 0.0, 1.0);
        // fade strongly into mist near horizon
        v = mix(v, 0.85, mist);
        // overall global luminance tame
        v *= 0.92;
        gl_FragColor = vec4(vec3(v), distFade * uOpacity * (1.0 - mist * 0.0));
      }
    `,
    extensions: { derivatives: true },
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2.15; // steeper tilt → horizon high in frame
  mesh.position.y = -1.6;
  mesh.position.z = -3;
  group.add(mesh);

  /* ---- Distant glowing horizon line ---- */
  const horGeo = new THREE.PlaneGeometry(40, 4, 1, 1);
  const horMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: { uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float band = smoothstep(0.42, 0.5, vUv.y) * smoothstep(0.58, 0.5, vUv.y);
        float side = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        float a = band * side;
        gl_FragColor = vec4(vec3(1.0), a * uOpacity * 0.5);
      }
    `,
  });
  const horizon = new THREE.Mesh(horGeo, horMat);
  horizon.position.set(0, 0.8, -10);
  group.add(horizon);

  /* ---- Drifting dust particles ---- */
  const PARTICLES = 250;
  const ppos = new Float32Array(PARTICLES * 3);
  for (let i = 0; i < PARTICLES; i++) {
    ppos[i*3+0] = (Math.random() - 0.5) * 18;
    ppos[i*3+1] = (Math.random() - 0.2) * 4;
    ppos[i*3+2] = -Math.random() * 10;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.025,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const points = new THREE.Points(pGeo, pMat);
  group.add(points);

  return {
    group,
    setOpacity(a) {
      mat.uniforms.uOpacity.value    = a;
      horMat.uniforms.uOpacity.value = a;
      pMat.opacity = a * 0.6;
    },
    update(t, dt, local) {
      mat.uniforms.uTime.value = t;
      mesh.position.z = -3 + local * 0.8;
      // dust drift
      const arr = points.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i+1] += dt * 0.05;
        arr[i+0] += Math.sin(t + i) * dt * 0.02;
        if (arr[i+1] > 4) arr[i+1] = -1;
      }
      points.geometry.attributes.position.needsUpdate = true;
    },
  };
}
