/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_URL?: string;
  readonly SITE_INDEXABLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
