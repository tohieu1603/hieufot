/**
 * SceneManager — registers scene factories with [start,end] progress windows.
 * Each scene gets a "local progress" 0..1 and a wider "fade window" so adjacent
 * scenes overlap softly. Scenes without their own opacity uniform get group.scale
 * shrunk + fadeable group.position.z pushed back to hide.
 */
export class SceneManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.entries = [];
  }

  register(name, factory, range) {
    const inst = factory(this.ctx);
    inst.group.visible = false;
    this.ctx.scene.add(inst.group);
    this.entries.push({ name, inst, range });
  }

  onResize(w, h) {
    this.entries.forEach(e => e.inst.onResize?.(w, h));
  }

  update(progress, time, dt, mouse) {
    const fade = 0.025; // soft overlap window between scenes (out of 1.0)
    for (const { inst, range } of this.entries) {
      const [s, e] = range;
      const span = (e - s);
      const local = (progress - s) / span;

      // soft alpha: ramps in over [s-fade .. s+fade], fades out over [e-fade .. e+fade]
      let alpha = 0;
      if (progress > s - fade && progress < e + fade) {
        const inAlpha  = smoothstep(s - fade, s + fade, progress);
        const outAlpha = 1.0 - smoothstep(e - fade, e + fade, progress);
        alpha = Math.min(inAlpha, outAlpha);
      }
      const visible = alpha > 0.001;
      inst.group.visible = visible;
      if (visible) {
        inst.setOpacity?.(alpha);
        inst.update?.(time, dt, Math.max(0, Math.min(1, local)), mouse, alpha);
      }
    }
  }
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
