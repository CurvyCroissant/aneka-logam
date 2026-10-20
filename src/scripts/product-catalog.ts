import { fragmentId } from '../lib/scroll-memory.ts';
import { motionTiming } from '../lib/motion.ts';

export interface ProductCatalog {
  current(): string;
  select(category: string, animate?: boolean): void;
  categoryForFragment(fragment: string): string | undefined;
}

export function setupProductCatalog(motion: MediaQueryList): ProductCatalog | undefined {
  const catalog = document.querySelector<HTMLElement>('[data-product-catalog]');
  const list = catalog?.querySelector<HTMLElement>('[data-product-list]');
  const controls = catalog?.querySelector<HTMLElement>('[data-product-filters]');
  if (!catalog || !list || !controls) return;
  const cards = [...list.querySelectorAll<HTMLElement>('[data-product-category]')];
  const buttons = [...controls.querySelectorAll<HTMLButtonElement>('[data-product-filter]')];
  const categories = new Set(buttons.map((button) => button.dataset.productFilter));
  let selected = 'all';
  let animation: Animation | undefined;

  function categoryForFragment(fragment: string) {
    const legacy = ({ 'plates-strips': 'shim-plate', springs: 'per', spring: 'per' } as Record<string, string>)[fragment];
    const category = legacy ?? fragment;
    return categories.has(category) ? category : cards.find((card) => card.id === category)?.dataset.productCategory;
  }
  function select(category: string, animate = false) {
    const next = categories.has(category) ? category : 'all';
    const changed = next !== selected;
    selected = next;
    animation?.cancel();
    for (const card of cards) card.hidden = next !== 'all' && card.dataset.productCategory !== next;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.productFilter === next));
    for (const link of document.querySelectorAll<HTMLElement>('[data-category-destination]')) {
      if (link.dataset.categoryDestination === next) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    catalog!.dataset.category = next;
    if (animate && changed && typeof list!.animate === 'function') {
      try {
        animation = list!.animate(motion.matches ? [{ opacity: 0.3 }, { opacity: 1 }] : [{ opacity: 0.3, translate: '0 18px' }, { opacity: 1, translate: '0 0' }], motionTiming('move', motion));
      } catch { /* Filtering remains immediate when animation is unavailable. */ }
    }
  }
  select(categoryForFragment(fragmentId(location.hash)) ?? 'all');
  controls.hidden = false;
  for (const button of buttons) button.addEventListener('click', () => {
    if (button.dataset.productFilter === selected) return;
    document.dispatchEvent(new Event('aneka:before-navigation'));
    select(button.dataset.productFilter ?? 'all', true);
    document.dispatchEvent(new Event('aneka:catalog-change'));
  });
  return { current: () => selected, select, categoryForFragment };
}
