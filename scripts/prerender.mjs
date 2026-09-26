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
function applyHead(shell, { a, lang, title, desc, url, image, published, jsonLd, bodyOverride }) {
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
  // `bodyOverride` lets non-article pages (league hubs) reuse this exact shell
  // handling instead of re-implementing it, which is what keeps a single
  // template.
  const body = bodyOverride || articleBody(a, lang);
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
 * Renders a league hub into the genuine index.html shell.
 *
 * Mirrors the article prerender: real text inside the real #root, so React
 * replaces it on mount and a non-JS crawler still reads the page.
 */
function renderLeagueHub(hub, shell) {
  const url = `${SITE}${hub.path}`;

  const sectionsHtml = hub.sections
    .map(
      (s) =>
        `<h2 style="font-family:Inter,system-ui,sans-serif;font-size:1.25rem;font-weight:800;margin:1.75rem 0 .5rem">${esc(s.h)}</h2>\n      <p style="font-size:1.05rem;line-height:1.75;margin:0 0 1rem">${esc(s.p)}</p>`
    )
    .join('\n      ');

  // CollectionPage rather than SportsEvent: this page is an editorial hub for a
  // competition, not a single fixture. Emitting SportsEvent here (with no real
  // startDate) would be invalid structured data and risks a manual action.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: hub.heading,
    description: hub.description,
    url,
    inLanguage: 'fr-SN',
    isPartOf: { '@type': 'WebSite', name: 'SenPerspective', url: SITE },
  };

  const body = `<div id="sp-prerender" style="max-width:46rem;margin:0 auto;padding:2.5rem 1.25rem 4rem;font-family:Inter,system-ui,sans-serif;color:#172033">
      <p style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#E85D42;margin:0 0 1rem">
        <a href="${SITE}/" style="color:#E85D42;text-decoration:none">SenPerspective</a>
        &middot; Sports
      </p>
      <h1 style="font-size:clamp(1.75rem,4vw,2.5rem);line-height:1.15;font-weight:900;margin:0 0 1rem">${esc(hub.heading)}</h1>
      <p style="font-size:1.1rem;font-weight:600;line-height:1.65;margin:0 0 1.5rem">${esc(hub.intro)}</p>
      ${sectionsHtml}
      <p style="font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:1rem;margin-top:2rem">
        <a href="${SITE}/larene" style="color:#E85D42;text-decoration:none">Perspective Group</a> &middot; Dakar, Sénégal
      </p>
    </div>`;

  return applyHead(shell, {
    a: { title: hub.heading, category: 'Sports' },
    lang: 'fr',
    title: hub.title,
    desc: hub.description,
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
    await writeFile(path.join(dir, 'index.html'), renderArticle(a, shell, 'fr'), 'utf8');
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
