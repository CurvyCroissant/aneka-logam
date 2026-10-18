import { existsSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Node's built-in loader preserves values already supplied by CI/Cloudflare.
const envFile = fileURLToPath(new URL('./.env', import.meta.url));
if (existsSync(envFile)) loadEnvFile(envFile);

const rawSite = process.env.SITE_URL?.trim();
const indexableSetting = process.env.SITE_INDEXABLE?.trim() || 'false';
if (!['true', 'false'].includes(indexableSetting)) {
  throw new Error('SITE_INDEXABLE must be true or false.');
}

let site;
if (rawSite) {
  const url = new URL(rawSite);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('SITE_URL must be an HTTPS origin without credentials, a path, a query, or a fragment.');
  }
  site = url.origin;
}

if (indexableSetting === 'true' && !site) {
  throw new Error('Set SITE_URL before enabling search indexing.');
}

export default defineConfig({
  output: 'static',
  site,
  trailingSlash: 'always',
  integrations: [
    ...(site && indexableSetting === 'true' ? [sitemap()] : []),
    {
      name: 'prelaunch-indexing',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          if (indexableSetting !== 'true') {
            await appendFile(
              new URL('_headers', dir),
              '\n/*\n  X-Robots-Tag: noindex, nofollow\n',
            );
          }
        },
      },
    },
  ],
  build: {
    format: 'directory',
    inlineStylesheets: 'never',
  },
  devToolbar: { enabled: false },
});
