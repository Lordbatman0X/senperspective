import type { SocialDesign } from './types/social';

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
  /**
   * True when this record came from the lightweight article index rather than the
   * full catalog, so it carries metadata only and its body still has to be
   * fetched. See `fetchAllArticles` in firebase/db.ts.
   */
  _indexOnly?: boolean;
  /**
   * The long-running investigation file this article belongs to, chosen in the
   * editor's Dossier box. Optional: an article does not have to belong to one.
   */
  dossier?: string;
  adImageUrl?: string;
  adLink?: string;

  perspectiveBrief?: PerspectiveBrief;
  keyActors?: KeyActor[];
  timeline?: TimelineEvent[];
  structuralForces?: StructuralForces;

  /**
   * The Social Studio design for this article: card layouts, per-layer styling
   * and the FR/EN caption overrides. Optional and additive — an article with
   * no `social` renders and behaves exactly as it did before the Studio
   * existed. It holds no copy of the title, excerpt or date, so editing those
   * here cannot be overwritten by the Studio and vice versa.
   */
  social?: SocialDesign;
  
  relatedArticleIds?: string[]; // IDs of related articles
  
  // SEO Metadata
  seoMetaTitle?: string;
  seoMetaDescription?: string;
  seoKeywords?: string;
  seoCanonicalUrl?: string;
  seoOgImage?: string;
  seoRobotsMeta?: string;
  
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

/**
 * Where a match row came from. Surfaced in the UI so readers can judge
 * confidence: an API scoreline is authoritative, while news/AI rows are
 * editorial signals that still need confirmation.
 */
export type MatchProvenance = "manual" | "api" | "news" | "ai";

/** Whether a scoreline has cleared the editorial confidence bar. */
export type MatchVerification = "verified" | "unverified";

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

  // ---------------------------------------------------------------------
  // Live-score fields (Phase 1). All optional so existing seeded/editor
  // matches — which have none of them — keep rendering unchanged.
  // ---------------------------------------------------------------------

  /** Upstream provider key, e.g. "thesportsdb", "openligadb", "gnews". */
  source?: string;
  /** Human-readable page the row was derived from. */
  sourceUrl?: string;
  /** Stable id at the provider, used to de-duplicate across polls. */
  externalId?: string;
  /** Period / round label, e.g. "Q3", "2e mi-temps", "Round 5". */
  period?: string;
  /**
   * Sport bucket, used to group the board by discipline before league. Set by
   * the normalizers from the league registry; absent on editor-created rows,
   * which fall back to their league id.
   */
  sport?: "football" | "basketball" | "mma" | "wrestling" | "other";
  /** Live clock, e.g. "67'", "4:32 Q3". */
  clock?: string;
  /** How this row was produced. Defaults to "manual" when absent. */
  provenance?: MatchProvenance;
  /** Verification state. A scoreline is only "verified" when it came from a
   *  structured API or when two independent sources agreed. */
  verification?: MatchVerification;
  /** ISO timestamp of the last successful provider refresh. */
  updatedAt?: string;
  /** Team crest URLs when the provider exposes them. */
  teamALogo?: string;
  teamBLogo?: string;
  /** Set when the provider flags the fixture as postponed/suspended. */
  postponed?: boolean;
  /**
   * Marks placeholder/demo rows shipped with the app (the seeded Champions
   * League, World Cup, BAL, D1, Lutte and Navétanes fixtures).
   *
   * Those rows are INVENTED — fabricated teamings and scores like
   * "Real Madrid 2 - 3 PSG" and a Navétane match pinned at "88'" with a 1-1
   * score. Presenting them as results is misinformation, so every arena
   * surface filters them out. Only a match actually created in the admin panel
   * (no `isDemo` flag) is ever shown to readers.
   */
  isDemo?: boolean;
}

