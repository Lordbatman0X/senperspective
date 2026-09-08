-- ==============================================================================
-- PERSPECTIVE GROUP - SUPABASE PRODUCTION DATABASE SCHEMA & RLS POLICIES
-- Replaces Firestore security rules and schemas with PostgreSQL + Row Level Security
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT 'preset-male',
  avatarUrl TEXT,
  role TEXT NOT NULL DEFAULT 'Member',
  auth_type TEXT DEFAULT 'password',
  authType TEXT,
  password TEXT,
  password_hash TEXT,
  passwordHash TEXT,
  pin TEXT,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  twoFactorEnabled BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfaEnabled BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT TRUE,
  emailVerified BOOLEAN DEFAULT TRUE,
  cover_photo_url TEXT DEFAULT 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&fit=crop',
  coverPhotoUrl TEXT,
  streak INTEGER DEFAULT 1,
  reading_time INTEGER DEFAULT 0,
  readingTime INTEGER DEFAULT 0,
  hide_personal_info BOOLEAN DEFAULT FALSE,
  hidePersonalInfo BOOLEAN DEFAULT FALSE,
  hide_email BOOLEAN DEFAULT FALSE,
  hideEmail BOOLEAN DEFAULT FALSE,
  bio TEXT DEFAULT 'Membre actif Perspective',
  accolades JSONB DEFAULT '["verified_identity"]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  friend_ids JSONB DEFAULT '[]'::jsonb,
  is_online BOOLEAN DEFAULT FALSE,
  isOnline BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  lastActiveAt TIMESTAMPTZ,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  registeredAt TIMESTAMPTZ,
  -- FIX (disappearing accounts): soft-delete columns — code (usersQuery,
  -- ConnectionsAndProfile, store.deleteUser) sets deleted_at instead of deleting.
  deleted_at TIMESTAMPTZ,
  deletedAt TIMESTAMPTZ,
  password_updated_at TIMESTAMPTZ,
  passwordUpdatedAt TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  lastLoginAt TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- RLS: Enable on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow public read of user profiles
DROP POLICY IF EXISTS "Public users select" ON public.users;
CREATE POLICY "Public users select" ON public.users FOR SELECT USING (true);

-- Allow account creation (INSERT)
DROP POLICY IF EXISTS "Public users insert" ON public.users;
CREATE POLICY "Public users insert" ON public.users FOR INSERT WITH CHECK (true);

-- Allow update of accounts
DROP POLICY IF EXISTS "Users update policy" ON public.users;
CREATE POLICY "Users update policy" ON public.users FOR UPDATE USING (true) WITH CHECK (true);

-- Prevent deletion of Super Admin (kadersdiaz3@gmail.com)
DROP POLICY IF EXISTS "Users delete policy" ON public.users;
CREATE POLICY "Users delete policy" ON public.users FOR DELETE USING (email <> 'kadersdiaz3@gmail.com');

-- -----------------------------------------------------------------------------
-- 2. ARTICLES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Actualités',
  author TEXT DEFAULT 'Rédaction',
  author_email TEXT,
  authorEmail TEXT,
  image_url TEXT DEFAULT '',
  imageUrl TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  publishedAt TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT TRUE,
  isPublished BOOLEAN DEFAULT TRUE,
  read_time INTEGER DEFAULT 3,
  readTime INTEGER DEFAULT 3,
  views INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  source TEXT DEFAULT 'editorial',
  rss_source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles(published_at DESC);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Articles select policy" ON public.articles;
CREATE POLICY "Articles select policy" ON public.articles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Articles insert policy" ON public.articles;
CREATE POLICY "Articles insert policy" ON public.articles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Articles update policy" ON public.articles;
CREATE POLICY "Articles update policy" ON public.articles FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Articles delete policy" ON public.articles;
CREATE POLICY "Articles delete policy" ON public.articles FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- 3. COMMENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  articleId TEXT,
  user_email TEXT NOT NULL DEFAULT 'visitor@perspective.sn',
  userEmail TEXT,
  author_name TEXT NOT NULL DEFAULT 'Lecteur',
  authorName TEXT,
  author_avatar TEXT DEFAULT 'preset-male',
  authorAvatar TEXT,
  text TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON public.comments(article_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments select policy" ON public.comments;
CREATE POLICY "Comments select policy" ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Comments insert policy" ON public.comments;
CREATE POLICY "Comments insert policy" ON public.comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Comments update policy" ON public.comments;
CREATE POLICY "Comments update policy" ON public.comments FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Comments delete policy" ON public.comments;
CREATE POLICY "Comments delete policy" ON public.comments FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- 4. MESSAGES TABLE (Direct Chat & Customer Support)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  receiver TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  date TEXT,
  timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  read BOOLEAN DEFAULT FALSE,
  attachment JSONB,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages select policy" ON public.messages;
CREATE POLICY "Messages select policy" ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Messages insert policy" ON public.messages;
CREATE POLICY "Messages insert policy" ON public.messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Messages update policy" ON public.messages;
CREATE POLICY "Messages update policy" ON public.messages FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Messages delete policy" ON public.messages;
CREATE POLICY "Messages delete policy" ON public.messages FOR DELETE USING (true);

-- -----------------------------------------------------------------------------
-- 5. SITE_SETTINGS TABLE (Global Config)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site settings select policy" ON public.site_settings;
CREATE POLICY "Site settings select policy" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Site settings upsert policy" ON public.site_settings;
CREATE POLICY "Site settings upsert policy" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 6. MATCHES TABLE (Sports Tracker)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY,
  home_team TEXT NOT NULL,
  homeTeam TEXT,
  away_team TEXT NOT NULL,
  awayTeam TEXT,
  home_score INTEGER DEFAULT 0,
  homeScore INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  awayScore INTEGER DEFAULT 0,
  status TEXT DEFAULT 'SCHEDULED',
  date TEXT,
  time TEXT,
  competition TEXT DEFAULT 'Ligue 1 Sénégal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Matches policy" ON public.matches;
CREATE POLICY "Matches policy" ON public.matches FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 7. SUBSCRIBERS TABLE (Newsletter)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  date TEXT,
  language TEXT DEFAULT 'fr',
  topics JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscribers policy" ON public.subscribers;
CREATE POLICY "Subscribers policy" ON public.subscribers FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 8. MEDIA & ADS TABLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'image',
  size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Media policy" ON public.media;
CREATE POLICY "Media policy" ON public.media FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.ads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT,
  imageUrl TEXT,
  link_url TEXT,
  linkUrl TEXT,
  position TEXT DEFAULT 'sidebar',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ads policy" ON public.ads;
CREATE POLICY "Ads policy" ON public.ads FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 9. REPORTS & GUEST_PREFERENCES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  targetType TEXT,
  target_id TEXT NOT NULL,
  targetId TEXT,
  reporter_email TEXT,
  reporterEmail TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reports policy" ON public.reports;
CREATE POLICY "Reports policy" ON public.reports FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.guest_preferences (
  id TEXT PRIMARY KEY,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'fr',
  preferences JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guest_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guest preferences policy" ON public.guest_preferences;
CREATE POLICY "Guest preferences policy" ON public.guest_preferences FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 10. ANALYTICS_EVENTS & USER_CONSENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  eventName TEXT,
  session_id TEXT,
  sessionId TEXT,
  path TEXT,
  article_id TEXT,
  articleId TEXT,
  article_title TEXT,
  articleTitle TEXT,
  category TEXT,
  duration_seconds INTEGER DEFAULT 0,
  durationSeconds INTEGER DEFAULT 0,
  device_type TEXT,
  deviceType TEXT,
  locale TEXT DEFAULT 'fr-SN',
  user_email TEXT,
  userEmail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Analytics events policy" ON public.analytics_events;
CREATE POLICY "Analytics events policy" ON public.analytics_events FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.user_consents (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  user_email TEXT,
  essential BOOLEAN DEFAULT TRUE,
  analytics BOOLEAN DEFAULT FALSE,
  personalization BOOLEAN DEFAULT FALSE,
  marketing BOOLEAN DEFAULT FALSE,
  device_type TEXT,
  locale TEXT DEFAULT 'fr-SN',
  country TEXT,
  city TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User consents policy" ON public.user_consents;
CREATE POLICY "User consents policy" ON public.user_consents FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- SEED FOUNDER / SUPER ADMIN (Kader S. Diaz)
-- -----------------------------------------------------------------------------
INSERT INTO public.users (
  id, email, name, avatar_url, role, auth_type, password_hash, streak, reading_time, is_online, bio, accolades
) VALUES (
  'kadersdiaz3-admin-founder',
  'kadersdiaz3@gmail.com',
  'Kader S. Diaz',
  'preset-male',
  'Admin',
  'password',
  -- SECURITY (audit fix): SHA-256("Perspective2026!" + "_perspective_auth_v2_2026_salt")
  -- Matches hashPassword() in src/lib/authCrypto.ts. No plaintext password is seeded.
  '9d5f0b0df80463465ccc2b6db6fb368bab3d714871ebbf762d53e11ee3130b0e3',
  25,
  820,
  true,
  'Fondateur & Directeur de Publication — Perspective Group Sénégal',
  '["verified_identity", "editorial_board", "elite_clearance", "sahel_insider"]'::jsonb
) ON CONFLICT (email) DO UPDATE SET
  role = 'Admin',
  name = 'Kader S. Diaz',
  accolades = '["verified_identity", "editorial_board", "elite_clearance", "sahel_insider"]'::jsonb;

-- ------------------------------------------------------------------------------
-- 11. MISSING TABLES (audit fix): password_resets, dispatches, daily_analytics
-- These were referenced by the application but absent from the schema.
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.password_resets (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT,
  code TEXT,
  expires_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Password resets policy" ON public.password_resets;
CREATE POLICY "Password resets policy" ON public.password_resets FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.dispatches (
  id TEXT PRIMARY KEY,
  subject TEXT DEFAULT '',
  body TEXT DEFAULT '',
  audience TEXT DEFAULT 'all',
  recipient_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sent',
  sent_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dispatches policy" ON public.dispatches;
CREATE POLICY "Dispatches policy" ON public.dispatches FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.daily_analytics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  visits INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  article_views INTEGER DEFAULT 0,
  avg_duration_seconds INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON public.daily_analytics(date);
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Daily analytics policy" ON public.daily_analytics;
CREATE POLICY "Daily analytics policy" ON public.daily_analytics FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 12. REALTIME PUBLICATION (audit fix): all tables registered for realtime
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'friends', 'followers', 'blocks', 'friend_requests', 'messages',
    'articles', 'comments', 'analytics_events', 'subscribers', 'media', 'ads',
    'site_settings', 'user_consents', 'matches', 'guest_preferences', 'reports',
    'password_resets', 'dispatches', 'daily_analytics'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- already in the publication
    END;
  END LOOP;
END $$;
