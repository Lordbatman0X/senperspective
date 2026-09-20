import { useEffect } from 'react';
import { useStore } from '../store';

export interface SEOBreadcrumbItem {
  name: string;
  url: string;
}

export interface SEOArticleData {
  headline: string;
  description?: string;
  imageUrl?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  section?: string;
}

export interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  type?: 'website' | 'article';
  articleData?: SEOArticleData;
  breadcrumbs?: SEOBreadcrumbItem[];
}

export function useSEO({ 
  title, 
  description, 
  keywords, 
  canonical, 
  ogImage,
  type = 'website',
  articleData,
  breadcrumbs 
}: SEOProps) {
  const siteSettings = useStore(s => s.siteSettings);
  const language = useStore(s => s.language) || 'fr';

  useEffect(() => {
    // Synchronize HTML language attribute
    document.documentElement.lang = language === 'en' ? 'en' : 'fr';

    // 1. Determine title with suffix cleanly
    let fullTitle = title;
    if (siteSettings?.seoTitleSuffix && !title.includes('|') && !title.includes('—')) {
      const cleanedSuffix = siteSettings.seoTitleSuffix.trim();
      if (cleanedSuffix.startsWith('|') || cleanedSuffix.startsWith('—')) {
        fullTitle = `${title} ${cleanedSuffix}`;
      } else {
        fullTitle = `${title} | ${cleanedSuffix}`;
      }
    }
    document.title = fullTitle;

    // Fallbacks from siteSettings
    const effectiveDesc = description ?? siteSettings?.seoDefaultDesc ?? "SenPerspective — Grand journal d'information, de décryptage et d'analyse basé à Dakar. Politique, Économie, Société, Tech, Culture, Sports, Santé et International.";
    const effectiveKeywords = keywords ?? siteSettings?.seoDefaultKeywords ?? "Sénégal, Dakar, SenPerspective, Perspective Group, actualités sénégalaises, politique, économie, décryptages, enquêtes, société, tech, international";
    const effectiveCanonical = canonical ?? (siteSettings?.seoCanonicalBase ? `${siteSettings.seoCanonicalBase}${window.location.pathname}` : `https://senperspective.com${window.location.pathname}`);
    const effectiveOgImage = ogImage ?? siteSettings?.seoOgImage ?? "https://senperspective.com/og-preview.jpg";
    const robotsContent = siteSettings?.seoRobotsIndex ?? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

    // Helper to create or update meta/link tags
    const setMetaTag = (nameAttr: 'name' | 'property', nameVal: string, contentVal: string) => {
      let tag = document.querySelector(`meta[${nameAttr}="${nameVal}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(nameAttr, nameVal);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', contentVal);
    };

    // 2. Meta description, keywords, robots
    setMetaTag('name', 'description', effectiveDesc);
    setMetaTag('name', 'keywords', effectiveKeywords);
    setMetaTag('name', 'robots', robotsContent);

    if (siteSettings?.seoGoogleSiteVerification) {
      setMetaTag('name', 'google-site-verification', siteSettings.seoGoogleSiteVerification);
    }

    // 3. Update canonical link tag
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', effectiveCanonical);

    // 4. Update OpenGraph & Twitter tags
    setMetaTag('property', 'og:site_name', 'SenPerspective');
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', effectiveDesc);
    setMetaTag('property', 'og:url', effectiveCanonical);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:image', effectiveOgImage);
    setMetaTag('property', 'og:locale', language === 'en' ? 'en_US' : 'fr_SN');

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:site', '@SenPerspective');
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', effectiveDesc);
    setMetaTag('name', 'twitter:image', effectiveOgImage);

    // 5. Schema.org JSON-LD structured data injection
    const jsonLdScripts: any[] = [];

    if (type === 'article' && articleData) {
      const newsArticleSchema: any = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": effectiveCanonical
        },
        "headline": articleData.headline,
        "description": articleData.description || effectiveDesc,
        "image": [articleData.imageUrl || effectiveOgImage],
        "datePublished": articleData.datePublished || new Date().toISOString(),
        "dateModified": articleData.dateModified || articleData.datePublished || new Date().toISOString(),
        "inLanguage": language === 'en' ? 'en' : 'fr',
        "author": {
          "@type": "Person",
          "name": articleData.author || "Rédaction SenPerspective"
        },
        "publisher": {
          "@type": "NewsMediaOrganization",
          "name": "SenPerspective",
          "url": "https://senperspective.com",
          "parentOrganization": {
            "@type": "Organization",
            "name": "Perspective Group",
            "url": "https://senperspective.com"
          },
          "logo": {
            "@type": "ImageObject",
            "url": "https://senperspective.com/favicon.png"
          }
        }
      };

      if (articleData.section) {
        newsArticleSchema["articleSection"] = articleData.section;
      }

      jsonLdScripts.push(newsArticleSchema);
    } else if (window.location.pathname === '/' || window.location.pathname === '') {
      jsonLdScripts.push({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "SenPerspective",
        "alternateName": "Perspective Group",
        "url": "https://senperspective.com",
        "description": effectiveDesc,
        "inLanguage": "fr",
        "publisher": {
          "@type": "NewsMediaOrganization",
          "name": "Perspective Group",
          "url": "https://senperspective.com",
          "logo": "https://senperspective.com/favicon.png",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Dakar",
            "addressCountry": "SN"
          }
        }
      });
    }

    if (breadcrumbs && breadcrumbs.length > 0) {
      jsonLdScripts.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "item": item.url
        }))
      });
    }

    // Insert or update script tag for JSON-LD
    let scriptTag = document.getElementById('senperspective-jsonld') as HTMLScriptElement | null;
    if (jsonLdScripts.length > 0) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'senperspective-jsonld';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(jsonLdScripts.length === 1 ? jsonLdScripts[0] : jsonLdScripts);
    } else if (scriptTag) {
      scriptTag.remove();
    }

  }, [
    title, 
    description, 
    keywords, 
    canonical, 
    ogImage,
    type,
    language,
    JSON.stringify(articleData),
    JSON.stringify(breadcrumbs),
    siteSettings?.seoTitleSuffix, 
    siteSettings?.seoDefaultDesc, 
    siteSettings?.seoDefaultKeywords, 
    siteSettings?.seoCanonicalBase,
    siteSettings?.seoOgImage,
    siteSettings?.seoRobotsIndex,
    siteSettings?.seoGoogleSiteVerification
  ]);
}

