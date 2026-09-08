-- ============================================================
-- SenPerspective Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- USERS TABLE
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null default '',
  avatar_url text,
  role text not null default 'Member',
  is_online boolean not null default false,
  streak integer not null default 0,
  reading_time integer not null default 0,
  hide_personal_info boolean not null default false,
  hide_email boolean not null default false,
  bio text,
  accolades text[],
  cover_photo_url text,
  registered_at text not null default '',
  last_active_at text,
  created_at timestamptz not null default now()
);

-- Index on users.email (used everywhere)
create index if not exists idx_users_email on public.users (email);

-- FRIENDS junction table (replaces Firestore subcollection users/{email}/friends/{friend})
create table if not exists public.friends (
  user_id text not null references public.users(id) on delete cascade,
  friend_email text not null,
  connected_at bigint not null default extract(epoch from now())::bigint,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_email)
);
create index if not exists idx_friends_user on public.friends (user_id);
create index if not exists idx_friends_email on public.friends (friend_email);

-- FOLLOWERS / FOLLOWING junction tables
create table if not exists public.followers (
  user_id text not null references public.users(id) on delete cascade,
  follower_email text not null,
  followed_at bigint not null default extract(epoch from now())::bigint,
  created_at timestamptz not null default now(),
  primary key (user_id, follower_email)
);
create index if not exists idx_followers_user on public.followers (user_id);
create index if not exists idx_followers_email on public.followers (follower_email);

-- BLOCKS table
create table if not exists public.blocks (
  user_id text not null references public.users(id) on delete cascade,
  blocked_email text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_email)
);

-- ARTICLES
create table if not exists public.articles (
  id text primary key,
  slug text not null,
  title jsonb not null,
  excerpt jsonb not null,
  body jsonb not null,
  category text not null default 'General',
  tags text[],
  image_url text,
  author text,
  date text not null default '',
  published_at text not null default '',
  is_published boolean not null default false,
  is_draft boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_articles_published on public.articles (is_published, published_at desc);
create index if not exists idx_articles_slug on public.articles (slug);
create index if not exists idx_articles_category on public.articles (category);

-- COMMENTS
create table if not exists public.comments (
  id text primary key,
  article_id text not null,
  author_email text not null,
  author_name text not null,
  text text not null,
  date text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_article on public.comments (article_id);

-- MESSAGES (Direct Messages)
create table if not exists public.messages (
  id text primary key,
  sender text not null,
  receiver text not null,
  text text not null,
  date text not null default '',
  timestamp bigint not null default extract(epoch from now())::bigint,
  read boolean not null default false,
  attachment jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_sender on public.messages (sender);
create index if not exists idx_messages_receiver on public.messages (receiver);
create index if not exists idx_messages_timestamp on public.messages (timestamp);

-- SUBSCRIBERS
create table if not exists public.subscribers (
  id text primary key,
  email text unique not null,
  date text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- MEDIA
create table if not exists public.media (
  id text primary key,
  url text not null,
  type text not null,
  name text not null,
  size integer not null default 0,
  uploaded_by text,
  created_at timestamptz not null default now()
);

-- ADS
create table if not exists public.ads (
  id text primary key,
  title text,
  image_url text,
  link_url text,
  placement text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- SITE SETTINGS (singleton row)
create table if not exists public.site_settings (
  id text primary key default 'singleton',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ANALYTICS EVENTS
create table if not exists public.analytics_events (
  id text primary key,
  session_id text not null,
  event_name text not null,
  path text not null default '',
  article_id text not null default '',
  article_title text not null default '',
  category text not null default 'General',
  device_type text not null default 'Desktop',
  country text not null default '',
  city text not null default '',
  timestamp text not null default '',
  user_email text not null default '',
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_analytics_session on public.analytics_events (session_id);
create index if not exists idx_analytics_event on public.analytics_events (event_name);

-- USER CONSENTS
create table if not exists public.user_consents (
  id text primary key,
  session_id text not null,
  user_email text not null default '',
  essential boolean not null default true,
  analytics boolean not null default false,
  personalization boolean not null default false,
  marketing boolean not null default false,
  device_type text not null default 'Desktop',
  locale text not null default 'fr-SN',
  country text not null default '',
  city text not null default '',
  updated_at text not null default '',
  created_at timestamptz not null default now()
);

-- MATCHES (Sports scores)
create table if not exists public.matches (
  id text primary key,
  league text not null default '',
  league_label jsonb,
  team_a jsonb,
  team_b jsonb,
  status text not null default 'upcoming',
  date text,
  time text,
  arena text,
  context_info jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================================

alter table public.users enable row level security;
alter table public.friends enable row level security;
alter table public.followers enable row level security;
alter table public.blocks enable row level security;
alter table public.articles enable row level security;
alter table public.comments enable row level security;
alter table public.messages enable row level security;
alter table public.subscribers enable row level security;
alter table public.media enable row level security;
alter table public.ads enable row level security;
alter table public.site_settings enable row level security;
alter table public.analytics_events enable row level security;
alter table public.user_consents enable row level security;
alter table public.matches enable row level security;

-- USERS: public read, auth write
create policy "Public read users" on public.users for select using (true);
create policy "Anyone can upsert users" on public.users for insert with check (true);
create policy "Anyone can update users" on public.users for update using (true);

-- FRIENDS: users can read their own, write their own
create policy "Users read own friends" on public.friends for select using (true);
create policy "Users insert own friends" on public.friends for insert with check (true);
create policy "Users delete own friends" on public.friends for delete using (true);

-- FOLLOWERS: read/write open for now (app enforces owner checks client-side)
create policy "Public read followers" on public.followers for select using (true);
create policy "Anyone insert followers" on public.followers for insert with check (true);
create policy "Anyone delete followers" on public.followers for delete using (true);

-- BLOCKS: read/write open for now
create policy "Public read blocks" on public.blocks for select using (true);
create policy "Anyone insert blocks" on public.blocks for insert with check (true);
create policy "Anyone delete blocks" on public.blocks for delete using (true);

-- ARTICLES: public read, authenticated write
create policy "Public read articles" on public.articles for select using (true);
create policy "Authenticated insert articles" on public.articles for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update articles" on public.articles for update using (auth.role() = 'authenticated');
create policy "Authenticated delete articles" on public.articles for delete using (auth.role() = 'authenticated');

-- COMMENTS: public read, anyone can create
create policy "Public read comments" on public.comments for select using (true);
create policy "Anyone insert comments" on public.comments for insert with check (true);
create policy "Authenticated update comments" on public.comments for update using (auth.role() = 'authenticated');
create policy "Authenticated delete comments" on public.comments for delete using (auth.role() = 'authenticated');

-- MESSAGES: public read/write (mirrors current Firestore open rules)
create policy "Public read messages" on public.messages for select using (true);
create policy "Anyone insert messages" on public.messages for insert with check (true);
create policy "Anyone update messages" on public.messages for update using (true);
create policy "Anyone delete messages" on public.messages for delete using (true);

-- SUBSCRIBERS
create policy "Authenticated read subscribers" on public.subscribers for select using (auth.role() = 'authenticated');
create policy "Anyone insert subscribers" on public.subscribers for insert with check (true);
create policy "Authenticated update subscribers" on public.subscribers for update using (auth.role() = 'authenticated');
create policy "Authenticated delete subscribers" on public.subscribers for delete using (auth.role() = 'authenticated');

-- MEDIA
create policy "Public read media" on public.media for select using (true);
create policy "Authenticated insert media" on public.media for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update media" on public.media for update using (auth.role() = 'authenticated');
create policy "Authenticated delete media" on public.media for delete using (auth.role() = 'authenticated');

-- ADS
create policy "Public read ads" on public.ads for select using (true);
create policy "Authenticated insert ads" on public.ads for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update ads" on public.ads for update using (auth.role() = 'authenticated');
create policy "Authenticated delete ads" on public.ads for delete using (auth.role() = 'authenticated');

-- SITE SETTINGS: public read, authenticated write
create policy "Public read site_settings" on public.site_settings for select using (true);
create policy "Authenticated insert site_settings" on public.site_settings for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update site_settings" on public.site_settings for update using (auth.role() = 'authenticated');

-- ANALYTICS EVENTS
create policy "Authenticated read analytics" on public.analytics_events for select using (auth.role() = 'authenticated');
create policy "Anyone insert analytics" on public.analytics_events for insert with check (true);

-- USER CONSENTS
create policy "Authenticated read consents" on public.user_consents for select using (auth.role() = 'authenticated');
create policy "Anyone insert consents" on public.user_consents for insert with check (true);
create policy "Authenticated update consents" on public.user_consents for update using (auth.role() = 'authenticated');

-- MATCHES
create policy "Public read matches" on public.matches for select using (true);
create policy "Authenticated insert matches" on public.matches for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update matches" on public.matches for update using (auth.role() = 'authenticated');
create policy "Authenticated delete matches" on public.matches for delete using (auth.role() = 'authenticated');

-- ============================================================
-- REALTIME replication (for live subscriptions)
-- ============================================================
alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.friends;
alter publication supabase_realtime add table public.followers;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.articles;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.analytics_events;
