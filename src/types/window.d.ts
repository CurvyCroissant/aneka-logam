import type { ScrollSnapshot } from '../lib/scroll-memory';
declare global {
  interface Window {
    __anekaBoot?: { snapshot?: ScrollSnapshot; restoring: boolean; completed: boolean; whenEntering?(): Promise<unknown>; startEntrance?(): void; finish(): void };
  }
}
