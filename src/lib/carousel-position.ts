export function carouselPositions(track: HTMLElement, cards = [...track.querySelectorAll<HTMLElement>('[data-category-card]')]) {
  const origin = cards[0]?.offsetLeft ?? 0;
  const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
  return cards.map((card) => Math.max(0, Math.min(maximum, card.offsetLeft - origin)));
}

export function carouselIndex(track: HTMLElement, positions = carouselPositions(track)) {
  if (track.scrollWidth <= track.clientWidth + 1 || !positions.length) return 0;
  if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 1) return positions.length - 1;
  return positions.reduce((closest, value, index) => Math.abs(value - track.scrollLeft) < Math.abs((positions[closest] ?? 0) - track.scrollLeft) ? index : closest, 0);
}
