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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORY_HUBS } from './categoryHubs.mjs';

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
 * Appends the brand name to the browser <title> only.
 *
 * WHY: the SERP already shows the site name next to the URL, and social cards
 * carry og:site_name. Repeating "Perspective Group" inside the headline made
 * every result read "… | Perspective Group | Perspective Group" and pushed the
 * distinctive keywords out of the ~60-character title budget Google truncates
 * at. The suffix is applied once, and never to the JSON-LD headline, which must
 * stay the verbatim article title or the structured data mismatches the page.
 */
const BRAND = 'Perspective Group';
function appendBrandSuffix(headline, lang = 'fr') {
  const h = stripTags(headline);
  if (!h) return BRAND;
  if (h.includes(BRAND) || h.includes('SenPerspective')) return h;
  // EN reads more naturally with an em dash, FR with a pipe.
  return lang === 'en' ? `${h} — ${BRAND}` : `${h} | ${BRAND}`;
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

/**
 * Maps an article's `category` value to the slug of a section page that the
 * prerender actually writes, or null when there is no safe target.
 *
 * WHY AN ALIAS TABLE IS NEEDED
 * ----------------------------
 * The database tags articles with fine-grained editorial labels ("Afrique",
 * "Monde", "Diplomatie", "Justice", "People", "Météo"…) that are NOT the same set
 * as the section hubs. Matching by string equality therefore linked only 195 of
 * 360 articles to a section page and left the rest as orphaned nodes: valuable
 * pages, invisible to a crawler navigating the site.
 *
 * Every entry points at a URL present in the generated sitemap, so a link can
 * never 404. Sports resolves to /category/sports — a real section page that is
 * absent from the editorial hub registry, which is exactly why a pure equality
 * check could not find it.
 *
 * Returns null rather than guessing: trading orphaned pages for broken internal
 * links would be worse, because a crawler follows every one of them.
 */
const CATEGORY_ALIASES = {
  politique: 'politique',
  diplomatie: 'international',
  diplomacy: 'international',
  international: 'international',
  monde: 'international',
  afrique: 'international',
  europe: 'international',
  asie: 'international',
  economie: 'economie',
  business: 'economie',
  finances: 'economie',
  entreprises: 'economie',
  marche: 'economie',
  energie: 'economie',
  investissements: 'economie',
  // Misspelling actually present in the data, mapped so those rows are not orphaned.
  busines: 'economie',
  societe: 'societe',
  people: 'societe',
  meteo: 'societe',
  education: 'societe',
  religion: 'societe',
  justice: 'societe',
  sante: 'sante',
  culture: 'culture',
  tech: 'tech-innovation',
  technologie: 'tech-innovation',
  innovation: 'tech-innovation',
  sports: 'sports',
  sport: 'sports',
  football: 'sports',
  basket: 'sports',
  lutte: 'sports',
  dossiers: 'decryptages',
  decryptage: 'decryptages',
  enquete: 'decryptages',
};

const HUB_SLUGS = CATEGORY_HUBS.map((c) => c.slug);
function categorySlug(category) {
  if (!category || typeof category !== 'string') return null;
  const norm = (s) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const target = norm(category);
  if (HUB_SLUGS.includes(target)) return target;
  // "Tech & Innovation" -> "tech-innovation".
  const dashed = target.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (HUB_SLUGS.includes(dashed)) return dashed;
  if (CATEGORY_ALIASES[dashed]) return CATEGORY_ALIASES[dashed];
  return null;
}

/**
 * Picks real sibling articles to link from an article.
 *
 * Prefers the same category, then falls back to shared tags, and always returns
 * only articles that are themselves published and prerendered. Never returns the
 * article itself, and never invents a URL.
 */
function relatedArticles(a, all, limit = 5) {
  const cat = typeof a.category === 'string' ? a.category : '';
  const tags = new Set(
    (Array.isArray(a.tags) ? a.tags : []).filter((x) => typeof x === 'string').map((x) => x.toLowerCase())
  );
  const selfSlug = a.slug || a.id;

  const scored = [];
  for (const b of all) {
    if (!b || b.id === a.id) continue;
    const bSlug = b.slug || b.id;
    if (!bSlug || bSlug === selfSlug) continue;

    const bCat = typeof b.category === 'string' ? b.category : '';
    const bTags = (Array.isArray(b.tags) ? b.tags : []).filter((x) => typeof x === 'string');
    let shared = 0;
    for (const tg of bTags) if (tags.has(tg.toLowerCase())) shared++;

    // Same section is the strongest signal; shared tags are the fallback.
    let score = 0;
    if (cat && bCat === cat) score += 10;
    score += Math.min(shared, 5);
    if (score > 0) scored.push({ b, score });
  }

  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, limit).map((s) => s.b);
}

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
function articleBody(a, lang = 'fr', related = []) {
  const title = t(a.title, lang) || t(a.title, 'en') || 'SenPerspective';
  const desc =
    t(a.seoMetaDescription, lang) || stripTags(t(a.excerpt, lang)) || stripTags(t(a.body, lang)).slice(0, 158);
  const image = a.seoOgImage || a.featuredImage || a.imageUrl || '';
  const published = isoDate(a);
  const bodyHtml = markdownToHtml(t(a.body, lang) || t(a.body, 'en'));
  const author = t(a.author, lang) || 'Perspective Newsroom';
  const category = typeof a.category === 'string' ? a.category : '';
  const catSlug = categorySlug(category);

  // INTERNAL LINKS
  // A prerendered article with no outgoing link is a dead end for a crawler:
  // it ranks the page but passes none of that authority on, and Google cannot
  // discover any other article from it except through the sitemap. Linking the
  // article to its category hub plus a few real siblings is the cheapest way to
  // make the archive crawlable and topical signals flow between related stories.
  // Every link here points at a page the prerender itself writes, so no link can
  // 404.
  const navBits = [`<a href="${SITE}/" style="color:#E85D42;text-decoration:none">SenPerspective</a>`];
  if (catSlug) {
    navBits.push(` &middot; <a href="${SITE}/category/${esc(catSlug)}" style="color:#E85D42;text-decoration:none">${esc(category)}</a>`);
  } else if (category) {
    navBits.push(` &middot; ${esc(category)}`);
  }

  const relatedBlock = related.length
    ? `<nav aria-label="${lang === 'en' ? 'Related articles' : 'Articles liés'}" style="margin:2.5rem 0 0;padding:1.5rem 0 0;border-top:1px solid #e2e8f0">
        <h2 style="font-family:Inter,system-ui,sans-serif;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin:0 0 .75rem">${lang === 'en' ? 'Related' : 'À lire aussi'}</h2>
        <ul style="list-style:none;margin:0;padding:0;display:grid;gap:.5rem">
          ${related
            .map(
              (r) => `<li><a href="${SITE}${articlePath(r)}" style="font-family:Inter,system-ui,sans-serif;font-size:15px;font-weight:600;color:#172033;text-decoration:none">${esc(stripTags(t(r.title, lang) || t(r.title, 'en')))}</a></li>`
            )
            .join('\n          ')}
        </ul>
      </nav>`
    : '';

  return `<div id="sp-prerender" style="max-width:48rem;margin:0 auto;padding:2.5rem 1.25rem 4rem;font-family:Lora,Georgia,serif;color:#172033">
      <p style="font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#E85D42;margin:0 0 1rem">
        ${navBits.join('')}
      </p>
      <h1 style="font-family:Inter,system-ui,sans-serif;font-size:clamp(1.75rem,4vw,2.75rem);line-height:1.1;font-weight:900;margin:0 0 1rem">${esc(stripTags(title))}</h1>
      <p style="font-family:Inter,system-ui,sans-serif;font-size:13px;color:#334155;margin:0 0 1.5rem">
        ${esc(stripTags(author))}${published ? ` &middot; <time datetime="${esc(published)}">${esc(published.slice(0, 10))}</time>` : ''}
      </p>
      ${image ? `<figure style="margin:0 0 1.5rem"><img src="${esc(image)}" alt="${esc(stripTags(title).slice(0, 120))}" style="width:100%;height:auto;border-radius:8px" /></figure>` : ''}
      ${desc ? `<p style="font-size:1.05rem;font-weight:600;line-height:1.6;margin:0 0 1.5rem">${esc(stripTags(desc))}</p>` : ''}
      <div style="font-size:1.05rem;line-height:1.75">${bodyHtml}</div>
      ${relatedBlock}
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
function applyHead(shell, { a, lang, title, ogTitle, desc, url, image, published, author, category, keywordsList, jsonLd, related = [], bodyOverride }) {
  let head = shell;
  // og:title / twitter:title / name="title" use the clean headline so social
  // cards and SERP text never repeat the brand suffix that <title> carries.
  const socialTitle = esc(stripTags(ogTitle || title));

  // Each replacement is attempted independently: a tag that is absent from the
  // shell simply stays absent, rather than aborting the whole prerender.
  const set = (pattern, replacement) => {
    if (pattern.test(head)) head = head.replace(pattern, replacement);
  };

  set(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  set(/<meta\s+name="title"\s+content="[^"]*"\s*\/?>/i, `<meta name="title" content="${socialTitle}" />`);
  set(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${esc(desc.slice(0, 300))}" />`
  );
  set(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${esc(url)}" />`);
  set(/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i, '<meta property="og:type" content="article" />');
  set(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${esc(url)}" />`);
  set(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${socialTitle}" />`);
  set(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${esc(desc.slice(0, 300))}" />`
  );
  set(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${esc(image)}" />`);
  set(/<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/i, '<meta property="og:locale" content="fr_SN" />');
  set(/<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:url" content="${esc(url)}" />`);
  set(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${socialTitle}" />`);
  set(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${esc(desc.slice(0, 300))}" />`
  );
  set(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${esc(image)}" />`);

  const extra = [
    published ? `<meta property="article:published_time" content="${esc(published)}" />` : '',
    author ? `<meta property="article:author" content="${esc(stripTags(author))}" />` : '',
    category ? `<meta property="article:section" content="${esc(category)}" />` : '',
    // article:tag is what Google uses for topical grouping of a news story.
    ...(Array.isArray(keywordsList) && keywordsList.length
      ? keywordsList.slice(0, 6).map((k) => `<meta property="article:tag" content="${esc(k)}" />`)
      : []),
    // Dimensions + alt let Facebook/WhatsApp/X choose a large card and give the
    // image a real description instead of a blank one.
    image ? `<meta property="og:image:width" content="1200" />` : '',
    image ? `<meta property="og:image:height" content="630" />` : '',
    image ? `<meta property="og:image:alt" content="${esc(stripTags(ogTitle || title).slice(0, 120))}" />` : '',
    image ? `<meta name="twitter:image:alt" content="${esc(stripTags(ogTitle || title).slice(0, 120))}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ');

  set(/<\/head>/i, `    ${extra}\n  </head>`);

  // The article goes inside the genuine #root so React replaces it on mount,
  // and so a reader whose bundle fails still sees the article text.
  // `bodyOverride` lets non-article pages (league hubs) reuse this exact shell
  // handling instead of re-implementing it, which is what keeps a single
  // template.
  const body = bodyOverride || articleBody(a, lang, related);
  if (head.includes('<div id="root"></div>')) {
    head = head.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  } else {
    // Defensive fallback: if the shell ever changes shape, still put the
    // content in the document rather than silently shipping an empty page.
    head = head.replace(/<body[^>]*>/i, (m) => `${m}\n    ${body}`);
  }

  return head;
}

function renderArticle(a, shell, lang = 'fr', all = []) {
  const url = `${SITE}${articlePath(a)}`;
  const headline = t(a.title, lang) || t(a.title, 'en') || 'SenPerspective';
  // The browser <title> carries the brand suffix for click-through branding,
  // while og:title stays clean so social cards don't read
  // "… | Perspective Group | Perspective Group".
  const title = appendBrandSuffix(headline, lang);
  const ogTitle = stripTags(headline);
  const desc =
    t(a.seoMetaDescription, lang) || stripTags(t(a.excerpt, lang)) || stripTags(t(a.body, lang)).slice(0, 158);
  const image = a.seoOgImage || a.featuredImage || a.imageUrl || `${SITE}/favicon.png`;
  const published = isoDate(a);
  const author = t(a.author, lang) || 'Perspective Newsroom';
  const category = typeof a.category === 'string' ? a.category : '';
  const catSlug = categorySlug(category);
  const keywordsList = Array.isArray(a.tags) ? a.tags.filter((t2) => typeof t2 === 'string' && t2) : [];

  // BreadcrumbList mirrors the visible Home > Category > headline trail. Google
  // uses it to understand the hierarchy and to build a nicer SERP breadcrumb,
  // and it only uses positions that genuinely exist, so the category entry is
  // emitted only when its hub was actually prerendered.
  const breadcrumbItems = [
    { name: 'Accueil', url: `${SITE}/` },
    ...(catSlug ? [{ name: category, url: `${SITE}/category/${catSlug}` }] : []),
    { name: stripTags(headline).slice(0, 90), url },
  ];
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: stripTags(headline).slice(0, 110),
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
      articleSection: category || undefined,
      keywords: keywordsList.slice(0, 12).join(', ') || undefined,
      inLanguage: lang === 'fr' ? 'fr-SN' : 'en',
    },
    breadcrumbJsonLd,
  ];

  const related = relatedArticles(a, all);

  return applyHead(shell, {
    a, lang, title, ogTitle, desc, url, image, published, author, category,
    keywordsList, jsonLd, related,
  });
}

/**
 * League hub pages for SEO.
 *
 * WHY THESE EXIST AND WHY THE SCORES ARE NOT IN THEM
 * -------------------------------------------------
 * Live score rows change every few seconds. Indexing them directly would mean
 * constant crawl churn and content that is stale the moment Google fetches it,
 * so the score rows are deliberately NOT prerendered.
 *
 * What IS prerendered is the evergreen part: the competition, the local
 * context, and the editorial framing. Those carry the search value — "lutte
 * avec frappe Sénégal", "résultat navétanes", "D1 basket Sénégal" — and they
 * are exactly the competitions no free sports API covers, so they are also the
 * ones competitors cannot out-publish with automated data.
 *
 * The copy is written per league rather than generated from a template, so
 * each page is genuinely distinct.
 */
const LEAGUE_HUBS = [
  {
    id: 'lutte',
    path: '/arena/lutte',
    priority: '0.8',
    freq: 'daily',
    title: 'Lutte avec Frappe Sénégal : résultats, affiches et actualités',
    description:
      "Suivi de la lutte avec frappe sénégalaise : résultats des assauts, affiches de la saison et actualités de l'arène nationale de Dakar.",
    heading: 'Lutte avec Frappe au Sénégal',
    intro:
      "La lutte avec frappe est le sport national sénégalais. Cette page rassemble les résultats des assauts, les affiches annoncées et les actualités de la saison, tels que publiés par la presse dakaroise.",
    sections: [
      {
        h: 'Comment suivre les résultats',
        p: "Les résultats sont publiés par la presse nationale et par les commissions officielles. Cette page les rassemble au même endroit, avec la date de chaque rencontre, plutôt que de vous faire chercher information par information.",
      },
      {
        h: 'Calendrier et affiches',
        p: "La saison alter lamb démarre généralement en début d'année. Les affiches de chaque grande rencontre sont annoncées à l'avance par les commissions de zone et par la presse.",
      },
    ],
  },
  {
    id: 'navetane',
    path: '/arena/navetane',
    priority: '0.8',
    freq: 'daily',
    title: 'Navétanes Sénégal : résultats, finales de zone et actualités',
    description:
      'Championnats Navétanes du Sénégal : résultats des matchs, finales de zone, état des stades de Dakar et actualités du football de quartier.',
    heading: 'Championnats Navétanes',
    intro:
      "Les Navétanes sont le football de quartier qui nourrit le football professionnel sénégalais : finales de zone, licences, état des stades. Cette page suit la compétition au fil de la saison.",
    sections: [
      {
        h: 'Les Navétanes en clair',
        p: "Chaque année, des milliers de joueurs se réunissent dans les zones de la périphérie de Dakar pour disputer le championnat. C'est le vivier qui alimente les équipes professionnelles du pays.",
      },
      {
        h: 'Zones et stades',
        p: "La compétition est organisée par zones. L'état des terrains de la périphérie dakaroise reste un enjeu majeur pour le développement du championnat.",
      },
      {
        h: 'Pourquoi ces résultats comptent',
        p: "C'est à ce niveau que se repèrent les profils qui rejoindront plus tard les équipes nationales. Les statistiques de buts, de victoires et de meilleur buteur servent de base au recrutement par les clubs professionnels de Dakar et de l'intérieur du pays.",
      },
      {
        h: 'Où suivre la saison',
        p: "Les comptes rendus paraissent dans la presse nationale et sur les réseaux des supporters de zone. SenPerspective rassemble ces informations ici plutôt que de vous renvoyer d'une source à l'autre.",
      },
    ],
  },
  {
    id: 'd1-basket',
    path: '/arena/d1-basket',
    priority: '0.7',
    freq: 'daily',
    title: 'D1 Basket Sénégal : résultats et actualités',
    description:
      'D1 Basket Sénégal : résultats, classements et actualités de la première division sénégalaise de basket-ball.',
    heading: 'D1 Basket Sénégal',
    intro:
      "La D1 est la première division sénégalaise de basket-ball. Elle fournit régulièrement ses joueuses et joueurs aux grands clubs européens et sert de vitrine pour la formation nationale.",
    sections: [
      {
        h: 'Une ligue formatrice',
        p: "Chaque saison, des joueurs de D1 rejoignent l'Europe ou la NBA. Le niveau de la ligue progresse avec les investissements des clubs.",
      },
      {
        h: 'Suivi des résultats',
        p: "Les rencontres de D1 se jouent principalement en semaine et le week-end. Les résultats et les comptes rendus sont relayés par la presse sportive nationale.",
      },
      {
        h: "Le pont vers l'international",
        p: "La D1 est le principal observatoire du basket-ball féminin et masculin sénégalais. Les joueuses et joueurs qui s'y distinguent rejoignent les ligues européennes, la NBA ou la WNBA, ce qui en fait une compétition de référence pour le suivi de la sélection nationale.",
      },
      {
        h: 'Actualité de la saison',
        p: "Recrutements, directs des rencontres, suspensions et calendrier des phases finales : SenPerspective rassemble ici l'essentiel de la première division sénégalaise, suivi depuis Dakar.",
      },
    ],
  },
  {
    id: 'bal',
    path: '/arena/bal',
    priority: '0.6',
    freq: 'weekly',
    title: 'Basketball Africa League : résultats et actualités',
    description:
      'Basketball Africa League (BAL) : résultats, qualifications et actualités de la vitrine continentale du basket africain.',
    heading: 'Basketball Africa League',
    intro:
      'La Basketball Africa League est la vitrine continentale du basket africain et la porte d’entrée des clubs du continent vers la NBA.',
    sections: [
      {
        h: 'La porte d’entrée vers la NBA',
        p: "Plusieurs joueurs de BAL ont intégré la NBA. La ligue permet aux jeunes talents africains de se faire connaître auprès des recruteurs internationaux.",
      },
      {
        h: 'Calendrier',
        p: "La saison régulière de la BAL se joue en fin d'année, suivie des phases finales qui déterminent les qualifications pour les compétitions internationales.",
      },
      {
        h: 'Un tremplin vers la NBA',
        p: "La BAL a acquis une stature internationale qui attire les meilleurs jeunes joueurs du continent. Plusieurs de ses joueurs évoluent aujourd'hui en NBA, et la ligue reste pour eux la première étape de leur parcours international.",
      },
      {
        h: 'Suivre la compétition',
        p: "Calendrier des rencontres, résultats des phases finales et actualités des clubs participants : SenPerspective rassemble les informations disponibles sur la BAL dans cette page.",
      },
    ],
  },
];

/**
 * Renders a league hub into the genuine index.html shell, via the shared
 * editorial-hub renderer so both page families stay structurally identical.
 */
function renderLeagueHub(hub, shell) {
  return renderEditorialHub({ ...hub, kind: 'league' }, shell);
}

/**
 * RSS 2.0 feed.
 *
 * The site had no feed at all, which costs visibility in two ways: readers who
 * prefer a reader over a site have no way to follow, and search engines get no
 * second discovery path to the articles. Generated here from the same RTDB
 * records the sitemap and the article pages use, so it cannot drift.
 *
 * Also emits an Atom sibling, because several feed readers and aggregators
 * still prefer it and it costs almost nothing alongside the RSS 2.0 file.
 */
function buildRss(articles, { limit = 50 } = {}) {
  const items = articles
    .slice()
    .sort((a, b) => String(isoDate(b) || '').localeCompare(String(isoDate(a) || '')))
    .slice(0, limit)
    .map((a) => {
      const title = stripTags(t(a.title, 'fr') || t(a.title, 'en') || 'SenPerspective');
      const desc = stripTags(
        t(a.seoMetaDescription, 'fr') || t(a.excerpt, 'fr') || stripTags(t(a.body, 'fr')).slice(0, 300)
      );
      const link = `${SITE}${articlePath(a)}`;
      const pub = isoDate(a) || new Date().toISOString();
      const image = a.seoOgImage || a.featuredImage || a.imageUrl || '';
      const category = typeof a.category === 'string' ? a.category : '';
      return `    <item>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <pubDate>${new Date(pub).toUTCString()}</pubDate>
      <description>${esc(desc)}</description>${category ? `\n      <category>${esc(category)}</category>` : ''}${
        image
          ? `\n      <enclosure url="${esc(image)}" type="image/jpeg" length="0" />`
          : ''
      }
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>SenPerspective</title>
    <link>${SITE}</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Actualité, décryptage et analyse depuis Dakar — Perspective Group.</description>
    <language>fr-SN</language>
    <copyright>Perspective Group</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>SenPerspective prerender</generator>
    <image>
      <url>${SITE}/favicon.png</url>
      <title>SenPerspective</title>
      <link>${SITE}</link>
    </image>
${items}
  </channel>
</rss>
`;
}

function buildAtom(articles, { limit = 50 } = {}) {
  const entries = articles
    .slice()
    .sort((a, b) => String(isoDate(b) || '').localeCompare(String(isoDate(a) || '')))
    .slice(0, limit)
    .map((a) => {
      const title = stripTags(t(a.title, 'fr') || t(a.title, 'en') || 'SenPerspective');
      const desc = stripTags(
        t(a.seoMetaDescription, 'fr') || t(a.excerpt, 'fr') || stripTags(t(a.body, 'fr')).slice(0, 300)
      );
      const link = `${SITE}${articlePath(a)}`;
      const pub = isoDate(a) || new Date().toISOString();
      return `  <entry>
    <title>${esc(title)}</title>
    <link href="${esc(link)}" />
    <id>${esc(link)}</id>
    <updated>${esc(new Date(pub).toISOString())}</updated>
    <published>${esc(new Date(pub).toISOString())}</published>
    <summary>${esc(desc)}</summary>
  </entry>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>SenPerspective</title>
  <link href="${SITE}"/>
  <link rel="self" href="${SITE}/atom.xml" type="application/atom+xml"/>
  <id>${SITE}/</id>
  <updated>${new Date().toISOString()}</updated>
  <subtitle>Actualité, décryptage et analyse depuis Dakar — Perspective Group.</subtitle>
  <generator>SenPerspective prerender</generator>
${entries}
</feed>
`;
}

/**
 * Generic editorial hub renderer, shared by the category pages and the league
 * hubs. Both are "an evergreen page about a subject": a heading, an intro, some
 * real sections of copy, and structured data.
 *
 * Reusing one renderer is what keeps the two page families from drifting apart
 * in structure, head handling or escaping.
 */
function renderEditorialHub(
  { path: urlPath, heading, title, description, intro, sections, kind },
  shell
) {
  const url = `${SITE}${urlPath}`;

  const sectionsHtml = sections
    .map(
      (s) =>
        `<h2 style="font-family:Inter,system-ui,sans-serif;font-size:1.25rem;font-weight:800;margin:1.75rem 0 .5rem">${esc(s.h)}</h2>\n      <p style="font-size:1.05rem;line-height:1.75;margin:0 0 1rem">${esc(s.p)}</p>`
    )
    .join('\n      ');

  // CollectionPage for both families: neither is a single fixture or article,
  // and emitting NewsArticle here would be invalid structured data.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: heading,
    description,
    url,
    inLanguage: 'fr-SN',
    isPartOf: { '@type': 'WebSite', name: 'SenPerspective', url: SITE },
  };

  // Each hub is its own subject; the crumb only marks the section it belongs to.
  const crumb =
    kind === 'category'
      ? `<a href="${SITE}/category/${urlPath.split('/').pop()}" style="color:#E85D42;text-decoration:none">Rubrique</a>`
      : `<a href="${SITE}/larene" style="color:#E85D42;text-decoration:none">Sports</a>`;

  const body = `<div id="sp-prerender" style="max-width:46rem;margin:0 auto;padding:2.5rem 1.25rem 4rem;font-family:Inter,system-ui,sans-serif;color:#172033">
      <p style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#E85D42;margin:0 0 1rem">
        <a href="${SITE}/" style="color:#E85D42;text-decoration:none">SenPerspective</a>
        &middot; ${esc(crumb)}
      </p>
      <h1 style="font-size:clamp(1.75rem,4vw,2.5rem);line-height:1.15;font-weight:900;margin:0 0 1rem">${esc(heading)}</h1>
      <p style="font-size:1.1rem;font-weight:600;line-height:1.65;margin:0 0 1.5rem">${esc(intro)}</p>
      ${sectionsHtml}
      <p style="font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:1rem;margin-top:2rem">
        <a href="${SITE}/" style="color:#E85D42;text-decoration:none">Perspective Group</a> &middot; Dakar, Sénégal
      </p>
    </div>`;

  return applyHead(shell, {
    a: { title: heading, category: kind === 'category' ? 'Actualites' : 'Sports' },
    lang: 'fr',
    title,
    desc: description,
    url,
    image: `${SITE}/favicon.png`,
    published: null,
    jsonLd,
    bodyOverride: body,
  });
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
    // Category pages come from the shared CATEGORY_HUBS registry, so the
    // sitemap cannot list a page the build does not actually produce.
    ...CATEGORY_HUBS.map((c) => ({
      loc: `${SITE}/category/${c.slug}`,
      priority: '0.8',
      freq: 'hourly',
    })),
    // Sports used to be hand-listed here, immediately after the comment above
    // promised the sitemap could not list a page the build does not produce — and
    // no HTML was ever written for it, so the sitemap advertised a 404. The
    // sports hub is now a real CATEGORY_HUBS entry and this line is gone.
    { loc: `${SITE}/larene`, priority: '0.7', freq: 'hourly' },
    // League hubs: the durable, indexable sports surface. The live scores on
    // /larene are deliberately absent from the sitemap because they change too
    // often to be worth crawling.
    ...LEAGUE_HUBS.map((h) => ({
      loc: `${SITE}${h.path}`,
      priority: h.priority,
      freq: h.freq,
    })),

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
    await writeFile(path.join(dir, 'index.html'), renderArticle(a, shell, 'fr', articles), 'utf8');
    written++;
  }
  console.log(`[prerender] wrote ${written} article pages to dist/article/`);

  // League hub pages. Written the same way as articles: a directory per slug
  // containing index.html, so Firebase Hosting serves it as a static file
  // before the SPA rewrite would otherwise catch the path.
  const arenaDir = path.join(DIST, 'arena');
  if (existsSync(arenaDir)) await rm(arenaDir, { recursive: true, force: true });
  let hubsWritten = 0;
  for (const hub of LEAGUE_HUBS) {
    const slug = hub.path.replace('/arena/', '');
    if (!/^[A-Za-z0-9._-]+$/.test(slug)) {
      console.warn(`[prerender] skipping unsafe hub slug: ${slug}`);
      continue;
    }
    const dir = path.join(arenaDir, slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), renderLeagueHub(hub, shell), 'utf8');
    hubsWritten++;
  }
  console.log(`[prerender] wrote ${hubsWritten} league hub pages to dist/arena/`);

  // Category hub pages. These were previously SPA-only: an empty #root with
  // every word arriving after JavaScript, which meant a non-JS crawler saw
  // nothing on the site's primary entry points.
  const categoryDir = path.join(DIST, 'category');
  if (existsSync(categoryDir)) await rm(categoryDir, { recursive: true, force: true });
  let catsWritten = 0;
  for (const cat of CATEGORY_HUBS) {
    if (!/^[a-z0-9-]+$/.test(cat.slug)) {
      console.warn(`[prerender] skipping unsafe category slug: ${cat.slug}`);
      continue;
    }
    const dir = path.join(categoryDir, cat.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, 'index.html'),
      renderEditorialHub({ ...cat, path: `/category/${cat.slug}`, kind: 'category' }, shell),
      'utf8'
    );
    catsWritten++;
  }
  console.log(`[prerender] wrote ${catsWritten} category hub pages to dist/category/`);

  await writeFile(path.join(DIST, 'sitemap.xml'), buildSitemap(articles), 'utf8');
  const staticCount =
    1 + CATEGORY_HUBS.length + 1 + LEAGUE_HUBS.length + 2; // home + hubs + /larene + league hubs + about/contact
  console.log(`[prerender] wrote sitemap.xml (${articles.length} article urls + ${staticCount} static)`);

  // INTERNAL LINK INTEGRITY GATE
  // ---------------------------
  // This build now emits thousands of internal links (section pages + related
  // articles on every article page). A crawler follows every one of them, so a
  // single link to a page this build did not write is a 404 discovered from a
  // page we just asked Google to rank. That is a self-inflicted penalty, and it
  // is exactly the class of bug that already existed here: /category/sports was
  // advertised in the sitemap while no HTML was ever generated for it.
  //
  // Rather than trust the alias table to stay correct as categories are edited,
  // every emitted internal link is resolved against the generated files and the
  // build FAILS if any target is missing. A broken link can no longer be
  // deployed.
  const linkTargets = new Set();
  const collect = (base, prefix) => {
    if (!existsSync(base)) return;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      linkTargets.add(`${prefix}/${entry.name}`);
      collect(path.join(base, entry.name), `${prefix}/${entry.name}`);
    }
  };
  collect(path.join(DIST, 'article'), '/article');
  collect(path.join(DIST, 'category'), '/category');
  collect(path.join(DIST, 'arena'), '/arena');

  let checked = 0;
  const broken = new Set();
  const checkFile = (file) => {
    const html = readFileSync(file, 'utf8');
    for (const m of html.matchAll(new RegExp(`href="${SITE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/[^"#?]*)"`, 'g'))) {
      const target = m[1];
      // Only the directories this build writes are gated; the SPA routes
      // (/about, /contact, /larene) are served by the catch-all rewrite.
      if (!/^\/(article|category|arena)\//.test(target)) continue;
      checked++;
      if (!linkTargets.has(target.replace(/\/$/, ''))) broken.add(target);
    }
  };
  for (const entry of readdirSync(path.join(DIST, 'article'), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      checkFile(path.join(DIST, 'article', entry.name, 'index.html'));
    }
  }
  if (broken.size) {
    console.error(`[prerender] FAILED: ${broken.size} internal link(s) point at pages this build did not write:`);
    for (const b of [...broken].slice(0, 10)) console.error(`  - ${b}`);
    throw new Error('internal link integrity check failed');
  }
  console.log(`[prerender] link integrity OK: ${checked} internal links, 0 broken.`);

  // Feeds. Written from the same records, so they can never advertise an
  // article the sitemap does not also list.
  await writeFile(path.join(DIST, 'rss.xml'), buildRss(articles), 'utf8');
  await writeFile(path.join(DIST, 'atom.xml'), buildAtom(articles), 'utf8');
  console.log('[prerender] wrote rss.xml and atom.xml (50 most recent each)');

  // 404 page.
  //
  // Article URLs are rewritten to their prerendered file. Firebase does NOT
  // fall through to a later rewrite when that destination is missing, so an
  // unknown article correctly returns a real 404 status (which is what search
  // engines need in order to drop the URL) — but it would otherwise be a bare
  // hosting error page. This keeps the real 404 status while giving visitors the
  // site's own not-found screen instead of a dead end.
  //
  // The markup mirrors the in-app "Article non trouvé" state so the two are
  // indistinguishable. It reuses the shipped bundle's stylesheet link and is
  // static HTML, so it needs no JavaScript to read.
  const notFoundHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Page introuvable | SenPerspective</title>
<meta name="robots" content="noindex, follow" />
<meta name="description" content="Cette page n'existe pas ou a ete deplacee. Revenez a l'accueil de SenPerspective." />
<link rel="canonical" href="https://senperspective.com" />
</head>
<body style="margin:0;background:#fafafa">
  <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;font-family:system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
    <div style="max-width:32rem;text-align:center">
      <p style="margin:0 0 1rem;font-size:.75rem;font-weight:800;letter-spacing:.25em;text-transform:uppercase;color:#E85D42">SenPerspective</p>
      <h1 style="margin:0 0 1rem;font-size:1.75rem;font-weight:800;color:#18181b">Article non trouve</h1>
      <p style="margin:0 0 2rem;font-size:.95rem;line-height:1.6;color:#52525b">Cet article n'existe plus ou l'adresse saisie est incorrecte.</p>
      <a href="/" style="display:inline-block;padding:.75rem 1.5rem;background:#E85D42;color:#fff;text-decoration:none;border-radius:.5rem;font-size:.75rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase">Retour a l'accueil</a>
    </div>
  </main>
</body>
</html>`;
  await writeFile(path.join(DIST, '404.html'), notFoundHtml, 'utf8');
  console.log('[prerender] wrote 404.html');

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

  // HARD GATE.
  //
  // The failure this guards against is a build that runs `vite build` WITHOUT
  // this script: the bundle is produced, dist has no dist/article/, and the
  // deployment ships a bare SPA shell. Every article URL then falls through to
  // the rewrite, serves index.html, and crawlers see "Chargement de
  // l'article..." with a homepage canonical — which is exactly what happened.
  //
  // A prerender that fetches zero articles is therefore treated as a build
  // failure rather than a silent success, so a broken/renamed data source
  // cannot quietly ship a de-indexable site.
  if (articles.length === 0) {
    throw new Error(
      '[prerender] 0 published articles fetched from the database — refusing to finish. ' +
        'A build without prerendered article HTML ships an empty shell to crawlers.'
    );
  }
  if (written !== articles.length) {
    throw new Error(
      `[prerender] wrote ${written} article pages for ${articles.length} published articles.`
    );
  }
  console.log(`[prerender] OK: ${written} prerendered article pages verified.`);
}

main().catch((err) => {
  console.error('[prerender] failed:', err);
  process.exit(1);
});
