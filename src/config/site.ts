// These values are evaluated at build time; there is no server process.
export const indexingEnabled = import.meta.env.SITE_INDEXABLE?.trim() === 'true';
