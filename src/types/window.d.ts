import type { ScrollSnapshot } from '../lib/scroll-memory';
declare global {
  interface Window {
    __anekaBoot?: { snapshot?: ScrollSnapshot; restoring: boolean; completed: boolean; finish(): void };
  }
}
