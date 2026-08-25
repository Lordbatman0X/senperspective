export type Language = 'fr' | 'en';

export interface BilingualText {
  fr: string;
  en: string;
}

export type ArticleCategory = 
  | 'Politique' 
  | 'Économie' 
  | 'Société' 
  | 'International' 
  | 'Tech' 
  | 'Santé' 
  | 'Sports' 
  | 'People'
  | 'Gouvernance'
  | "L'Arène"
  | 'Dossiers'
  | 'Dossier'
  | 'Flash Info'
  | 'Flash'
  | 'Météo & Maritime'
  | 'Chaloupe & Transports'
  | 'Culture & People'
  | 'Tech & Innovation';

export type ArticleType = 'News' | 'Analysis' | 'Deep Dive' | 'Explainer' | 'Opinion';

export interface KeyActor {
  name: string;
  role: string;
  significance: BilingualText;
}

export interface TimelineEvent {
  date: string;
  description: BilingualText;
}

export interface PerspectiveBrief {
  whatHappened: BilingualText;
  whyItMatters: BilingualText;
  whatToWatchNext: BilingualText;
}

export interface StructuralForces {
  political: BilingualText;
  economic: BilingualText;
  social: BilingualText;
  international: BilingualText;
}

export interface Article {
  id: string;
  slug: string;
  category: ArticleCategory;
  type: ArticleType;
  title: BilingualText;
  excerpt: BilingualText;
  body: BilingualText;
  featuredImage: string;
  imageUrl?: string;
  author: string;
  date: string;
  readingTime: number; // in minutes
  tags: string[];
  
  youtubeVideoId?: string;
  commentsEnabled?: boolean;
  adImageUrl?: string;
  adLink?: string;

  perspectiveBrief?: PerspectiveBrief;
  keyActors?: KeyActor[];
  timeline?: TimelineEvent[];
  structuralForces?: StructuralForces;
  
  relatedArticleIds?: string[]; // IDs of related articles
  
  isPublished: boolean;
  isFeatured: boolean;
  isTrending?: boolean;
  views?: number;
  
  // RSS & Source Attribution Metadata
  sourceName?: string;
  sourceDomain?: string;
  feedUrl?: string;
  originalUrl?: string;
  sourceUrl?: string;

  validationReport?: {
    passed: boolean;
    checks: Array<{ label: string; status: 'passed' | 'failed' | 'warning' }>;
  };
}

export interface Match {
  id: string;
  league: "world-cup" | "nba-bal" | "d1-basket" | "wrestling" | "navetane" | string;
  leagueLabel: { fr: string; en: string };
  teamA: { name: string; score?: number; color: string };
  teamB: { name: string; score?: number; color: string };
  status: "live" | "upcoming" | "finished" | string;
  time?: string;
  date?: string;
  arena?: string;
  contextInfo?: { fr: string; en: string };
}

