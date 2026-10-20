import { readdir, readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { parse } from 'parse5';
import { catalog } from '../src/i18n/catalog.ts';

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
let fontBytes = 0;
let imageBytes = 0;

for (const file of files) {
  const bytes = await readFile(file);
  const name = relative(root, file).split(sep).join('/');
  if (name.endsWith('.css')) cssBytes += gzipSync(bytes).length;
  if (name.endsWith('.js') || name.endsWith('.mjs')) scriptBytes += gzipSync(bytes).length;
  if (/\.(woff2?|ttf|otf)$/.test(name)) fontBytes += bytes.length;
  if (/\.(webp|avif|png|jpe?g)$/.test(name)) imageBytes += bytes.length;
  if (/\.(webp|avif|png|jpe?g)$/.test(name)) requireThat(bytes.length <= 300 * 1024, `${name}: optimize photographs below 300 KiB per variant.`);
  requireThat(bytes.length <= 25 * 1024 * 1024, `${name}: exceeds Cloudflare's individual asset limit.`);
  if (!name.endsWith('.html')) continue;

  maxHtmlBytes = Math.max(maxHtmlBytes, gzipSync(bytes).length);
  const nodes = elements(parse(bytes.toString()));
  const ids = nodes.map((node) => attr(node, 'id')).filter(Boolean);
  const title = nodes.find((node) => node.tagName === 'title');
  const pageTitle = title ? text(title).trim() : '';
  const language = attr(nodes.find((node) => node.tagName === 'html'), 'lang');
  const titleKey = `${language}:${pageTitle}`;
  requireThat(['id', 'en'].includes(language), `${name}: document language is missing or unsupported.`);
  requireThat(Boolean(pageTitle) && !titles.has(titleKey), `${name}: page title is missing or duplicated in its language.`);
  titles.add(titleKey);
  requireThat(nodes.filter((node) => node.tagName === 'h1').length === 1, `${name}: needs exactly one h1.`);
  requireThat(nodes.filter((node) => node.tagName === 'main').length === 1, `${name}: needs exactly one main landmark.`);
  requireThat(new Set(ids).size === ids.length, `${name}: duplicate element IDs.`);
  requireThat(ids.includes('main'), `${name}: skip-link destination is missing.`);
  const controls = nodes.filter((node) => ['a', 'button', 'summary'].includes(node.tagName));
  requireThat(attr(controls[0], 'class')?.includes('logo-mark'), `${name}: the header logo must be the first interactive control.`);
  requireThat(attr(controls[1], 'class') === 'skip-link', `${name}: keep a skip-to-content control immediately after the logo.`);
  for (const control of controls) {
    requireThat(attr(control, 'tabindex') === '0', `${name}: every native control must remain in document-order keyboard navigation.`);
    requireThat(Boolean(attr(control, 'aria-label')?.trim() || text(control).trim()), `${name}: every control needs an accessible name.`);
    requireThat(!elements(control).slice(1).some((child) => ['a', 'button', 'summary'].includes(child.tagName)), `${name}: interactive controls must not be nested.`);
  }
  requireThat(!nodes.some((node) => Number(attr(node, 'tabindex')) > 0 || attr(node, 'autofocus') !== undefined), `${name}: do not reorder tab stops or steal focus on load.`);
  const viewport = nodes.find((node) => attr(node, 'name') === 'viewport');
  const viewportContent = viewport ? attr(viewport, 'content') ?? '' : '';
  requireThat(viewportContent.includes('width=device-width') && !/maximum-scale|user-scalable\s*=\s*no/.test(viewportContent), `${name}: viewport must support resizing and zoom.`);
  requireThat(nodes.some((node) => attr(node, 'name') === 'description' && attr(node, 'content')?.trim()), `${name}: description is missing.`);
  requireThat(!nodes.some((node) => node.tagName === 'style' || attr(node, 'style') !== undefined), `${name}: inline CSS conflicts with the Content Security Policy.`);
  requireThat(!nodes.some((node) => node.tagName === 'script' && !attr(node, 'src')), `${name}: inline scripts require an explicit Content Security Policy review.`);
  const head = nodes.find((node) => node.tagName === 'head');
  const startup = elements(head).find((node) => node.tagName === 'script');
  requireThat(Boolean(startup && attr(startup, 'src')?.startsWith('/') && !attr(startup, 'type') && attr(startup, 'defer') === undefined && attr(startup, 'async') === undefined), `${name}: scroll ownership and font masking must start in an external blocking head script.`);
  requireThat(nodes.some((node) => attr(node, 'rel') === 'preload' && attr(node, 'as') === 'font' && attr(node, 'crossorigin') !== undefined), `${name}: preload the self-hosted brand font.`);
  for (const image of nodes.filter((node) => node.tagName === 'img')) {
    requireThat(attr(image, 'alt') !== undefined && Boolean(attr(image, 'width')) && Boolean(attr(image, 'height')), `${name}: images need alt text and explicit dimensions.`);
    let trigger = image.parentNode;
    while (trigger && attr(trigger, 'data-image-trigger') === undefined) trigger = trigger.parentNode;
    requireThat(Boolean(trigger), `${name}: every content image must open in the image viewer.`);
    requireThat(Boolean(trigger && attr(trigger, 'data-image-loader') !== undefined && elements(trigger).some((node) => attr(node, 'class') === 'image-skeleton')), `${name}: image loaders need a reserved skeleton.`);
    requireThat(attr(image, 'loading') === (attr(trigger, 'class')?.includes('logo-mark') ? 'eager' : 'lazy'), `${name}: only the small header logo should load eagerly.`);
  }
  const viewer = nodes.find((node) => node.tagName === 'dialog' && attr(node, 'id') === 'image-viewer');
  requireThat(Boolean(viewer && attr(viewer, 'aria-label') && attr(viewer, 'aria-describedby')), `${name}: image viewer needs an accessible name and dismissal instructions.`);
  requireThat(Boolean(viewer) && !elements(viewer).some((node) => ['button', 'a', 'nav'].includes(node.tagName)), `${name}: keep the image viewer free of visible controls.`);
  for (const trigger of nodes.filter((node) => attr(node, 'data-image-trigger') !== undefined)) {
    requireThat(attr(trigger, 'aria-controls') === 'image-viewer' && attr(trigger, 'aria-haspopup') === 'dialog', `${name}: image triggers must identify the viewer.`);
  }
  pages.set(file, { name, nodes, ids: new Set(ids) });
}

requireThat(pages.size === 4, 'Generate only the two main language pages and their localized 404 pages.');
requireThat(!files.some((file) => file.includes(`${sep}_worker.js`)), 'The company profile must remain static.');
const robots = await readFile(resolve(root, 'robots.txt'), 'utf8');
const indexable = !/^Disallow:\s*\/\s*$/m.test(robots);
if (indexable) {
  for (const name of ['index.html', 'en/index.html']) {
    requireThat(pages.get(resolve(root, name))?.ids.has('contact'), `${name}: configure official contacts before enabling indexing.`);
  }
}

for (const [file, { name, nodes }] of pages) {
  const route = '/' + name.replace(/index\.html$/, '');
  const language = attr(nodes.find((node) => node.tagName === 'html'), 'lang');
  const errorPage = name === '404.html' || name.endsWith('/404.html');
  const switcher = nodes.find((node) => node.tagName === 'nav' && attr(node, 'class')?.includes('language-switch'));
  const switches = switcher ? elements(switcher).filter((node) => node.tagName === 'a') : [];
  requireThat(switches.length === 2, `${name}: both language options must be available without JavaScript.`);
  for (const locale of ['id', 'en']) {
    const link = switches.find((node) => attr(node, 'hreflang') === locale);
    requireThat(Boolean(link), `${name}: missing ${locale} language switch.`);
    if (link && !errorPage && locale === language) {
      requireThat(attr(link, 'href') === route && attr(link, 'aria-current') === 'true', `${name}: language switch lost the current page.`);
    }
    if (link && !errorPage) {
      const target = pages.get(resolve(root, '.' + attr(link, 'href'), 'index.html'));
      const counterpart = target?.nodes.find((node) => node.tagName === 'nav' && attr(node, 'class')?.includes('language-switch'));
      const back = counterpart && elements(counterpart).find((node) => node.tagName === 'a' && attr(node, 'hreflang') === language);
      requireThat(Boolean(back && attr(back, 'href') === route), `${name}: language links must return to the equivalent page.`);
    }
  }
  const primaryNav = nodes.find((node) => node.tagName === 'nav' && attr(node, 'class') === 'primary-navigation');
  if (primaryNav) {
    requireThat(elements(primaryNav).filter((node) => node.tagName === 'a').map((node) => text(node).trim()).join(',') === 'Home,Products,Contact', `${name}: keep the navigation labels in English.`);
    for (const link of elements(primaryNav).filter((node) => node.tagName === 'a')) {
      const target = new URL(attr(link, 'href'), `https://build.invalid${route}`);
      const englishLink = target.pathname.startsWith('/en/');
      requireThat(language === 'en' ? englishLink : !englishLink, `${name}: primary navigation changed the selected language.`);
      requireThat(['#home', '#products', '#contact'].includes(target.hash), `${name}: navigation must point to a main-page section.`);
    }
  }
  const phrase = 'Spring, Steel, Carbon Steel Strip, Shim Plate, SUS, Wire Spring';
  if (!errorPage) {
    const dictionary = catalog(language);
    for (const node of nodes) {
      for (const [binding, attribute] of [['data-i18n', null], ['data-i18n-aria-label', 'aria-label'], ['data-i18n-content', 'content']]) {
        const key = attr(node, binding);
        if (key === undefined) continue;
        const value = attribute ? attr(node, attribute) : text(node);
        requireThat(dictionary[key] !== undefined && value === dictionary[key], `${name}: ${binding}="${key}" must match the static translation.`);
        if (!attribute) requireThat(!(node.childNodes ?? []).some((child) => child.tagName), `${name}: replacing ${key} must not remove icons or other elements.`);
      }
    }
    requireThat(nodes.filter((node) => node.tagName === 'p' && attr(node, 'lang') === 'en' && text(node).trim() === phrase).length === 1, `${name}: show the exact English phrase once.`);
    for (const id of ['home', 'products', 'contact']) requireThat(pages.get(file).ids.has(id), `${name}: missing ${id} section.`);
    const bodyText = text(nodes.find((node) => node.tagName === 'body'));
    requireThat((bodyText.match(/Pertokoan Glodok Metro/g) ?? []).length === 1 && (bodyText.match(/Kota Jakarta Barat/g) ?? []).length === 1 && !bodyText.includes('Jakarta Pusat'), `${name}: keep the updated location in the address only.`);
    const address = nodes.find((node) => attr(node, 'class') === 'address-lines');
    requireThat(address && (address.childNodes ?? []).filter((node) => node.tagName === 'span').map(text).join('|') === 'Pertokoan Glodok Metro|Lantai Dasar No. 71|Jl. Blustru, RT.01/RW.06|Kec. Taman Sari, Kota Jakarta Barat|DKI Jakarta 11180', `${name}: preserve all five supplied address lines.`);
    requireThat(nodes.some((node) => attr(node, 'class') === 'address-action' && attr(node, 'href') === 'https://maps.app.goo.gl/E5ESBkS3XxmUQYEx9'), `${name}: the address itself must open the confirmed map.`);
    for (const [id, label] of [['products-heading', 'Products'], ['contact-heading', 'Contact']]) requireThat(nodes.some((node) => attr(node, 'id') === id && attr(node, 'lang') === 'en' && text(node) === label), `${name}: section titles must match their English navigation labels.`);
    requireThat(!bodyText.includes('SUKU CADANG MESIN INDUSTRI') && !bodyText.includes('Seluler') && !bodyText.includes('Telepon toko'), `${name}: obsolete labels must not return.`);
    const copies = nodes.filter((node) => node.tagName === 'button' && attr(node, 'data-copy'));
    requireThat(copies.length === 4, `${name}: phone and email copy actions must work in the contact section and footer.`);
    requireThat(nodes.filter((node) => attr(node, 'href') === 'https://wa.me/6281386303535').length === 2, `${name}: use the confirmed WhatsApp number in the contact section and footer.`);
  }
  const footer = nodes.find((node) => node.tagName === 'footer');
  requireThat(Boolean(footer) && !elements(footer).some((node) => ['address', 'h1', 'h2', 'h3'].includes(node.tagName)), `${name}: do not repeat the address or brand pitch in the footer.`);
  const footerNav = footer && elements(footer).find((node) => node.tagName === 'nav');
  requireThat(Boolean(footerNav) && elements(footerNav).filter((node) => node.tagName === 'a').length === 3, `${name}: footer needs the three section links.`);
  if (!errorPage) {
    const ownerList = nodes.find((node) => attr(node, 'class') === 'owner-list');
    const owners = ownerList ? elements(ownerList).filter((node) => node.tagName === 'li') : [];
    requireThat(owners.map((node) => text(node).trim()).join(',') === 'Budiyanto,Delinah', `${name}: show each owner on a separate row.`);
    requireThat(nodes.some((node) => node.tagName === 'h3' && text(node).trim() === (language === 'id' ? 'Pemilik' : 'Owners')), `${name}: use the confirmed owner heading.`);
    requireThat(nodes.filter((node) => attr(node, 'data-gallery') !== undefined).length === 3, `${name}: keep media areas for both products and the storefront.`);
    requireThat(nodes.some((node) => attr(node, 'href') === 'https://maps.app.goo.gl/E5ESBkS3XxmUQYEx9'), `${name}: use the owner's exact map location.`);
  }
  const robotsMeta = nodes.find((node) => attr(node, 'name') === 'robots');
  if (!indexable || name === '404.html' || name.endsWith('/404.html')) {
    requireThat(Boolean(robotsMeta && attr(robotsMeta, 'content')?.includes('noindex')), `${name}: prelaunch/error pages must remain noindex.`);
  } else {
    requireThat(nodes.some((node) => attr(node, 'rel') === 'canonical' && attr(node, 'href')?.startsWith('https://')), `${name}: indexable pages need a canonical URL.`);
    for (const locale of ['id', 'en', 'x-default']) {
      requireThat(nodes.some((node) => attr(node, 'rel') === 'alternate' && attr(node, 'hreflang') === locale && attr(node, 'href')?.startsWith('https://')), `${name}: missing ${locale} alternate-language metadata.`);
    }
  }
  for (const node of nodes) {
    const isLink = node.tagName === 'a';
    const resource = ['script', 'img'].includes(node.tagName) || (node.tagName === 'link' && ['stylesheet', 'icon', 'preload'].includes(attr(node, 'rel')));
    if (!isLink && !resource) continue;
    const href = attr(node, isLink || node.tagName === 'link' ? 'href' : 'src');
    requireThat(Boolean(href) && href !== '#', `${name}: empty link or resource.`);
    if (!href) continue;
    const url = new URL(href, `https://build.invalid${route}`);
    if (isLink && ['mailto:', 'tel:'].includes(url.protocol)) continue;
    if (isLink && url.origin !== 'https://build.invalid') {
      requireThat(attr(node, 'target') === '_blank' && attr(node, 'rel')?.split(/\s+/).includes('noopener'), `${name}: external links must open a safe new tab (${href}).`);
    }
    if (isLink && url.origin === 'https://build.invalid') requireThat(!attr(node, 'target'), `${name}: internal links must stay in the current tab (${href}).`);
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

// Older deep links must reach the corresponding section after consolidation.
const redirects = (await readFile(resolve(root, '_redirects'), 'utf8')).trim().split('\n');
const sources = new Set();
for (const line of redirects) {
  const [source, destination, status] = line.trim().split(/\s+/);
  requireThat(!sources.has(source) && status === '301', `Invalid or duplicate redirect: ${line}`);
  sources.add(source);
  const target = new URL(destination, 'https://build.invalid');
  const page = pages.get(resolve(root, '.' + target.pathname, 'index.html'));
  requireThat(Boolean(page?.ids.has(target.hash.slice(1))), `Redirect must target an existing section: ${line}`);
}

// Conservative compressed-size ceilings. These are budgets, not load-time claims.
requireThat(cssBytes <= 12 * 1024, 'Total CSS exceeds the 12 KiB gzip budget.');
requireThat(scriptBytes <= 20 * 1024, 'Total JavaScript exceeds the 20 KiB gzip budget.');
requireThat(maxHtmlBytes <= 12 * 1024, 'A page exceeds the 12 KiB gzip HTML budget.');
requireThat(fontBytes <= 40 * 1024, 'Fonts exceed the 40 KiB asset budget.');
requireThat(imageBytes <= 2 * 1024 * 1024, 'Responsive logo and photograph variants exceed the 2 MiB image budget.');
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Verified ${pages.size} HTML pages: local links, landmarks, metadata, and asset budgets.`);
console.log(`Gzip sizes: CSS ${cssBytes} bytes; JavaScript ${scriptBytes} bytes; largest HTML ${maxHtmlBytes} bytes.`);
console.log(`Local assets: fonts ${fontBytes} bytes; optimized image variants ${imageBytes} bytes.`);
