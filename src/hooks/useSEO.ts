import { useEffect } from 'react';
import { useStore } from '../store';

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
}

export function useSEO({ title, description, keywords, canonical, ogImage }: SEOProps) {
  const siteSettings = useStore(s => s.siteSettings);

  useEffect(() => {
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
    const effectiveDesc = description ?? siteSettings?.seoDefaultDesc ?? "Perspective Group — Grand journal d'information et d'analyse basé à Dakar. Politique, Économie, Société, Tech, Culture, Sports, Santé et International.";
    const effectiveKeywords = keywords ?? siteSettings?.seoDefaultKeywords ?? "Sénégal, Dakar, Perspective Group, politique, économie, tech, culture, sports, santé, société, international, afrique";
    const effectiveCanonical = canonical ?? (siteSettings?.seoCanonicalBase ? `${siteSettings.seoCanonicalBase}${window.location.pathname}` : window.location.href);
    const effectiveOgImage = ogImage ?? siteSettings?.seoOgImage ?? "https://perspective.sn/og-preview.jpg";
    const robotsContent = siteSettings?.seoRobotsIndex ?? "index, follow, max-image-preview:large, max-snippet:-1";

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
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', effectiveDesc);
    setMetaTag('property', 'og:url', effectiveCanonical);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:image', effectiveOgImage);

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', effectiveDesc);
    setMetaTag('name', 'twitter:image', effectiveOgImage);

  }, [
    title, 
    description, 
    keywords, 
    canonical, 
    ogImage, 
    siteSettings?.seoTitleSuffix, 
    siteSettings?.seoDefaultDesc, 
    siteSettings?.seoDefaultKeywords, 
    siteSettings?.seoCanonicalBase,
    siteSettings?.seoOgImage,
    siteSettings?.seoRobotsIndex,
    siteSettings?.seoGoogleSiteVerification
  ]);
}

