import type { APIRoute } from 'astro';
import { indexingEnabled } from '../config/site';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const content = indexingEnabled && site
    ? `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`
    : 'User-agent: *\nDisallow: /\n';

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
