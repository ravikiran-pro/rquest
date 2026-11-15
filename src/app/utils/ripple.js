/**
 * Touch / press ripple for buttons and opt-in elements.
 * One delegated listener handles every match, so components need no changes.
 * Opt in any element with the `rq-ripple-target` class.
 * Text fields are not targeted: they show focus with a ring instead.
 */
const TARGET = '.ant-btn, .rq-ripple-target';

export function initTouchRipple() {
  if (typeof document === 'undefined' || window.__rqRippleBound) return;
  window.__rqRippleBound = true;

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button > 0) return; // ignore right / middle click
      const host = event.target instanceof Element ? event.target.closest(TARGET) : null;
      if (!host || host.matches(':disabled') || host.getAttribute('aria-disabled') === 'true') return;

      host.classList.add('rq-ripple-host');

      const rect = host.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const ripple = document.createElement('span');
      ripple.className = host.classList.contains('ant-btn-primary')
        ? 'rq-ripple rq-ripple--light'
        : 'rq-ripple';
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

      ripple.addEventListener('animationend', () => ripple.remove());
      host.appendChild(ripple);
    },
    { passive: true }
  );
}

export default initTouchRipple;
