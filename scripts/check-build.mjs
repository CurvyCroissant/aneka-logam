import { readdir, readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { parse } from 'parse5';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const errors = [];
const requireThat = (condition, message) => { if (!condition) errors.push(message); };

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  }));
  return groups.flat();
}

function elements(node) {
  return [
    ...(node.tagName ? [node] : []),
    ...(node.childNodes ?? []).flatMap(elements),
  ];
}

const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const text = (node) => (node.value ?? '') + (node.childNodes ?? []).map(text).join('');
const files = await filesIn(root);
const pages = new Map();
const titles = new Set();
let cssBytes = 0;
let scriptBytes = 0;
let maxHtmlBytes = 0;

for (const file of files) {
  const bytes = await readFile(file);
  const name = relative(root, file).split(sep).join('/');
  if (name.endsWith('.css')) cssBytes += gzipSync(bytes).length;
  if (name.endsWith('.js') || name.endsWith('.mjs')) scriptBytes += gzipSync(bytes).length;
  requireThat(bytes.length <= 25 * 1024 * 1024, `${name}: exceeds Cloudflare's individual asset limit.`);
  if (!name.endsWith('.html')) continue;

  maxHtmlBytes = Math.max(maxHtmlBytes, gzipSync(bytes).length);
  const nodes = elements(parse(bytes.toString()));
  const ids = nodes.map((node) => attr(node, 'id')).filter(Boolean);
  const title = nodes.find((node) => node.tagName === 'title');
  const pageTitle = title ? text(title).trim() : '';
  requireThat(Boolean(pageTitle) && !titles.has(pageTitle), `${name}: page title is missing or duplicated.`);
  titles.add(pageTitle);
  requireThat(nodes.filter((node) => node.tagName === 'h1').length === 1, `${name}: needs exactly one h1.`);
  requireThat(nodes.filter((node) => node.tagName === 'main').length === 1, `${name}: needs exactly one main landmark.`);
  requireThat(new Set(ids).size === ids.length, `${name}: duplicate element IDs.`);
  requireThat(ids.includes('main'), `${name}: skip-link destination is missing.`);
  const viewport = nodes.find((node) => attr(node, 'name') === 'viewport');
  const viewportContent = viewport ? attr(viewport, 'content') ?? '' : '';
  requireThat(viewportContent.includes('width=device-width') && !/maximum-scale|user-scalable\s*=\s*no/.test(viewportContent), `${name}: viewport must support resizing and zoom.`);
  requireThat(nodes.some((node) => attr(node, 'name') === 'description' && attr(node, 'content')?.trim()), `${name}: description is missing.`);
  requireThat(!nodes.some((node) => node.tagName === 'style' || attr(node, 'style') !== undefined), `${name}: inline CSS conflicts with the Content Security Policy.`);
  requireThat(!nodes.some((node) => node.tagName === 'script' && !attr(node, 'src')), `${name}: inline scripts require an explicit Content Security Policy review.`);
  for (const image of nodes.filter((node) => node.tagName === 'img')) {
    requireThat(attr(image, 'alt') !== undefined && Boolean(attr(image, 'width')) && Boolean(attr(image, 'height')), `${name}: images need alt text and explicit dimensions.`);
  }
  pages.set(file, { name, nodes, ids: new Set(ids) });
}

requireThat(pages.size > 0, 'No static HTML pages were generated.');
requireThat(!files.some((file) => file.includes(`${sep}_worker.js`)), 'The company profile must remain static.');
const robots = await readFile(resolve(root, 'robots.txt'), 'utf8');
const indexable = !/^Disallow:\s*\/\s*$/m.test(robots);
if (indexable) {
  requireThat(pages.has(resolve(root, 'kontak/index.html')), 'Configure official contacts before enabling public search indexing.');
}

for (const [file, { name, nodes }] of pages) {
  const route = '/' + name.replace(/index\.html$/, '');
  const robotsMeta = nodes.find((node) => attr(node, 'name') === 'robots');
  if (!indexable || name === '404.html') {
    requireThat(Boolean(robotsMeta && attr(robotsMeta, 'content')?.includes('noindex')), `${name}: prelaunch/error pages must remain noindex.`);
  } else {
    requireThat(nodes.some((node) => attr(node, 'rel') === 'canonical' && attr(node, 'href')?.startsWith('https://')), `${name}: indexable pages need a canonical URL.`);
  }
  for (const node of nodes) {
    const isLink = node.tagName === 'a';
    const resource = ['script', 'img'].includes(node.tagName) || (node.tagName === 'link' && attr(node, 'rel') === 'stylesheet');
    if (!isLink && !resource) continue;
    const href = attr(node, isLink || node.tagName === 'link' ? 'href' : 'src');
    requireThat(Boolean(href) && href !== '#', `${name}: empty link or resource.`);
    if (!href) continue;
    const url = new URL(href, `https://build.invalid${route}`);
    if (isLink && ['mailto:', 'tel:'].includes(url.protocol)) continue;
    requireThat(['https:', 'http:'].includes(url.protocol), `${name}: unsupported URL protocol in ${href}.`);
    if (url.origin !== 'https://build.invalid') {
      requireThat(!resource, `${name}: external assets require an explicit performance/privacy review (${href}).`);
      continue;
    }
    const pathname = decodeURIComponent(url.pathname);
    const target = resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    try {
      requireThat((await stat(target)).isFile(), `${name}: target is not a file (${href}).`);
      if (url.hash && pages.has(target)) {
        requireThat(pages.get(target).ids.has(decodeURIComponent(url.hash.slice(1))), `${name}: broken section link ${href}.`);
      }
    } catch {
      errors.push(`${name}: broken local link or resource ${href}.`);
    }
  }
}

// Conservative compressed-size ceilings. These are budgets, not load-time claims.
requireThat(cssBytes <= 12 * 1024, 'Total CSS exceeds the 12 KiB gzip budget.');
requireThat(scriptBytes <= 20 * 1024, 'Total JavaScript exceeds the 20 KiB gzip budget.');
requireThat(maxHtmlBytes <= 12 * 1024, 'A page exceeds the 12 KiB gzip HTML budget.');
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Verified ${pages.size} HTML pages: local links, landmarks, metadata, and asset budgets.`);
console.log(`Gzip sizes: CSS ${cssBytes} bytes; JavaScript ${scriptBytes} bytes; largest HTML ${maxHtmlBytes} bytes.`);
