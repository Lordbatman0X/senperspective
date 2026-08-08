import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  canonical?: string;
}

export function useSEO({ title, description, keywords, canonical }: SEOProps) {
  useEffect(() => {
    // 1. Update document title
    document.title = title;

    // 2. Update description tag
    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.setAttribute('name', 'description');
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.setAttribute('content', description || "Journal d'information indépendant depuis Dakar. Analyses stratégiques de l'actualité politique et socio-économique ouest-africaine.");

    // 3. Update keywords tag
    let keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (!keywordsMeta) {
      keywordsMeta = document.createElement('meta');
      keywordsMeta.setAttribute('name', 'keywords');
      document.head.appendChild(keywordsMeta);
    }
    keywordsMeta.setAttribute('content', keywords || "Sénégal, dakar, l'arène, lutte sénégalaise, politique, actualité, afrique, perspective");

    // 4. Update canonical link tag
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical || window.location.href);

    // 5. Update OpenGraph tags
    const ogTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description || "Journal d'information indépendant depuis Dakar. Analyses stratégiques de l'actualité politique et socio-économique ouest-africaine." },
      { property: 'og:url', content: canonical || window.location.href },
      { property: 'og:type', content: 'website' }
    ];

    ogTags.forEach(({ property, content }) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

  }, [title, description, keywords, canonical]);
}
