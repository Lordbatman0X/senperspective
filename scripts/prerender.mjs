/**
 * Build-time prerenderer.
 *
 * WHY THIS EXISTS
 * ---------------
 * The site is a client-rendered SPA. Fetched as a crawler, every URL returns
 * only ~13 words of text, because all content is produced by React at runtime.
 * Google indexes the HTML it receives, so the entire news publication reads as
 * an empty shell — which is the single most common reason an AdSense
 * application is rejected under the "low value content" policy.
 *
 * WHY NOT A CLOUD FUNCTION
 * ------------------------
 * Firebase Cloud Functions require the Blaze (pay-as-you-go) plan. This
 * project runs on Spark, and prerendering at BUILD time is free: Firebase
 * Hosting serves the generated static HTML, and the browser then hydrates into
 * exactly the same page it always did.
 *
 * TRADE-OFF
 * ---------
 * A newly published article becomes crawlable at the next deploy rather than
 * instantly. That is the price of staying on the free plan, and it is far
 * cheaper than losing the site on content.
 *
 * This script only READS. It never writes to Firebase.
 *
 * Run automatically via `npm run build` (see package.json).
 */
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const SITE = 'https://senperspective.com';

// ---------------------------------------------------------------------------
// 1. Fetch articles from the Realtime Database
// ---------------------------------------------------------------------------
// The /ads and /articles rules allow public reads, so this needs no key and
// no admin SDK — which is what keeps the build free.

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = fetch(url, { headers: { Accept: 'application/json' } });
    const timer = setTimeout(() => req.abort?.(), 30000);
    req
      .then((res) => {
        clearTimeout(timer);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
        return res.json();
      })
      .then(resolve)
      .catch(reject);
  });
}

async function loadConfig() {
  const raw = await readFile(path.join(ROOT, 'firebase-applet-config.json'), 'utf8');
  return JSON.parse(raw);
}

async function fetchArticles() {
  const cfg = await loadConfig();
  if (!cfg?.databaseURL) throw new Error('firebase-applet-config.json has no databaseURL');
  const raw = await getJson(`${cfg.databaseURL}/articles.json`);
  const rows = Object.values(raw || {}).filter((a) => a && a.id);
  const published = rows.filter((a) => a.isPublished !== false);
  return { all: rows, published, databaseURL: cfg.databaseURL };
}

// ---------------------------------------------------------------------------
// 2. Helpers
// ---------------------------------------------------------------------------

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Localised field, mirroring lib/utils.getSafeText. */
function t(field, lang = 'fr') {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object') return field[lang] || field.fr || field.en || '';
  return '';
}

/**
 * Article bodies are stored as Markdown, not HTML (they contain `###` and
 * `##` headings). It must be escaped and converted to real tags, because
 * leaving raw Markdown would put `###` in the crawler's view of the page.
 */
function markdownToHtml(md) {
  const src = String(md || '');
  if (!src.trim()) return '';
  const blocks = src.split(/\n{2,}/);
  const out = [];
  const inline = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    const h = block.match(/^(#{2,4})\s+(.*)$/s);
    if (h) {
      const level = h[1].length; // 2 -> h2 ... 4 -> h4, leaving h1 for the title
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^[-*]\s+/m.test(block)) {
      const items = block
        .split('\n')
        .filter((l) => /^[-*]\s+/.test(l))
        .map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`)
        .join('');
      out.push(`<ul>${items}</ul>`);
      continue;
    }
    out.push(`<p>${inline(block).replace(/\n/g, '<br/>')}</p>`);
  }
  return out.join('\n');
}

const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** The URL the SPA already uses: /article/{slug || id}. Must stay in sync. */
const articlePath = (a) => `/article/${a.slug || a.id}`;

const isoDate = (a) => {
  const raw = a.date || a.updatedAtServer || a.publishedAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * A minimal, semantic HTML document.
 *
 * Deliberately NOT styled: the crawler's job is to read the words and the
 * structure, and a second visual implementation would be another thing that
 * can drift out of sync with the real page. A human landing here before the
 * bundle loads sees a plain but fully readable article, then React takes over
 * and renders the normal site.
 *
 * CRITICAL: the article text below is the SAME text the article page renders
 * from the same RTDB record. It is not rewritten, summarised or embellished.
 * That equivalence is what keeps this within Google's dynamic-rendering
 * guidance rather than becoming cloaking.
 */
/**
 * The prerendered article body: real, semantic markup from the real RTDB
 * record. No CSS is invented here beyond a few inline styles for legibility,
 * because this markup is injected into the genuine index.html shell and so
 * inherits the site's real stylesheet.
 *
 * CRITICAL: this text is taken verbatim from the same record the article page
 * renders from. It is not rewritten, summarised or embellished. That
 * equivalence is what keeps this within Google's dynamic-rendering guidance
 * rather than becoming cloaking.
 */
function articleBody(a, lang = 'fr') {
  const title = t(a.title, lang) || t(a.title, 'en') || 'SenPerspective';
  const desc =
    t(a.seoMetaDescription, lang) || stripTags(t(a.excerpt, lang)) || stripTags(t(a.body, lang)).slice(0, 158);
  const image = a.seoOgImage || a.featuredImage || a.imageUrl || '';
  const published = isoDate(a);
  const bodyHtml = markdownToHtml(t(a.body, lang) || t(a.body, 'en'));
  const author = t(a.author, lang) || 'Perspective Newsroom';
  const category = typeof a.category === 'string' ? a.category : '';

  return `<div id="sp-prerender" style="max-width:48rem;margin:0 auto;padding:2.5rem 1.25rem 4rem;font-family:Lora,Georgia,serif;color:#172033">
      <p style="font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#E85D42;margin:0 0 1rem">
        <a href="${SITE}/" style="color:#E85D42;text-decoration:none">SenPerspective</a>
        ${category ? ` &middot; ${esc(category)}` : ''}
      </p>
      <h1 style="font-family:Inter,system-ui,sans-serif;font-size:clamp(1.75rem,4vw,2.75rem);line-height:1.1;font-weight:900;margin:0 0 1rem">${esc(stripTags(title))}</h1>
      <p style="font-family:Inter,system-ui,sans-serif;font-size:13px;color:#334155;margin:0 0 1.5rem">
        ${esc(stripTags(author))}${published ? ` &middot; <time datetime="${esc(published)}">${esc(published.slice(0, 10))}</time>` : ''}
      </p>
      ${image ? `<figure style="margin:0 0 1.5rem"><img src="${esc(image)}" alt="${esc(stripTags(title).slice(0, 120))}" style="width:100%;height:auto;border-radius:8px" /></figure>` : ''}
      ${desc ? `<p style="font-size:1.05rem;font-weight:600;line-height:1.6;margin:0 0 1.5rem">${esc(stripTags(desc))}</p>` : ''}
      <div style="font-size:1.05rem;line-height:1.75">${bodyHtml}</div>
    </div>`;
}

/**
 * Wraps the prerendered article body in a complete standalone document.
 *
 * The article markup lives inside a real <div id="root"> so that if a bundle
 * ever fails to load, a reader still gets the article text rather than a blank
 * page. React's createRoot() replaces that content on mount, so a human
 * visitor ends up on exactly the page they always saw.
 */
/**
 * Injects the article into the REAL index.html shell.
 *
 * The genuine shell is reused rather than re-created, so the prerendered page
 * keeps the actual <div id="root">, the hashed bundle scripts, the module
 * preloads, the polyfills and the white-screen watchdog. Only the document
 * <head> is swapped, to carry this article's own title, description,
 * canonical and NewsArticle JSON-LD.
 *
 * Because #root already has children, React's createRoot() replaces them on
 * mount and the visitor ends up on the normal page. A crawler that never runs
 * JS still reads the full article text. Nothing here is styled, so there is no
 * second visual implementation to drift out of sync.
 */
function applyHead(shell, { a, lang, title, desc, url, image, published, jsonLd }) {
  let head = shell;

  // Each replacement is attempted independently: a tag that is absent from the
  // shell simply stays absent, rather than aborting the whole prerender.
  const set = (pattern, replacement) => {
    if (pattern.test(head)) head = head.replace(pattern, replacement);
  };

  set(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  set(/<meta\s+name="title"\s+content="[^"]*"\s*\/?>/i, `<meta name="title" content="${esc(title)}" />`);
  set(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${esc(desc.slice(0, 300))}" />`
  );
  set(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${esc(url)}" />`);
  set(/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i, '<meta property="og:type" content="article" />');
  set(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${esc(url)}" />`);
  set(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${esc(title)}" />`);
  set(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${esc(desc.slice(0, 300))}" />`
  );
  set(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${esc(image)}" />`);
  set(/<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/i, '<meta property="og:locale" content="fr_SN" />');
  set(/<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:url" content="${esc(url)}" />`);
  set(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${esc(title)}" />`);
  set(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${esc(desc.slice(0, 300))}" />`
  );
  set(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${esc(image)}" />`);

  const extra = [
    published ? `<meta property="article:published_time" content="${esc(published)}" />` : '',
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ');

  set(/<\/head>/i, `    ${extra}\n  </head>`);

  // The article goes inside the genuine #root so React replaces it on mount,
  // and so a reader whose bundle fails still sees the article text.
  const body = articleBody(a, lang);
  if (head.includes('<div id="root"></div>')) {
    head = head.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  } else {
    // Defensive fallback: if the shell ever changes shape, still put the
    // content in the document rather than silently shipping an empty page.
    head = head.replace(/<body[^>]*>/i, (m) => `${m}\n    ${body}`);
  }

  return head;
}

function renderArticle(a, shell, lang = 'fr') {
  const url = `${SITE}${articlePath(a)}`;
  const title = t(a.title, lang) || t(a.title, 'en') || 'SenPerspective';
  const desc =
    t(a.seoMetaDescription, lang) || stripTags(t(a.excerpt, lang)) || stripTags(t(a.body, lang)).slice(0, 158);
  const image = a.seoOgImage || a.featuredImage || a.imageUrl || `${SITE}/favicon.png`;
  const published = isoDate(a);
  const author = t(a.author, lang) || 'Perspective Newsroom';
  const keywords = Array.isArray(a.tags) ? a.tags.slice(0, 12).join(', ') : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: stripTags(title).slice(0, 110),
    description: stripTags(desc).slice(0, 300),
    image: [image],
    datePublished: published,
    dateModified: a.updatedAtServer ? new Date(a.updatedAtServer).toISOString() : published,
    author: { '@type': 'Organization', name: stripTags(author) },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: 'SenPerspective',
      logo: { '@type': 'ImageObject', url: `${SITE}/favicon.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: typeof a.category === 'string' ? a.category : undefined,
    keywords: keywords || undefined,
    inLanguage: lang === 'fr' ? 'fr-SN' : 'en',
  };

  return applyHead(
    shell,
    { a, lang, title, desc, url, image, published, keywords, jsonLd }
  );
}

/**
 * Sitemap built from live data.
 *
 * The previous sitemap.xml listed only 13 URLs (homepage, categories, about,
 * contact, search) and no articles at all, which reads to a crawler as a site
 * with no content. This generates one URL per published article.
 */
function buildSitemap(articles) {
  const today = new Date().toISOString().slice(0, 10);
  const staticUrls = [
    { loc: `${SITE}/`, priority: '1.0', freq: 'hourly' },
    { loc: `${SITE}/category/politique`, priority: '0.8', freq: 'hourly' },
    { loc: `${SITE}/category/economie`, priority: '0.8', freq: 'hourly' },
    { loc: `${SITE}/category/societe`, priority: '0.8', freq: 'hourly' },
    { loc: `${SITE}/category/sports`, priority: '0.8', freq: 'hourly' },
    { loc: `${SITE}/category/tech-innovation`, priority: '0.7', freq: 'hourly' },
    { loc: `${SITE}/category/culture`, priority: '0.7', freq: 'daily' },
    { loc: `${SITE}/category/sante`, priority: '0.7', freq: 'daily' },
    { loc: `${SITE}/category/international`, priority: '0.7', freq: 'daily' },
    { loc: `${SITE}/category/decryptages`, priority: '0.8', freq: 'daily' },
    { loc: `${SITE}/larene`, priority: '0.7', freq: 'hourly' },
    { loc: `${SITE}/about`, priority: '0.4', freq: 'monthly' },
    { loc: `${SITE}/contact`, priority: '0.3', freq: 'monthly' },
  ];

  const urls = [
    ...staticUrls.map(
      (u) =>
        `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`
    ),
    ...articles.map((a) => {
      const modified = isoDate(a) || today;
      return `  <url><loc>${SITE}${articlePath(a)}</loc><lastmod>${modified.slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
    }),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

// ---------------------------------------------------------------------------
// 3. Main
// ---------------------------------------------------------------------------

async function main() {
  if (!existsSync(DIST)) {
    console.error('[prerender] dist/ not found - run the Vite build first.');
    process.exit(1);
  }

  let articles = [];
  try {
    const { published, all } = await fetchArticles();
    articles = published;
    console.log(`[prerender] fetched ${all.length} articles (${published.length} published)`);
  } catch (err) {
    // Never fail the build because the network hiccuped: shipping the SPA
    // without prerendered pages is strictly better than shipping nothing.
    console.warn(`[prerender] WARNING: could not fetch articles (${err.message}).`);
    console.warn('[prerender] Continuing without prerendered article pages.');
  }

  // Remove stale prerenders so a deleted/renamed article cannot linger in the
  // deployment and be served as a 200 with duplicate content.
  const articleDir = path.join(DIST, 'article');
  if (existsSync(articleDir)) await rm(articleDir, { recursive: true, force: true });

  // The real index.html is the template, so prerendered pages keep the site's
  // genuine #root, bundle, polyfills and watchdog.
  const shell = await readFile(path.join(DIST, 'index.html'), 'utf8');
  if (!shell.includes('id="root"')) {
    console.warn('[prerender] WARNING: dist/index.html has no #root; using body fallback.');
  }

  let written = 0;
  for (const a of articles) {
    const slug = a.slug || a.id;
    if (!slug || !/^[A-Za-z0-9._-]+$/.test(slug)) {
      console.warn(`[prerender] skipping unsafe slug: ${slug}`);
      continue;
    }
    const dir = path.join(articleDir, slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), renderArticle(a, shell, 'fr'), 'utf8');
    written++;
  }
  console.log(`[prerender] wrote ${written} article pages to dist/article/`);

  await writeFile(path.join(DIST, 'sitemap.xml'), buildSitemap(articles), 'utf8');
  console.log(`[prerender] wrote sitemap.xml (${articles.length} article urls + 13 static)`);

  // Sanity check: confirm the output really contains words, which is the whole
  // point. If this ever drops to 0 the deployment is worthless, so it warns.
  if (written > 0) {
    const samplePath = path.join(articleDir, articles[0].slug || articles[0].id, 'index.html');
    const sample = await readFile(samplePath, 'utf8');
    const words = stripTags(sample.replace(/<script[\s\S]*?<\/script>/g, ''))
      .split(/\s+/)
      .filter(Boolean).length;
    console.log(`[prerender] sample page word count: ${words}`);
    if (words < 150) {
      console.warn(`[prerender] WARNING: sample page has only ${words} words.`);
    }
  }
}

main().catch((err) => {
  console.error('[prerender] failed:', err);
  process.exit(1);
});
