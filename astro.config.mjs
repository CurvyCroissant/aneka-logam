import { existsSync } from 'node:fs';
import { appendFile, rename, rm } from 'node:fs/promises';
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
  i18n: {
    defaultLocale: 'id',
    locales: ['id', 'en', 'zh'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    ...(site && indexableSetting === 'true' ? [sitemap({
      filter: (page) => !/\/404(?:\.html|\/)?$/.test(new URL(page).pathname),
    })] : []),
    {
      name: 'prelaunch-indexing',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          // Cloudflare serves the nearest 404.html for each language directory.
          for (const locale of ['en', 'zh']) {
            await rename(new URL(`${locale}/404/index.html`, dir), new URL(`${locale}/404.html`, dir));
            await rm(new URL(`${locale}/404/`, dir), { recursive: true });
          }
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
  server: { allowedHosts: ['terminal.local'] },
  // Keep the small interaction bundle external so it works with script-src 'self'.
  vite: { build: { assetsInlineLimit: 0 } },
  devToolbar: { enabled: false },
});
