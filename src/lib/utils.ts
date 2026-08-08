import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Article } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
