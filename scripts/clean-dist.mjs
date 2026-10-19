import { rm } from 'node:fs/promises';

// Remove only generated output so repeated builds cannot retain obsolete assets/routes.
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
