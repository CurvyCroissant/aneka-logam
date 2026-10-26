export function setupGalleries() {
  for (const gallery of document.querySelectorAll<HTMLElement>('[data-gallery]')) {
    const track = gallery.querySelector<HTMLElement>('[data-gallery-track]');
    const controls = gallery.querySelector<HTMLElement>('[data-gallery-controls]');
    if (!track || !controls) continue;
    const slides = [...track.querySelectorAll<HTMLElement>('.gallery-slide')];
    const previous = controls.querySelector<HTMLButtonElement>('[data-gallery-step="-1"]');
    const next = controls.querySelector<HTMLButtonElement>('[data-gallery-step="1"]');
    const counter = controls.querySelector<HTMLOutputElement>('[data-gallery-counter]');
    let current = -1;
    let pending = false;
    function update() {
      pending = false;
      if (!track) return;
      const index = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
      if (index === current) return;
      current = index;
      if (previous) previous.disabled = index === 0;
      if (next) next.disabled = index === slides.length - 1;
      if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
    }
    function step(direction: number) {
      const target = slides[Math.max(0, Math.min(slides.length - 1, current + direction))];
      if (track && target) track.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
    }
    previous?.addEventListener('click', () => step(-1));
    next?.addEventListener('click', () => step(1));
    track.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1); }
    });
    track.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
    try { if ('ResizeObserver' in window) new ResizeObserver(update).observe(track); } catch { /* Native scrolling still works. */ }
    window.addEventListener('resize', update, { passive: true });
    controls.hidden = false;
    update();
  }
}
