export function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  // Skip the custom cursor entirely on touch devices (avoids extra rAF + listeners)
  if (matchMedia('(hover: none), (pointer: coarse)').matches) {
    cursor.style.display = 'none';
    return;
  }

  let tx = 0, ty = 0, x = 0, y = 0;

  window.addEventListener('mousemove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
  });

  function loop() {
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    cursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  }
  loop();

  document.querySelectorAll('[data-hover]').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
  });
}

export function initFullscreen() {
  const btn = document.getElementById('fsBtn');

  async function toggle() {
    if (!document.fullscreenElement) {
      try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); }
      catch (e) { /* user may have denied */ }
    } else {
      try { await document.exitFullscreen(); } catch (e) { /* ignore */ }
    }
  }

  btn?.addEventListener('click', toggle);

  // F to toggle, Esc browser-handled
  window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      // ignore when typing in inputs
      if (e.target.matches?.('input, textarea')) return;
      e.preventDefault();
      toggle();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    document.body.classList.toggle('is-fullscreen', !!document.fullscreenElement);
  });
}
