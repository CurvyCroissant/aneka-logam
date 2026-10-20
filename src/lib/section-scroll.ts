export function scrollToSection(target: HTMLElement, behavior: ScrollBehavior = 'instant') {
  const header = document.querySelector<HTMLElement>('.site-header');
  const inset = header && getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - inset;
  window.scrollTo({ left: window.scrollX, top: Math.max(0, top), behavior });
}
