import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Article } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripHtmlTags(input: string | undefined | null): string {
  if (!input) return '';
  let str = String(input);
  // Replace break tags and closing paragraph tags with space/newlines
  str = str.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>/gi, '\n\n').replace(/<\/div>/gi, '\n');
  // Strip all HTML tags including <a...>, <font...>, etc.
  str = str.replace(/<[^>]*>/g, '');
  // Decode common HTML entities
  str = str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');
  return str.trim();
}

export function calculateReadingTime(article: Article, language: 'en' | 'fr' = 'en'): string {
  const content = article.body?.[language] || article.body?.fr || article.body?.en || "";
  const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  // Average reading speed: 200 words per minute.
  const minutes = wordCount > 0 ? Math.max(1, Math.round(wordCount / 200)) : (article.readingTime || 5);
  
  if (language === 'fr') {
    return `${minutes} min de lecture`;
  }
  return `${minutes} min read`;
}

export function formatRelativeDate(dateInput: string | Date, language: 'en' | 'fr' = 'en'): string {
  const date = new Date(dateInput);
  const now = new Date();
  
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours >= 0 && diffHours < 24) {
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins <= 1) {
        return language === 'fr' ? "À l'instant" : "Just now";
      }
      return language === 'fr' ? `Il y a ${diffMins} min` : `${diffMins}m ago`;
    }
    return language === 'fr' ? `Il y a ${diffHours} h` : `${diffHours}h ago`;
  } else {
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US');
  }
}

/**
 * Extracts a valid YouTube Video ID from any YouTube URL (watch, short, embed, or raw ID).
 */
export function extractYoutubeId(input: string | undefined | null): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  
  // If it's already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Match standard, youtu.be, shorts, embed, or iframe URLs
  const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return match[1];
  }
  
  return trimmed;
}

/**
 * Safely converts string, number, or {en, fr} object into a renderable React string child.
 */
export function getSafeText(val: any, language: 'en' | 'fr' = 'fr'): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    return val[language] || val.fr || val.en || val.name || val.title || val.label || val.tag || val.id || '';
  }
  return String(val);
}

export function formatCategory(cat: any, language: 'en' | 'fr' = 'fr'): string {
  if (!cat) return '';
  if (typeof cat === 'string') return cat;
  if (typeof cat === 'object') {
    return cat[language] || cat.fr || cat.en || cat.name || cat.id || String(cat);
  }
  return String(cat);
}
