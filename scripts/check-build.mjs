import { readdir, readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { parse } from 'parse5';
import { catalog } from '../src/i18n/catalog.ts';
import { company } from '../src/config/company.ts';
import { pagePath, categoryPath, locales, localeInfo, localeFromTag } from '../src/i18n/routes.ts';

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
  const languageTag = attr(nodes.find((node) => node.tagName === 'html'), 'lang');
  const language = localeFromTag(languageTag);
  const titleKey = `${language}:${pageTitle}`;
  requireThat(locales.some((locale) => localeInfo[locale].tag === languageTag), `${name}: document language is missing or unsupported.`);
  requireThat(Boolean(pageTitle) && !titles.has(titleKey), `${name}: page title is missing or duplicated in its language.`);
  titles.add(titleKey);
  requireThat(nodes.filter((node) => node.tagName === 'h1').length === 1, `${name}: needs exactly one h1.`);
  requireThat(nodes.filter((node) => node.tagName === 'main').length === 1, `${name}: needs exactly one main landmark.`);
  requireThat(new Set(ids).size === ids.length, `${name}: duplicate element IDs.`);
  requireThat(ids.includes('main'), `${name}: main content landmark is missing.`);
  const controls = nodes.filter((node) => ['a', 'button', 'summary'].includes(node.tagName));
  const brand = controls[0];
  requireThat(brand?.tagName === 'a' && attr(brand, 'data-brand-link') !== undefined && elements(brand).some((node) => node.tagName === 'img') && elements(brand).some((node) => attr(node, 'class') === 'brand-name' && text(node) === company.displayName), `${name}: the logo and company name must form the first, single Home control.`);
  requireThat(!nodes.some((node) => attr(node, 'class') === 'skip-link'), `${name}: the owner removed the skip-link popup.`);
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
    requireThat(attr(image, 'draggable') === 'false', `${name}: image dragging must not interfere with viewer activation.`);
    requireThat(attr(image, 'alt') !== undefined && Boolean(attr(image, 'width')) && Boolean(attr(image, 'height')), `${name}: images need alt text and explicit dimensions.`);
    let ancestor = image.parentNode, loader, action;
    while (ancestor) {
      if (attr(ancestor, 'data-image-loader') !== undefined) loader = ancestor;
      if (attr(ancestor, 'data-image-trigger') !== undefined || attr(ancestor, 'data-brand-link') !== undefined) action = ancestor;
      ancestor = ancestor.parentNode;
    }
    const brandImage = action && attr(action, 'data-brand-link') !== undefined;
    requireThat(Boolean(action), `${name}: content images need a viewer trigger; the header logo belongs to the unified Home link.`);
    requireThat(Boolean(loader && elements(loader).some((node) => attr(node, 'class') === 'image-skeleton')), `${name}: image loaders need a reserved skeleton.`);
    requireThat(attr(image, 'loading') === (brandImage ? 'eager' : 'lazy'), `${name}: only the small header logo should load eagerly.`);
    if (brandImage) requireThat(attr(image, 'alt') === '', `${name}: the brand link already names the decorative header logo.`);
  }
  for (const error of nodes.filter((node) => attr(node, 'class') === 'image-error')) requireThat(attr(error, 'hidden') !== undefined, `${name}: image errors must stay hidden until a confirmed loading failure.`);
  const viewer = nodes.find((node) => node.tagName === 'dialog' && attr(node, 'id') === 'image-viewer');
  requireThat(Boolean(viewer && attr(viewer, 'aria-label') && attr(viewer, 'aria-describedby')), `${name}: image viewer needs an accessible name and dismissal instructions.`);
  requireThat(Boolean(viewer) && !elements(viewer).some((node) => ['button', 'a', 'nav'].includes(node.tagName)), `${name}: keep the image viewer free of visible controls.`);
  for (const trigger of nodes.filter((node) => attr(node, 'data-image-trigger') !== undefined)) {
    requireThat(attr(trigger, 'aria-controls') === 'image-viewer' && attr(trigger, 'aria-haspopup') === 'dialog', `${name}: image triggers must identify the viewer.`);
  }
  pages.set(file, { name, nodes, ids: new Set(ids) });
}

requireThat(pages.size === locales.length * 3, 'Generate Home, Products, and 404 in every supported language.');
requireThat(!files.some((file) => file.includes(`${sep}_worker.js`)), 'The company profile must remain static.');
const robots = await readFile(resolve(root, 'robots.txt'), 'utf8');
const indexable = !/^Disallow:\s*\/\s*$/m.test(robots);
if (indexable) {
  for (const name of locales.map((locale) => `${locale === 'id' ? '' : locale + '/'}index.html`)) {
    requireThat(pages.get(resolve(root, name))?.ids.has('contact'), `${name}: configure official contacts before enabling indexing.`);
  }
}

for (const [file, { name, nodes }] of pages) {
  const route = '/' + name.replace(/index\.html$/, '');
  const languageTag = attr(nodes.find((node) => node.tagName === 'html'), 'lang');
  const language = localeFromTag(languageTag);
  const errorPage = name === '404.html' || name.endsWith('/404.html');
  const homePage = route === pagePath(language, 'home');
  const productsPage = route === pagePath(language, 'products');
  requireThat(attr(nodes.find((node) => node.tagName === 'html'), 'data-page') === (errorPage ? 'error' : productsPage ? 'products' : 'home'), `${name}: the page identity must match its route.`);
  const switcher = nodes.find((node) => node.tagName === 'nav' && attr(node, 'class')?.includes('language-switch'));
  const switches = switcher ? elements(switcher).filter((node) => node.tagName === 'a') : [];
  requireThat(switches.length === locales.length, `${name}: every language option must be available without JavaScript.`);
  for (const locale of locales) {
    const link = switches.find((node) => attr(node, 'hreflang') === localeInfo[locale].tag);
    requireThat(Boolean(link), `${name}: missing ${locale} language switch.`);
    if (link && !errorPage && locale === language) {
      requireThat(attr(link, 'href') === route && attr(link, 'aria-current') === 'true', `${name}: language switch lost the current page.`);
    }
    if (link && !errorPage) {
      const target = pages.get(resolve(root, '.' + attr(link, 'href'), 'index.html'));
      const counterpart = target?.nodes.find((node) => node.tagName === 'nav' && attr(node, 'class')?.includes('language-switch'));
      const back = counterpart && elements(counterpart).find((node) => node.tagName === 'a' && attr(node, 'hreflang') === localeInfo[language].tag);
      requireThat(Boolean(back && attr(back, 'href') === route), `${name}: language links must return to the equivalent page.`);
    }
  }
  const primaryNav = nodes.find((node) => node.tagName === 'nav' && attr(node, 'class') === 'primary-navigation');
  if (primaryNav) {
    const pageLinks = elements(primaryNav).filter((node) => node.tagName === 'a' && attr(node, 'data-page-link') !== undefined);
    requireThat(pageLinks.map((node) => text(node).trim()).join(',') === 'Home,Products', `${name}: primary navigation must be based on the two pages.`);
    for (const link of pageLinks) requireThat(attr(link, 'href') === pagePath(language, attr(link, 'data-page-link')), `${name}: page navigation must preserve the chosen language.`);
    for (const link of elements(primaryNav).filter((node) => attr(node, 'data-section-destination') !== undefined)) {
      const section = attr(link, 'data-section-destination');
      requireThat(attr(link, 'href') === `${homePage ? '' : pagePath(language, 'home')}#${section}`, `${name}: the Home dropdown must reach its section in the current language.`);
    }
    const homeLink = pageLinks.find((link) => attr(link, 'data-page-link') === 'home');
    requireThat(Boolean(homeLink && attr(homeLink, 'data-dropdown-toggle') !== undefined && elements(homeLink).some((node) => node.tagName === 'svg')), `${name}: Home and its arrow must be one page link and hover target.`);
    requireThat(!elements(primaryNav).some((node) => attr(node, 'id') === 'products-dropdown' || attr(node, 'data-category-destination') !== undefined), `${name}: Products must be a direct page link without a dropdown.`);
  }
  const toggles = nodes.filter((node) => attr(node, 'data-dropdown-toggle') !== undefined);
  requireThat(toggles.length === 2, `${name}: provide dropdown controls for Home and languages only.`);
  for (const toggle of toggles) requireThat(attr(toggle, 'aria-expanded') === 'false' && nodes.some((node) => attr(node, 'id') === attr(toggle, 'aria-controls') && attr(node, 'data-dropdown-panel') !== undefined), `${name}: dropdown controls must identify their collapsed panel.`);
  requireThat(!nodes.some((node) => ['menu', 'menubar', 'menuitem'].includes(attr(node, 'role'))), `${name}: use native navigation links and disclosure buttons rather than application-menu roles.`);
  const phrase = 'Spring, Steel, Carbon Steel Strip, Shim Plate, SUS, Wire Spring';
  if (!errorPage) {
    requireThat(text(nodes.find((node) => node.tagName === 'title')) === (productsPage ? 'Products | Aneka Logam' : 'Aneka Logam'), `${name}: use the title for the current page.`);
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
    requireThat(nodes.filter((node) => node.tagName === 'p' && attr(node, 'lang') === 'en' && text(node).trim() === phrase).length === (homePage ? 1 : 0), `${name}: show the exact English phrase once in the home hero.`);
    requireThat(!nodes.some((node) => node.tagName === 'details'), `${name}: the obsolete product enquiry disclosure must not return.`);
  }
  const bodyText = text(nodes.find((node) => node.tagName === 'body'));
  const addresses = nodes.filter((node) => attr(node, 'class') === 'address-lines');
  requireThat(addresses.length === (homePage ? 2 : 1), `${name}: show the address in the footer and the home contact section.`);
  for (const address of addresses) requireThat((address.childNodes ?? []).filter((node) => node.tagName === 'span').map(text).join('|') === 'Pertokoan Glodok Metro|Lantai Dasar No. 71|Jl. Blustru, RT.01/RW.06|Kec. Taman Sari, Kota Jakarta Barat|DKI Jakarta 11180', `${name}: preserve all five supplied address lines.`);
  requireThat((bodyText.match(/Pertokoan Glodok Metro/g) ?? []).length === addresses.length && !bodyText.includes('Jakarta Pusat'), `${name}: location details belong in the address blocks only.`);
  requireThat(nodes.filter((node) => attr(node, 'class') === 'address-action' && attr(node, 'href') === company.address.mapsUrl).length === addresses.length, `${name}: each address must open the confirmed map.`);
  requireThat(!bodyText.includes('SUKU CADANG MESIN INDUSTRI') && !bodyText.includes('Seluler') && !bodyText.includes('Telepon toko'), `${name}: obsolete labels must not return.`);
  requireThat(nodes.filter((node) => node.tagName === 'button' && attr(node, 'data-copy')).length === (homePage ? 4 : 2), `${name}: each contact group needs phone/email copy actions.`);
  requireThat(nodes.filter((node) => attr(node, 'href') === 'https://wa.me/6281386303535').length === (homePage ? 2 : 1), `${name}: each contact group needs the confirmed WhatsApp number.`);
  const footer = nodes.find((node) => node.tagName === 'footer');
  const header = nodes.find((node) => node.tagName === 'header');
  requireThat(Boolean(header && attr(header, 'data-reveal') !== undefined && footer && attr(footer, 'data-reveal') !== undefined), `${name}: reveal the complete header and footer containers.`);
  requireThat(!elements(footer).some((node) => ['h1', 'h2', 'h3'].includes(node.tagName)), `${name}: footer groups must have no visible column titles.`);
  const footerInner = footer && elements(footer).find((node) => attr(node, 'class') === 'container footer-inner');
  const columns = footerInner?.childNodes.filter((node) => ['nav', 'section'].includes(node.tagName)) ?? [];
  requireThat(columns.map((node) => attr(node, 'class')).join(',') === 'footer-navigation,footer-contact,footer-address', `${name}: footer columns must be Pages, Contact, and Store Address in that order.`);
  const footerNav = footer && elements(footer).find((node) => node.tagName === 'nav');
  const footerLinks = footerNav ? elements(footerNav).filter((node) => node.tagName === 'a') : [];
  requireThat(footerLinks.map((node) => text(node).trim()).join(',') === 'Home,Products' && footerLinks.every((node) => attr(node, 'href') === pagePath(language, text(node).trim().toLowerCase())), `${name}: footer needs Home and Products page links only.`);
  requireThat(!elements(footer).some((node) => attr(node, 'data-section-link') !== undefined), `${name}: footer must not repeat in-page navigation.`);
  if (homePage) {
    for (const id of ['home', 'products', 'contact']) requireThat(pages.get(file).ids.has(id), `${name}: missing ${id} section.`);
    for (const [id, label] of [['products-heading', 'Products'], ['contact-heading', 'Contact']]) requireThat(nodes.some((node) => attr(node, 'id') === id && attr(node, 'lang') === 'en' && text(node) === label), `${name}: section titles must match their English navigation labels.`);
    requireThat(nodes.some((node) => attr(node, 'class') === 'view-all-link' && attr(node, 'href') === pagePath(language, 'products')), `${name}: View All must open the catalog start without a fragment.`);
    const carousel = nodes.find((node) => attr(node, 'data-category-carousel') !== undefined);
    const categoryLinks = carousel ? elements(carousel).filter((node) => attr(node, 'data-category-destination') !== undefined) : [];
    requireThat(categoryLinks.length === company.categories.length && nodes.some((node) => attr(node, 'data-category-track') !== undefined), `${name}: the home product area must be a category carousel.`);
    for (const category of company.categories) requireThat(categoryLinks.some((node) => attr(node, 'href') === categoryPath(language, category) && elements(node).some((child) => child.tagName === 'h3' && text(child) === category.name)), `${name}: category cards must retain their names and target their catalog group.`);
    const ownerList = nodes.find((node) => attr(node, 'class') === 'owner-list');
    const owners = ownerList ? elements(ownerList).filter((node) => node.tagName === 'li') : [];
    requireThat(owners.map((node) => text(node).trim()).join(',') === 'Budiyanto,Delinah', `${name}: show each owner on a separate row.`);
    requireThat(nodes.some((node) => node.tagName === 'h3' && text(node).trim() === catalog(language).owners), `${name}: use the confirmed owner heading.`);
  }
  requireThat(!nodes.some((node) => /(?:^| )(?:category-index|product-index|section-number)(?: |$)/.test(attr(node, 'class') ?? '')), `${name}: decorative item/section identifiers were removed.`);
  requireThat(!nodes.some((node) => attr(node, 'data-i18n') === 'rangeNote'), `${name}: the removed availability note must not return.`);
  if (productsPage) {
    const main = nodes.find((node) => node.tagName === 'main');
    requireThat(elements(main).filter((node) => node.tagName === 'section').length === 1, `${name}: Products must contain one catalog section without an introductory hero.`);
    const filters = nodes.filter((node) => node.tagName === 'button' && attr(node, 'data-product-filter') !== undefined);
    requireThat(filters.length === company.categories.length + 1 && attr(filters[0], 'data-product-filter') === 'all' && attr(filters[0], 'aria-pressed') === 'true', `${name}: All Products must be the first, default category filter.`);
    for (const category of company.categories) requireThat(filters.some((node) => attr(node, 'data-product-filter') === category.id && attr(node, 'aria-pressed') === 'false'), `${name}: missing ${category.name} filter button.`);
    for (const product of company.products) requireThat(nodes.some((node) => node.tagName === 'tr' && attr(node, 'id') === product.id && attr(node, 'data-product-category') === product.category && elements(node).some((child) => child.tagName === 'h2' && text(child) === product.name)), `${name}: ${product.name} must retain its category, untranslated name, and heading level below the catalog h1.`);
    const viewControls = nodes.filter((node) => attr(node, 'data-catalog-view-button') !== undefined);
    requireThat(viewControls.map((node) => attr(node, 'data-catalog-view-button')).join(',') === 'thumbnails,details', `${name}: both catalog views must be keyboard reachable.`);
    for (const control of viewControls) requireThat(Boolean(attr(control, 'aria-label')) && !text(control).trim() && elements(control).some((node) => node.tagName === 'svg'), `${name}: catalog view buttons must use icons with localized accessible names.`);
    const sorter = nodes.find((node) => node.tagName === 'button' && attr(node, 'data-category-sort') !== undefined);
    requireThat(Boolean(sorter && attr(sorter, 'aria-label') && attr(sorter.parentNode, 'aria-sort') === 'none'), `${name}: Category sorting needs a labeled native button and column-header sort state.`);
    for (const category of company.categories) requireThat(nodes.some((node) => node.tagName === 'tbody' && attr(node, 'data-catalog-track') === category.id && attr(node, 'aria-labelledby') === `catalog-group-${category.id}`), `${name}: ${category.name} needs a named category carousel row.`);
    const table = nodes.find((node) => node.tagName === 'table' && attr(node, 'data-product-list') !== undefined);
    requireThat(Boolean(table) && elements(table).filter((node) => node.tagName === 'th' && attr(node, 'scope') === 'col').length === 3, `${name}: the shared catalog must expose Product, Category and Description column headers.`);
    for (const product of company.products) {
      const row = nodes.find((node) => attr(node, 'id') === product.id && attr(node, 'data-product-category') !== undefined);
      const category = company.categories.find((category) => category.id === product.category);
      requireThat(elements(row).some((node) => attr(node, 'class') === 'catalog-category-cell' && text(node).includes(category.name)), `${name}: ${product.name} must show its category in both views.`);
    }

  }
  requireThat(nodes.filter((node) => attr(node, 'data-gallery') !== undefined).length === (homePage ? 1 : productsPage ? company.products.length : 0), `${name}: reserve a gallery for each catalog product and the home storefront.`);
  const robotsMeta = nodes.find((node) => attr(node, 'name') === 'robots');
  if (!indexable || name === '404.html' || name.endsWith('/404.html')) {
    requireThat(Boolean(robotsMeta && attr(robotsMeta, 'content')?.includes('noindex')), `${name}: prelaunch/error pages must remain noindex.`);
  } else {
    requireThat(nodes.some((node) => attr(node, 'rel') === 'canonical' && attr(node, 'href')?.startsWith('https://')), `${name}: indexable pages need a canonical URL.`);
    for (const locale of [...locales.map((locale) => localeInfo[locale].tag), 'x-default']) {
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

// Legacy URLs reach a published page or a real category/product section.
const redirects = (await readFile(resolve(root, '_redirects'), 'utf8')).trim().split('\n');
const sources = new Set();
for (const line of redirects) {
  const [source, destination, status] = line.trim().split(/\s+/);
  requireThat(!sources.has(source) && status === '301', `Invalid or duplicate redirect: ${line}`);
  sources.add(source);
  const target = new URL(destination, 'https://build.invalid');
  const page = pages.get(resolve(root, '.' + target.pathname, 'index.html'));
  requireThat(Boolean(page && (!target.hash || page.ids.has(target.hash.slice(1)))), `Redirect must target an existing page or section: ${line}`);
  requireThat(source !== destination && ![...pages.values()].some(({ name }) => '/' + name.replace(/index\.html$/, '') === source), `Redirect must not shadow a published page or loop: ${line}`);
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
