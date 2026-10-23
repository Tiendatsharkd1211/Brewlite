// Hiệu ứng "bay vào giỏ": nhân bản ảnh món, cho bay theo đường cong tới icon giỏ hàng trên header.
export const CART_BUMP_EVENT = 'brewlite:cart-bump';

function bump() {
  window.dispatchEvent(new CustomEvent(CART_BUMP_EVENT));
}

export function flyToCart(source: HTMLElement | null) {
  if (typeof window === 'undefined') return;
  const target = document.querySelector<HTMLElement>('[data-cart-target]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!source || !target || reduced) {
    bump();
    return;
  }
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) {
    bump();
    return;
  }

  const clone = source.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    zIndex: '100',
    pointerEvents: 'none',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 24px 48px -12px rgba(59,42,32,.45)',
  });
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = clone.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '24px' },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 90}px) scale(0.45)`, opacity: 0.95, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.06)`, opacity: 0.3, borderRadius: '999px' },
    ],
    { duration: 800, easing: 'cubic-bezier(.55,0,.4,1)' },
  );
  animation.onfinish = () => {
    clone.remove();
    bump();
  };
}
