import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 10 — THANKS
 * Triangle-fragment explosion. Vertex shader pushes triangle clusters apart by progress.
 */
export default function scene10() {
  const group = new THREE.Group();

  // Build a sphere from triangles, then expand each triangle's vertices outward in vert shader.
  const base = new THREE.IcosahedronGeometry(1.5, 4);
  const pos = base.attributes.position;
  const triCount = pos.count / 3;

  // Per-triangle attribs: direction, seed
  const aTriCenter = new Float32Array(pos.count * 3);
  const aTriSeed   = new Float32Array(pos.count);
  const aTriDir    = new Float32Array(pos.count * 3);

  for (let i = 0; i < triCount; i++) {
    const i0 = i*9, i1 = i*9+3, i2 = i*9+6;
    const cx = (pos.array[i0]   + pos.array[i1]   + pos.array[i2])   / 3;
    const cy = (pos.array[i0+1] + pos.array[i1+1] + pos.array[i2+1]) / 3;
    const cz = (pos.array[i0+2] + pos.array[i1+2] + pos.array[i2+2]) / 3;
    const len = Math.sqrt(cx*cx + cy*cy + cz*cz) || 1;
    const dx = cx / len, dy = cy / len, dz = cz / len;
    const seed = Math.random();
    for (let k = 0; k < 3; k++) {
      aTriCenter[i*9 + k*3 + 0] = cx;
      aTriCenter[i*9 + k*3 + 1] = cy;
      aTriCenter[i*9 + k*3 + 2] = cz;
      aTriDir[i*9 + k*3 + 0] = dx;
      aTriDir[i*9 + k*3 + 1] = dy;
      aTriDir[i*9 + k*3 + 2] = dz;
      aTriSeed[i*3 + k] = seed;
    }
  }

  base.setAttribute('aTriCenter', new THREE.BufferAttribute(aTriCenter, 3));
  base.setAttribute('aTriDir',    new THREE.BufferAttribute(aTriDir, 3));
  base.setAttribute('aTriSeed',   new THREE.BufferAttribute(aTriSeed, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 1 },
      uExpand:  { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec3  aTriCenter;
      attribute vec3  aTriDir;
      attribute float aTriSeed;
      uniform float uExpand;
      uniform float uTime;
      varying float vSeed;
      varying vec3  vNormal;

      void main() {
        vec3 p = position;
        // Expand each tri outward + rotate slightly around its own random axis
        float expand = uExpand * (0.5 + aTriSeed);
        // small per-tri rotation
        float ang = uExpand * (aTriSeed * 6.28 + 2.0);
        vec3 axis = normalize(vec3(sin(aTriSeed*7.0), cos(aTriSeed*5.0), sin(aTriSeed*3.0) + 0.001));
        // Rodrigues
        vec3 v = p - aTriCenter;
        vec3 r = v * cos(ang) + cross(axis, v) * sin(ang) + axis * dot(axis, v) * (1.0 - cos(ang));
        p = aTriCenter + r;
        // push along center direction
        p += aTriDir * expand * 1.5;

        vNormal = normalize(mat3(modelMatrix) * normalize(aTriCenter));
        vSeed = aTriSeed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uExpand;
      varying float vSeed;
      varying vec3 vNormal;
      void main() {
        // toon edge: lighter on rim, dark inside
        float light = max(0.0, dot(vNormal, normalize(vec3(0.4, 0.7, 0.5))));
        float l = step(0.4, light);
        float fade = 1.0 - smoothstep(0.6, 1.4, uExpand);
        gl_FragColor = vec4(vec3(l), fade * uOpacity);
      }
    `,
  });

  const mesh = new THREE.Mesh(base, mat);
  group.add(mesh);

  return {
    group,
    setOpacity(a) { mat.uniforms.uOpacity.value = a; },
    update(t, dt, local) {
      mat.uniforms.uTime.value = t;
      // expand from 0 → ~1.4 across the scroll window
      mat.uniforms.uExpand.value = local * 1.4;
      mesh.rotation.y = t * 0.15;
    },
  };
}
