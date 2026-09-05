/**
 * Client-Side AI and RSS Engine
 * Allows the Perspective Group frontend (when hosted statically on Firebase/Vercel/Cloudflare)
 * to perform AI rewriting, timeline generation, RSS feed reading, and provider diagnostics
 * directly from the browser using user API keys stored in localStorage.
 */

export interface ClientRewriteOptions {
  article: any;
  prompt?: string;
  category?: string;
  type?: string;
  preferredEngine?: string;
}

export interface ClientRewriteResult {
  success: boolean;
  message?: string;
  engineUsed: string;
  article: any;
  error?: string;
}

export interface ClientRssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  guid?: string;
  category?: string;
  enclosure?: { url: string; type?: string };
}

/**
 * Gets the cleanest available API key from localStorage
 */
export function getClientApiKey(provider: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const p = provider.toLowerCase();
  const val = localStorage.getItem(`api_key_${p}`) || localStorage.getItem(`${p.toUpperCase()}_API_KEY`);
  if (!val) return null;
  const trimmed = val.replace(/^["']|["']$/g, '').trim();
  return trimmed && trimmed !== 'undefined' && trimmed !== 'null' ? trimmed : null;
}

/**
 * Tests an AI provider directly from the client browser
 */
export async function clientTestProvider(provider: string): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
  modelUsed?: string;
}> {
  const p = provider.toUpperCase();
  const startTime = Date.now();

  try {
    if (p === 'GEMINI') {
      const key = getClientApiKey('gemini');
      if (!key) throw new Error('Clé API Gemini non configurée dans le navigateur.');
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Réponds uniquement par: OK' }] }]
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'Google Gemini 2.5 Flash opérationnel (Test direct navigateur)',
        modelUsed: 'gemini-2.5-flash'
      };
    }

    if (p === 'OPENAI') {
      const key = getClientApiKey('openai');
      if (!key) throw new Error('Clé API OpenAI non configurée.');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'OpenAI GPT-4o Mini opérationnel (Test direct navigateur)',
        modelUsed: 'gpt-4o-mini'
      };
    }

    if (p === 'GROQ') {
      const key = getClientApiKey('groq');
      if (!key) throw new Error('Clé API Groq non configurée.');
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'Groq Llama 3.3 70B opérationnel (Test direct navigateur)',
        modelUsed: 'llama-3.3-70b-versatile'
      };
    }

    if (p === 'OPENROUTER') {
      const key = getClientApiKey('openrouter');
      if (!key) throw new Error('Clé API OpenRouter non configurée.');
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'OpenRouter opérationnel (Test direct navigateur)',
        modelUsed: 'meta-llama/llama-3.3-70b-instruct'
      };
    }

    if (p === 'DEEPSEEK') {
      const key = getClientApiKey('deepseek');
      if (!key) throw new Error('Clé API DeepSeek non configurée.');
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'DeepSeek Chat opérationnel (Test direct navigateur)',
        modelUsed: 'deepseek-chat'
      };
    }

    if (p === 'ANTHROPIC') {
      const key = getClientApiKey('anthropic');
      if (!key) throw new Error('Clé API Anthropic non configurée.');
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'Clé Anthropic enregistrée (Nécessite backend ou proxy CORS pour les requêtes de messages directs)',
        modelUsed: 'claude-3-5-sonnet'
      };
    }

    throw new Error(`Moteur ${provider} non supporté pour le test direct.`);
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      message: err.message || 'Erreur lors du test'
    };
  }
}

/**
 * Rewrites and polishes an article using direct client-side AI calls
 */
export async function clientRewriteArticle(options: ClientRewriteOptions): Promise<ClientRewriteResult> {
  const { article, prompt, category = 'Économie', type = 'Analysis', preferredEngine = 'auto' } = options;

  const geminiKey = getClientApiKey('gemini');
  const groqKey = getClientApiKey('groq');
  const openaiKey = getClientApiKey('openai');
  const openrouterKey = getClientApiKey('openrouter');
  const deepseekKey = getClientApiKey('deepseek');

  let engine = preferredEngine.toLowerCase();
  if (engine === 'auto') {
    if (geminiKey) engine = 'gemini';
    else if (groqKey) engine = 'groq';
    else if (openaiKey) engine = 'openai';
    else if (openrouterKey) engine = 'openrouter';
    else if (deepseekKey) engine = 'deepseek';
    else throw new Error('Aucune clé API IA disponible dans le navigateur. Rendez-vous dans l\'onglet Diagnostics pour renseigner votre clé Gemini, Groq ou OpenAI.');
  }

  const articleContext = typeof article === 'object' ? JSON.stringify(article) : String(article);
  const promptText = `Tu es l'Intelligence Éditoriale de Perspective Group ("L'actualité. Sans Filtre. Sans Compromis.").
RÉÉCRIS et PERFECTIONNE l'article suivant selon les standards d'investigation et d'analyse géopolitique/économique ouest-africaine.
Ton : Analytique, précis, sans jargon creux, sans clichés ("dans un monde en perpétuelle évolution").
Structure : Bilingue intégral (fr et en).

INSTRUCTIONS COMPLÉMENTAIRES DU RÉDACTEUR EN CHEF :
${prompt || 'Réécriture intégrale avec dossier analytique, Perspective Brief, acteurs clés et chronologie.'}

CATÉGORIE CIBLE : ${category}
FORMAT / TYPE D'ARTICLE : ${type}

DONNÉES SOURCE DE L'ARTICLE :
${articleContext}

RÉPONDS UNIQUEMENT PAR UN OBJET JSON STRICT respectant exactement ce schéma :
{
  "title": { "fr": "Titre percutant en français", "en": "Impactful English headline" },
  "excerpt": { "fr": "Chapeau analytique 2-3 phrases en français", "en": "Analytical executive summary in English" },
  "body": { "fr": "Corps de l'article approfondi en Markdown (au moins 4 paragraphes structurés avec sous-titres)", "en": "Deep investigative article in English (at least 4 structured paragraphs with markdown headings)" },
  "category": "${category}",
  "type": "${type}",
  "perspectiveBrief": {
    "whatHappened": { "fr": "Synthèse factuelle claire des faits", "en": "Clear factual overview of what took place" },
    "whyItMatters": { "fr": "Analyse d'impact structurel et enjeux cachés", "en": "Structural impact and strategic stakes" },
    "whatToWatchNext": { "fr": "Prochaines échéances, signaux faibles et perspectives", "en": "Upcoming milestones and forward trajectory" }
  },
  "keyActors": [
    { "name": "Nom de l'acteur ou institution", "role": "Rôle / Fonction", "significance": "Poids stratégique dans le dossier" }
  ],
  "timeline": [
    { "date": "Date ou repère", "description": { "fr": "Événement clé", "en": "Key event" } }
  ],
  "structuralForces": {
    "political": { "fr": "Dynamique politique", "en": "Political dynamics" },
    "economic": { "fr": "Leviers économiques et financiers", "en": "Economic & financial factors" },
    "social": { "fr": "Répercussions sociales et populaires", "en": "Social & public impact" },
    "international": { "fr": "Dimensions régionales et diplomatiques", "en": "Diplomatic & international angles" }
  },
  "tags": ["Tag1", "Tag2", "Tag3"]
}`;

  let rawContent = '';
  let modelUsed = '';

  if (engine === 'gemini') {
    if (!geminiKey) throw new Error('Clé Gemini manquante.');
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Erreur Gemini HTTP ${res.status}`);
    }
    const data = await res.json();
    rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    modelUsed = 'Gemini 2.5 Flash (Client Direct)';
  } else if (engine === 'groq') {
    if (!groqKey) throw new Error('Clé Groq manquante.');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: promptText }],
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Erreur Groq HTTP ${res.status}`);
    }
    const data = await res.json();
    rawContent = data?.choices?.[0]?.message?.content || '';
    modelUsed = 'Groq Llama 3.3 70B (Client Direct)';
  } else if (engine === 'openai') {
    if (!openaiKey) throw new Error('Clé OpenAI manquante.');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: promptText }],
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Erreur OpenAI HTTP ${res.status}`);
    }
    const data = await res.json();
    rawContent = data?.choices?.[0]?.message?.content || '';
    modelUsed = 'OpenAI GPT-4o Mini (Client Direct)';
  } else if (engine === 'openrouter') {
    if (!openrouterKey) throw new Error('Clé OpenRouter manquante.');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages: [{ role: 'user', content: promptText }],
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Erreur OpenRouter HTTP ${res.status}`);
    }
    const data = await res.json();
    rawContent = data?.choices?.[0]?.message?.content || '';
    modelUsed = 'OpenRouter Llama 3.3 (Client Direct)';
  } else {
    throw new Error(`Moteur IA ${engine} non disponible pour la réécriture directe.`);
  }

  // Parse JSON response safely
  let parsedArticle: any = null;
  try {
    const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    parsedArticle = JSON.parse(cleaned);
  } catch (e: any) {
    throw new Error('Le modèle IA n\'a pas renvoyé un format JSON valide: ' + e.message);
  }

  return {
    success: true,
    message: `Article réécrit avec succès via ${modelUsed}`,
    engineUsed: modelUsed,
    article: parsedArticle
  };
}

/**
 * Generates landmark events for investigation articles client-side
 */
export async function clientGenerateTimeline(title: string, excerpt: string, language: string = 'fr'): Promise<{
  success: boolean;
  events: Array<{ date: string; descriptionFr: string; descriptionEn: string }>;
}> {
  const geminiKey = getClientApiKey('gemini');
  const groqKey = getClientApiKey('groq');
  const openaiKey = getClientApiKey('openai');

  const promptText = `Génère 4 à 6 dates et repères chronologiques majeurs pour ce dossier d'investigation :
Titre : "${title}"
Contexte : "${excerpt}"

Réponds UNIQUEMENT par un tableau JSON d'objets :
[
  { "date": "Ex: Janvier 2024", "descriptionFr": "Explication en français", "descriptionEn": "Description in English" }
]`;

  let raw = '';
  if (geminiKey) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    if (res.ok) {
      const data = await res.json();
      raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    }
  } else if (groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: promptText }],
        response_format: { type: 'json_object' }
      })
    });
    if (res.ok) {
      const data = await res.json();
      raw = data?.choices?.[0]?.message?.content || '[]';
    }
  } else if (openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: promptText }]
      })
    });
    if (res.ok) {
      const data = await res.json();
      raw = data?.choices?.[0]?.message?.content || '[]';
    }
  }

  try {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const events = Array.isArray(parsed) ? parsed : (parsed.events || []);
    return { success: true, events };
  } catch (_) {
    return {
      success: true,
      events: [
        { date: 'Genèse', descriptionFr: 'Origine et premiers développements du dossier.', descriptionEn: 'Origins and initial dossier developments.' },
        { date: 'Phase critique', descriptionFr: 'Point de bascule stratégique et déclarations clés.', descriptionEn: 'Strategic turning point and key statements.' },
        { date: 'Situation actuelle', descriptionFr: 'État des forces et implications en cours.', descriptionEn: 'Current state of play and active implications.' }
      ]
    };
  }
}

/**
 * Fetches and parses an RSS feed directly from the client browser
 * Uses high-availability CORS bridge proxies when calling external feeds from HTTPS
 */
export async function clientFetchRssFeed(feedUrl: string, feedName?: string): Promise<{
  success: boolean;
  items: ClientRssItem[];
  count: number;
  feedUrl: string;
  source: string;
}> {
  if (!feedUrl || !feedUrl.trim()) {
    throw new Error('URL de flux RSS manquante.');
  }

  const cleanUrl = feedUrl.trim();

  // 1. Primary High-Reliability Strategy: Dedicated RSS-to-JSON services (zero-CORS)
  try {
    const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(rss2jsonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
        const items: ClientRssItem[] = data.items.map((it: any) => ({
          title: (it.title || '').trim(),
          link: it.link || it.guid || cleanUrl,
          description: (it.description || it.content || '').replace(/<[^>]*>?/gm, ' ').slice(0, 500).trim(),
          pubDate: it.pubDate || new Date().toISOString(),
          source: feedName || data.feed?.title || 'Agence de Presse',
          guid: it.guid || it.link || `rss-${Date.now()}-${Math.random()}`,
          category: it.categories?.[0] || 'Actualité',
          enclosure: it.enclosure?.link 
            ? { url: it.enclosure.link, type: it.enclosure.type } 
            : (it.thumbnail ? { url: it.thumbnail } : undefined)
        }));

        if (items.length > 0) {
          return {
            success: true,
            items,
            count: items.length,
            feedUrl: cleanUrl,
            source: 'rss2json Bridge'
          };
        }
      }
    }
  } catch (_) {
    // Continue to next bridge
  }

  // 2. Secondary Strategy: Feed2JSON RFC-compatible converter
  try {
    const feed2jsonUrl = `https://feed2json.org/convert?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(feed2jsonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        const items: ClientRssItem[] = data.items.map((it: any) => ({
          title: (it.title || '').trim(),
          link: it.url || it.id || cleanUrl,
          description: (it.summary || it.content_html || it.content_text || '').replace(/<[^>]*>?/gm, ' ').slice(0, 500).trim(),
          pubDate: it.date_published || it.date_modified || new Date().toISOString(),
          source: feedName || data.title || 'Agence de Presse',
          guid: it.id || it.url || `rss-${Date.now()}-${Math.random()}`,
          category: 'Actualité',
          enclosure: it.image ? { url: it.image } : (it.banner_image ? { url: it.banner_image } : undefined)
        }));

        if (items.length > 0) {
          return {
            success: true,
            items,
            count: items.length,
            feedUrl: cleanUrl,
            source: 'feed2json Bridge'
          };
        }
      }
    }
  } catch (_) {
    // Continue to next strategy
  }

  // 3. Tertiary Strategy: Raw XML bridges with DOMParser
  const proxyEndpoints = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`,
    `https://thingproxy.freeboard.io/fetch/${cleanUrl}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanUrl)}`,
    cleanUrl // Direct fetch attempt as fallback
  ];

  let xmlText = '';
  let successfulBridge = '';

  for (const endpoint of proxyEndpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml, */*' }
      });
      if (res.ok) {
        const text = await res.text();
        if (text && (text.includes('<rss') || text.includes('<feed') || text.includes('<item') || text.includes('<entry'))) {
          xmlText = text;
          successfulBridge = endpoint;
          break;
        }
      }
    } catch (_) {
      // Continue to next bridge
    }
  }

  if (xmlText) {
    // Parse XML using browser DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const items: ClientRssItem[] = [];

    // 1. Standard RSS 2.0 <item>
    const rssItems = xmlDoc.querySelectorAll('item');
    if (rssItems.length > 0) {
      rssItems.forEach((node) => {
        const title = node.querySelector('title')?.textContent?.trim() || '';
        const link = node.querySelector('link')?.textContent?.trim() || '';
        
        let desc = node.querySelector('description')?.textContent?.trim() || '';
        const contentEncoded = node.getElementsByTagNameNS('*', 'encoded')[0]?.textContent?.trim();
        if (contentEncoded && contentEncoded.length > desc.length) {
          desc = contentEncoded;
        }

        const pubDate = node.querySelector('pubDate')?.textContent?.trim() || new Date().toISOString();
        const guid = node.querySelector('guid')?.textContent?.trim() || link;
        const category = node.querySelector('category')?.textContent?.trim() || 'Actualité';

        let enclosure: { url: string; type?: string } | undefined;
        const encNode = node.querySelector('enclosure');
        if (encNode && encNode.getAttribute('url')) {
          enclosure = {
            url: encNode.getAttribute('url') || '',
            type: encNode.getAttribute('type') || undefined
          };
        }

        if (title) {
          items.push({
            title,
            link,
            description: desc.replace(/<[^>]*>?/gm, ' ').slice(0, 500).trim(),
            pubDate,
            source: feedName || 'Agence de Presse',
            guid,
            category,
            enclosure
          });
        }
      });
    } else {
      // 2. Atom <entry>
      const atomEntries = xmlDoc.querySelectorAll('entry');
      atomEntries.forEach((node) => {
        const title = node.querySelector('title')?.textContent?.trim() || '';
        let link = node.querySelector('link')?.getAttribute('href') || node.querySelector('link')?.textContent?.trim() || '';
        const summary = node.querySelector('summary')?.textContent?.trim() || node.querySelector('content')?.textContent?.trim() || '';
        const updated = node.querySelector('updated')?.textContent?.trim() || node.querySelector('published')?.textContent?.trim() || new Date().toISOString();
        const id = node.querySelector('id')?.textContent?.trim() || link;

        if (title) {
          items.push({
            title,
            link,
            description: summary.replace(/<[^>]*>?/gm, ' ').slice(0, 500).trim(),
            pubDate: updated,
            source: feedName || 'Dépêche Atom',
            guid: id
          });
        }
      });
    }

    if (items.length > 0) {
      return {
        success: true,
        items,
        count: items.length,
        feedUrl: cleanUrl,
        source: successfulBridge.includes('allorigins') ? 'CORS Bridge' : 'Direct XML'
      };
    }
  }

  // 4. Jina Reader fallback (extracts markdown links from RSS feed)
  try {
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
    const res = await fetch(jinaUrl);
    if (res.ok) {
      const markdown = await res.text();
      const regex = /###\s+\[(.*?)\]\((.*?)\)/g;
      const items: ClientRssItem[] = [];
      let match;
      while ((match = regex.exec(markdown)) !== null && items.length < 15) {
        const title = match[1]?.trim();
        const link = match[2]?.trim();
        if (title && !title.toLowerCase().includes('rss feed') && !title.toLowerCase().includes('accueil')) {
          items.push({
            title,
            link,
            description: title,
            pubDate: new Date().toISOString(),
            source: feedName || 'Dépêche Presse',
            guid: link || `jina-${Date.now()}-${items.length}`,
            category: 'Actualité'
          });
        }
      }

      if (items.length > 0) {
        return {
          success: true,
          items,
          count: items.length,
          feedUrl: cleanUrl,
          source: 'Jina Web Reader'
        };
      }
    }
  } catch (_) {
    // End of fallbacks
  }

  throw new Error(`Impossible de contacter le flux RSS (${cleanUrl}). Vérifiez la connectivité de la source ou son adresse.`);
}

/**
 * Automates fetching a feed and generating article drafts directly in the browser
 */
export async function clientProcessFeedAndGenerate(options: {
  feedUrl: string;
  feedName?: string;
  category?: string;
  maxItems?: number;
  type?: string;
  preferredEngine?: string;
  customPrompt?: string;
}): Promise<{
  success: boolean;
  articles: any[];
  generatedCount: number;
  engineUsed: string;
  error?: string;
}> {
  const { 
    feedUrl, 
    feedName, 
    category = 'Économie', 
    maxItems = 1, 
    type = 'News', 
    preferredEngine = 'auto',
    customPrompt 
  } = options;

  try {
    // 1. Fetch RSS items via client bridge
    const feedResult = await clientFetchRssFeed(feedUrl, feedName);
    if (!feedResult.success || !Array.isArray(feedResult.items) || feedResult.items.length === 0) {
      throw new Error(`Aucun article disponible dans le flux "${feedName || feedUrl}".`);
    }

    const itemsToProcess = feedResult.items.slice(0, maxItems);
    const createdArticles: any[] = [];
    let lastEngineUsed = '';

    for (const item of itemsToProcess) {
      const rewriteRes = await clientRewriteArticle({
        article: item,
        prompt: customPrompt || `Rédige un article d'actualité rigoureux et complet à partir de cette dépêche de presse : "${item.title}". Source : ${feedName || 'Dépêche'}.`,
        category,
        type,
        preferredEngine
      });

      if (rewriteRes.success && rewriteRes.article) {
        lastEngineUsed = rewriteRes.engineUsed;
        const newArt = {
          ...rewriteRes.article,
          id: 'art-wire-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          slug: 'wire-' + (item.title || 'article').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Date.now(),
          publishedAt: new Date().toISOString(),
          isPublished: false,
          sourceFeed: feedUrl,
          sourceName: feedName || feedResult.source,
          sourceUrl: item.link || feedUrl,
          author: 'Perspective Newsroom'
        };
        createdArticles.push(newArt);
      }
    }

    if (createdArticles.length === 0) {
      throw new Error('Échec de la rédaction des articles par le moteur IA client.');
    }

    return {
      success: true,
      articles: createdArticles,
      generatedCount: createdArticles.length,
      engineUsed: lastEngineUsed || 'IA Client'
    };
  } catch (err: any) {
    return {
      success: false,
      articles: [],
      generatedCount: 0,
      engineUsed: '',
      error: err?.message || 'Erreur lors du traitement du flux'
    };
  }
}
