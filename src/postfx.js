import * as THREE from 'three';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }       from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass }       from 'three/addons/postprocessing/OutputPass.js';

const grainShader = {
  uniforms: {
    tDiffuse:   { value: null },
    uTime:      { value: 0 },
    uIntensity: { value: 0.05 },
    uVignette:  { value: 0.6 },
    uChroma:    { value: 0.001 },
    uResolution:{ value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    uniform float uVignette;
    uniform float uChroma;
    uniform vec2  uResolution;
    varying vec2 vUv;

    float hash(vec2 p) { p = fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }

    void main() {
      vec2 uv = vUv;

      // Chromatic aberration (radial)
      vec2 dir = uv - 0.5;
      float r = texture2D(tDiffuse, uv + dir * uChroma).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - dir * uChroma).b;
      vec3 col = vec3(r, g, b);

      // Vignette
      float v = smoothstep(0.95, 0.25, length(dir));
      col *= mix(1.0, v, uVignette);

      // Film grain
      float grain = (hash(uv * uResolution + uTime * 60.0) - 0.5) * uIntensity;
      col += grain;

      // Slight scanline sheen
      col += sin(uv.y * uResolution.y * 1.5) * 0.005;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function buildPostFX(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const isMobile = matchMedia('(pointer: coarse)').matches && window.innerWidth < 820;

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    isMobile ? 0.20 : 0.28,                 // strength — gentler on mobile
    isMobile ? 0.40 : 0.55,                 // radius
    isMobile ? 0.72 : 0.62,                 // threshold — only the brightest pixels bloom
  );
  composer.addPass(bloom);

  const grain = new ShaderPass(grainShader);
  grain.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  composer.addPass(grain);

  composer.addPass(new OutputPass());

  // animate grain time
  let t = 0;
  const _origRender = composer.render.bind(composer);
  composer.render = (delta = 0.016) => {
    t += delta;
    grain.uniforms.uTime.value = t;
    grain.uniforms.uResolution.value.set(window.innerWidth * renderer.getPixelRatio(),
                                         window.innerHeight * renderer.getPixelRatio());
    _origRender(delta);
  };

  return composer;
}
