export interface ScrollSnapshot {
  version: 1;
  url: string;
  x: number;
  y: number;
  details: string[];
  galleries: Record<string, number>;
}

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem'>;

export function readScrollSnapshot(storage: StorageReader | undefined, key: string): ScrollSnapshot | undefined {
  try { return parseScrollSnapshot(JSON.parse(storage?.getItem(key) ?? 'null')); } catch { return; }
}

export function parseScrollSnapshot(input: unknown): ScrollSnapshot | undefined {
  try {
    if (!input || typeof input !== 'object') return;
    const value = input as Partial<ScrollSnapshot>;
    if (!value || value.version !== 1 || typeof value.url !== 'string') return;
    if (![value.x, value.y].every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)) return;
    if (!Array.isArray(value.details) || !value.details.every((id: unknown) => typeof id === 'string')) return;
    if (!value.galleries || typeof value.galleries !== 'object' || Array.isArray(value.galleries)) return;
    if (!Object.values(value.galleries).every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0)) return;
    return value as ScrollSnapshot;
  } catch { return; }
}

export function saveScrollSnapshot(storage: StorageWriter | undefined, key: string, snapshot: ScrollSnapshot): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(snapshot));
    return true;
  } catch { return false; }
}

export function shouldRestoreScroll(snapshot: ScrollSnapshot | undefined, url: string, navigationType: string): boolean {
  return Boolean(snapshot && snapshot.url === url && ['reload', 'back_forward'].includes(navigationType));
}

export function clampScroll(value: number, maximum: number): number {
  return Math.max(0, Math.min(value, Math.max(0, maximum)));
}

export function fragmentId(hash: string): string {
  try { return decodeURIComponent(hash.slice(1)); } catch { return ''; }
}
