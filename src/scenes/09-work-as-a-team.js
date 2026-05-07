import * as THREE from 'three';
import { utils } from '../shaders/util.glsl.js';

/**
 * Scene 09 — WORK AS A TEAM
 * Solar system with curved gravity-well grid (vertex displacement).
 */
export default function scene09() {
  const group = new THREE.Group();

  /* ---- Gravity-well grid ---- */
  const gridGeo = new THREE.PlaneGeometry(20, 20, 80, 80);
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 1 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorld;
      varying float vWell;
      void main() {
        vec3 p = position;
        float r = length(p.xy);
        float well = -1.6 / (r * 0.7 + 0.4);
        well += sin(uTime * 0.5 + r * 0.5) * 0.05;
        p.z += well;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorld = wp.xyz;
        vWell = well;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vWorld;
      varying float vWell;
      void main() {
        // crisp grid lines
        vec2 g = abs(fract(vWorld.xy * 0.6) - 0.5);
        float d = min(g.x, g.y);
        float line = smoothstep(0.04, 0.0, d);
        // fade with distance and depth
        float r = length(vWorld.xy);
        float fade = smoothstep(8.0, 1.0, r);
        float depthFade = smoothstep(-3.0, 0.0, vWell);
        float a = line * fade * (0.5 + 0.5 * depthFade);
        gl_FragColor = vec4(vec3(a), a * uOpacity);
      }
    `,
  });
  const grid = new THREE.Mesh(gridGeo, gridMat);
  grid.rotation.x = -Math.PI / 2.7;
  grid.position.y = -1.4;
  group.add(grid);

  /* ---- Sun (central) ---- */
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 32), sunMat);
  group.add(sun);

  /* ---- Planets ---- */
  const planets = [];
  const planetMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true });
  const orbitMat  = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
  const orbits = [1.4, 2.2, 3.0, 4.0];
  orbits.forEach((r, i) => {
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(0.12 + i * 0.04, 16, 16),
      planetMat.clone()
    );
    planet.userData = { r, speed: 0.6 - i * 0.1, off: Math.random() * Math.PI * 2 };
    planets.push(planet);
    group.add(planet);

    // orbit line
    const segs = 96;
    const orbitPts = [];
    for (let k = 0; k <= segs; k++) {
      const a = (k / segs) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbit = new THREE.Line(orbitGeo, orbitMat.clone());
    group.add(orbit);
  });

  return {
    group,
    setOpacity(a) {
      gridMat.uniforms.uOpacity.value = a;
      sunMat.opacity = a; sunMat.transparent = true;
      planets.forEach(p => p.material.opacity = a);
      orbitMat.opacity = a * 0.18;
    },
    update(t, dt, local) {
      gridMat.uniforms.uTime.value = t;
      sun.scale.setScalar(1 + Math.sin(t * 1.4) * 0.05);
      planets.forEach(p => {
        const a = t * p.userData.speed + p.userData.off;
        p.position.x = Math.cos(a) * p.userData.r;
        p.position.z = Math.sin(a) * p.userData.r;
        p.rotation.y += dt * 0.5;
      });
      group.rotation.y = Math.sin(t * 0.1) * 0.1;
    },
  };
}
