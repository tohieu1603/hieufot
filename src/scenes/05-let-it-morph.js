import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 05 — LET IT MORPH
 * Sphere displaced by 3D noise + horizontal contour-line shading (frag) → topo head feel.
 */
export default function scene05() {
  const group = new THREE.Group();

  const geo = new THREE.SphereGeometry(1.5, 192, 192);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 1 },
      uMorph:   { value: 0 },
    },
    vertexShader: /* glsl */ `
      ${utils}
      uniform float uTime;
      uniform float uMorph;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vDisp;
      void main() {
        vec3 p = position;
        float n = fbm3(p * 1.2 + vec3(0.0, uTime * 0.15, 0.0));
        float disp = n * (0.35 + uMorph * 0.45);
        // emphasize bumps along normal
        p += normal * disp;

        vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vDisp = disp;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3  vWorld;
      varying vec3  vNormalW;
      varying float vDisp;

      void main() {
        // crisp horizontal "topo" contour lines on a dark base
        // measure derivatives so lines stay constant width regardless of normal angle
        float y = vWorld.y * 22.0;
        float wave = sin(y);
        float fw = fwidth(y) * 1.4;
        float lineMask = 1.0 - smoothstep(fw, fw * 2.0, abs(wave));

        // facing factor: lines fade at silhouette to give the head a soft outline
        vec3 V = normalize(cameraPosition - vWorld);
        float NdV = max(dot(vNormalW, V), 0.0);
        // interior gets the contour lines; rim gets a thin glow only
        float interior = smoothstep(0.05, 0.4, NdV);
        float rim = pow(1.0 - NdV, 6.0) * 0.5;

        float intensity = lineMask * interior + rim;
        intensity = clamp(intensity, 0.0, 0.95);
        gl_FragColor = vec4(vec3(intensity), uOpacity);
      }
    `,
    extensions: { derivatives: true },
  });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  return {
    group,
    setOpacity(a) { mat.uniforms.uOpacity.value = a; },
    update(t, dt, local) {
      mat.uniforms.uTime.value  = t;
      mat.uniforms.uMorph.value = 0.5 + 0.5 * Math.sin(t * 0.7) * (0.4 + local * 0.6);
      mesh.rotation.y = t * 0.12;
      mesh.rotation.x = Math.sin(t * 0.3) * 0.1;
    },
  };
}
