import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 07 — KEEP TRYING
 * Close-up dithered face mask. Lit sphere → bayer ordered dither → black/white.
 */
export default function scene07() {
  const group = new THREE.Group();

  const geo = new THREE.SphereGeometry(1.7, 96, 96);

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 1 },
      uPixel:   { value: 280.0 }, // pixel grid density
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vWorld;
      varying vec4 vNDC;
      void main() {
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
        vNDC = gl_Position;
      }
    `,
    fragmentShader: /* glsl */ `
      ${utils}
      uniform float uOpacity;
      uniform float uTime;
      uniform float uPixel;
      varying vec3 vNormalW;
      varying vec3 vWorld;
      varying vec4 vNDC;

      void main() {
        // simple Lambert lighting
        vec3 L1 = normalize(vec3(0.6, 0.8, 0.3));
        float d = max(0.0, dot(vNormalW, L1));
        float rim = pow(1.0 - max(dot(vNormalW, normalize(cameraPosition - vWorld)), 0.0), 2.0);
        float v = d * 0.85 + rim * 0.4;

        // pixel grid based on screen position
        vec2 ndc = (vNDC.xy / vNDC.w) * 0.5 + 0.5;
        vec2 pix = floor(ndc * uPixel);
        // ordered dither
        float thresh = bayer4(pix);
        float bw = step(thresh, v);

        gl_FragColor = vec4(vec3(bw), uOpacity);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  return {
    group,
    setOpacity(a) { mat.uniforms.uOpacity.value = a; },
    update(t, dt, local) {
      mat.uniforms.uTime.value = t;
      mesh.rotation.y = Math.sin(t * 0.25) * 0.4;
      mesh.position.z = local * 0.5;
    },
  };
}
