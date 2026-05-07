import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 02 — FROM AN IDEA
 * Floor with SDF concentric ripples + light rays + floating cubes.
 */
export default function scene02() {
  const group = new THREE.Group();

  /* ---- Floor with ripples ---- */
  const floorGeo = new THREE.PlaneGeometry(40, 40, 1, 1);
  const floorMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 1 },
      uHits:    { value: [
        new THREE.Vector3(-2, 0, -1),
        new THREE.Vector3( 1.5, 0,  0.5),
        new THREE.Vector3( 0.2, 0, -2.5),
        new THREE.Vector3(-1.0, 0,  1.8),
      ]},
      uHitTimes: { value: [0, 1.2, 2.4, 3.6] },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3  uHits[4];
      uniform float uHitTimes[4];
      varying vec3  vWorld;

      void main() {
        vec3 col = vec3(0.0);
        // grid lines
        vec2 g = abs(fract(vWorld.xz * 0.5) - 0.5);
        float grid = smoothstep(0.02, 0.0, min(g.x, g.y));
        col += grid * 0.07;

        // multiple ripples
        for (int i = 0; i < 4; i++) {
          float t = mod(uTime + uHitTimes[i], 4.0);
          vec2 p = vWorld.xz - uHits[i].xz;
          float d = length(p);
          float wave = sin(d * 6.0 - t * 5.0);
          float ring = smoothstep(0.0, 0.1, abs(wave) - 0.85);
          ring *= smoothstep(t * 1.2 + 0.3, t * 1.2 - 0.3, d); // expanding mask
          ring *= smoothstep(8.0, 1.0, d) * (1.0 - smoothstep(0.0, 0.1, t * 0.0));
          col += ring;
        }

        // distance fade
        float fade = smoothstep(15.0, 1.0, length(vWorld.xz));
        col *= fade;

        gl_FragColor = vec4(col, fade * uOpacity);
      }
    `,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.8;
  group.add(floor);

  /* ---- Floating cubes (hollow wireframe + solid) ---- */
  const cubes = [];
  const cubeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true });
  for (let i = 0; i < 6; i++) {
    const sz = 0.4 + Math.random() * 0.6;
    const c = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), cubeMat.clone());
    c.position.set((Math.random() - 0.5) * 6, 0.5 + Math.random() * 1.2, (Math.random() - 0.5) * 4 - 1);
    c.userData.seed = Math.random() * 10;
    cubes.push(c);
    group.add(c);
  }

  /* ---- Light rays (vertical thin planes) ---- */
  const rayGeo = new THREE.PlaneGeometry(0.05, 5, 1, 1);
  const rayMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime:   { value: 0 },
      uOpacity:{ value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float fade = smoothstep(0.0, 0.4, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
        float pulse = 0.7 + 0.3 * sin(uTime * 2.0 + vUv.y * 6.0);
        float side  = smoothstep(0.0, 0.5, 1.0 - abs(vUv.x - 0.5) * 2.0);
        float a = fade * pulse * side;
        gl_FragColor = vec4(vec3(1.0), a * 0.6 * uOpacity);
      }
    `,
  });
  for (let i = 0; i < 5; i++) {
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.position.set((Math.random() - 0.5) * 6, 0.5, (Math.random() - 0.5) * 4 - 1);
    group.add(ray);
  }

  return {
    group,
    setOpacity(a) {
      floorMat.uniforms.uOpacity.value = a;
      rayMat.uniforms.uOpacity.value   = a;
      cubes.forEach(c => { c.material.opacity = a; });
    },
    update(t, dt, local) {
      floorMat.uniforms.uTime.value = t;
      rayMat.uniforms.uTime.value   = t;
      cubes.forEach(c => {
        c.rotation.x += dt * 0.4;
        c.rotation.y += dt * 0.3;
        c.position.y = 0.6 + Math.sin(t + c.userData.seed) * 0.15;
      });
      group.position.y = -local * 1.5;
    },
  };
}
