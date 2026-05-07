import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 08 — KEEP LEARNING
 * Low-poly mountains (icosahedron flat shaded) + radial sun glow disc.
 */
export default function scene08() {
  const group = new THREE.Group();

  /* ---- Sun glow disc (back) ---- */
  const sunGeo = new THREE.PlaneGeometry(6, 6, 1, 1);
  const sunMat = new THREE.ShaderMaterial({
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
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        float core = smoothstep(0.18, 0.0, r);
        float halo = exp(-r * 6.0);
        float rays = 0.5 + 0.5 * sin(atan(p.y, p.x) * 14.0 + uTime * 0.3);
        rays *= smoothstep(0.5, 0.18, r);
        float a = core + halo * 0.6 + rays * 0.15;
        gl_FragColor = vec4(vec3(1.0), a * uOpacity);
      }
    `,
  });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(0, 0.6, -3);
  group.add(sun);

  /* ---- Mountain ridge — instanced flat-shaded triangles ---- */
  const moGroup = new THREE.Group();
  const moMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const moEdgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true });
  const ridgeWidth = 14;
  for (let i = 0; i < 22; i++) {
    const x = -ridgeWidth/2 + (i / 21) * ridgeWidth + (Math.random()-0.5)*0.4;
    const h = 0.6 + Math.random() * 1.4;
    const w = 0.8 + Math.random() * 0.6;
    const tri = new THREE.BufferGeometry();
    const verts = new Float32Array([
      x - w/2, -1.0, 0,
      x + w/2, -1.0, 0,
      x,        h - 1.0, 0,
    ]);
    tri.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    const mesh = new THREE.Mesh(tri, moMat);
    const edges = new THREE.EdgesGeometry(tri);
    const line = new THREE.LineSegments(edges, moEdgeMat.clone());
    moGroup.add(mesh);
    moGroup.add(line);
  }
  moGroup.position.z = -1.4;
  group.add(moGroup);

  /* ---- Drifting particles ---- */
  const PARTICLES = 800;
  const positions = new Float32Array(PARTICLES * 3);
  for (let i = 0; i < PARTICLES; i++) {
    positions[i*3+0] = (Math.random()-0.5) * 16;
    positions[i*3+1] = (Math.random()-0.5) * 8;
    positions[i*3+2] = -Math.random() * 8;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.025, transparent: true });
  const points = new THREE.Points(pGeo, pMat);
  group.add(points);

  return {
    group,
    setOpacity(a) {
      sunMat.uniforms.uOpacity.value = a;
      moEdgeMat.opacity = a;
      moGroup.children.forEach(c => { if (c.material && c.material.opacity !== undefined) c.material.opacity = a; });
      pMat.opacity = a;
    },
    update(t, dt, local) {
      sunMat.uniforms.uTime.value = t;
      moGroup.position.x = Math.sin(t * 0.2) * 0.3;
      const pos = points.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i+1] += dt * 0.1;
        if (pos[i+1] > 4) pos[i+1] -= 8;
      }
      points.geometry.attributes.position.needsUpdate = true;
    },
  };
}
