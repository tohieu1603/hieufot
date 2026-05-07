import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 03 — GIVE SHAPE
 * Sphere with procedural zebra/contour stripes (frag) + bezier "hair" lines.
 */
export default function scene03() {
  const group = new THREE.Group();

  /* ---- Zebra sphere ---- */
  const sphereGeo = new THREE.SphereGeometry(1.4, 96, 96);
  const sphereMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${utils}
      uniform float uTime;
      uniform float uOpacity;
      varying vec3  vNormalW;
      varying vec3  vPos;
      varying vec2  vUv;
      void main() {
        // domain-warped stripes
        float warp = fbm3(vec3(vPos * 1.6, uTime * 0.18)) * 1.6;
        float stripe = sin(vPos.y * 11.0 + warp * 2.5);
        float s = smoothstep(0.0, 0.05, stripe);

        // rim light
        vec3 V = normalize(cameraPosition - (modelMatrix * vec4(vPos,1.0)).xyz);
        float rim = pow(1.0 - max(dot(vNormalW, V), 0.0), 2.0);

        vec3 col = vec3(s) + rim * 0.6;
        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  group.add(sphere);

  /* ---- Bezier "hair" lines around sphere ---- */
  const hairGroup = new THREE.Group();
  const HAIRS = 28;
  const POINTS = 40;
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
  for (let h = 0; h < HAIRS; h++) {
    const pts = [];
    const baseTheta = Math.random() * Math.PI * 2;
    const basePhi   = Math.random() * Math.PI;
    for (let i = 0; i < POINTS; i++) {
      const k = i / (POINTS - 1);
      const r = 1.45 + k * 1.6;
      const wave = Math.sin(k * 8 + baseTheta * 3) * 0.4;
      const theta = baseTheta + wave * 0.2;
      const phi   = basePhi   + k * 0.3 * Math.sin(baseTheta * 4);
      pts.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) + wave * k,
        r * Math.sin(phi) * Math.sin(theta),
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    hairGroup.add(new THREE.Line(geo, lineMat));
  }
  group.add(hairGroup);

  return {
    group,
    setOpacity(a) {
      sphereMat.uniforms.uOpacity.value = a;
      lineMat.opacity = a * 0.4;
    },
    update(t, dt, local) {
      sphereMat.uniforms.uTime.value = t;
      sphere.rotation.y = t * 0.25;
      hairGroup.rotation.y = -t * 0.1;
      group.position.x = (local - 0.5) * 1.0;
    },
  };
}
