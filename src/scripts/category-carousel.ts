import { carouselIndex, carouselPositions } from '../lib/carousel-position.ts';

export function setupCategoryCarousels() {
  for (const carousel of document.querySelectorAll<HTMLElement>('[data-category-carousel]')) {
    if (carousel.dataset.enhanced) continue;
    const track = carousel.dataset.catalogTrack !== undefined ? carousel : carousel.querySelector<HTMLElement>('[data-category-track]');
    const controls = carousel.querySelector<HTMLElement>('[data-category-controls]') ?? document.getElementById(carousel.dataset.categoryControlsId ?? '');
    if (!track || !controls) continue;
    const cards = [...track.querySelectorAll<HTMLElement>('[data-category-card]')];
    const previous = controls.querySelector<HTMLButtonElement>('[data-category-step="-1"]');
    const next = controls.querySelector<HTMLButtonElement>('[data-category-step="1"]');
    const counter = controls.querySelector<HTMLOutputElement>('[data-category-counter]');
    let pending = false;
    function update() {
      pending = false;
      if (!track || !controls) return;
      const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
      controls.hidden = maximum <= 1;
      if (previous) previous.disabled = track.scrollLeft <= 1;
      if (next) next.disabled = track.scrollLeft >= maximum - 1;
      if (counter) counter.textContent = `${carouselIndex(track) + 1} / ${cards.length}`;
    }
    function step(direction: number, focusCard = false) {
      if (!track || !cards.length) return;
      const index = Math.max(0, Math.min(cards.length - 1, carouselIndex(track) + direction));
      if (focusCard) cards[index]?.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true });
      track.scrollTo({ left: carouselPositions(track, cards)[index] ?? 0, behavior: 'smooth' });
    }
    previous?.addEventListener('click', () => step(-1));
    next?.addEventListener('click', () => step(1));
    track.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (track.scrollWidth <= track.clientWidth + 1) return;
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1, true);
    });
    // Native horizontal scrolling only: vertical wheel/touch gestures belong to the page.
    track.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    try { if ('ResizeObserver' in window) new ResizeObserver(update).observe(track); } catch { /* Resize listener and native scrolling remain available. */ }
    carousel.dataset.enhanced = 'true';
    update();
  }
}
