-- ==============================================================================
-- MIGRATION 2026-09-08 — Run this ONCE in the Supabase Dashboard → SQL Editor
-- Purpose:
--   1. Fixes the "disappearing accounts" bug: users.deleted_at was missing while
--      the app filters reads with `deleted_at IS NULL` (usersQuery()).
--   2. Aligns the live `users` table with the code (dual snake_case/camelCase
--      columns so both server (centralApi) and client (AuthContext) writes work).
--   3. Creates tables the app depends on (password_resets, dispatches, daily_analytics).
--   4. Registers all tables in the realtime publication.
-- Idempotent: safe to run multiple times.
-- ==============================================================================

-- 1. USERS: add every column the application writes/reads (IF NOT EXISTS = safe)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_type TEXT DEFAULT 'password';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "authType" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "coverPhotoUrl" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reading_time INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "readingTime" INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hide_personal_info BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "hidePersonalInfo" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hide_email BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "hideEmail" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS accolades JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS friend_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "registeredAt" TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "passwordUpdatedAt" TIMESTAMPTZ;
-- THE critical missing column that made accounts "disappear":
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at);

-- 2. Founder / Super Admin: store ONLY the hash (matches hashPassword() in authCrypto.ts)
-- SHA-256("Perspective2026!" + "_perspective_auth_v2_2026_salt")
UPDATE public.users
SET password_hash = COALESCE(password_hash, '9d5f0b0df80463465ccc2b6db6fb368bab3d714871ebbf762d53e11ee3130b0e3'),
    password = NULL,
    role = 'Admin',
    email_verified = TRUE,
    "emailVerified" = TRUE
WHERE email = 'kadersdiaz3@gmail.com';

-- 3. Missing tables
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



-- 4. Realtime publication for every app table (idempotent)
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
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;
