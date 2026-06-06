-- The Yardline Supabase setup notes
-- Run this in the Supabase SQL Editor when you want to enable Realtime for app data.
-- This does not enable RLS yet, because the current app still uses the public client
-- for internal admin writes. Enabling strict RLS before moving writes behind Supabase
-- Auth or server functions would break Admin, Data Editor, Media and Podcast tools.

create extension if not exists pgcrypto;

do $$
begin
  alter publication supabase_realtime add table public.leagues;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.teams;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.games;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.partners;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.tournaments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.standings_configs;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.app_updates;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.likes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.support_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.support_tickets;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.app_users;
exception when duplicate_object then null;
end $$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  subscription jsonb not null,
  visitor_id text,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_active_idx
  on public.push_subscriptions(active);

create table if not exists public.sent_push_events (
  event_key text primary key,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sent_push_events_created_at_idx
  on public.sent_push_events(created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.sent_push_events enable row level security;

-- Security hardening roadmap:
-- 1. Move internal accounts to Supabase Auth or Edge Functions.
-- 2. Enable RLS on write-heavy tables.
-- 3. Allow public SELECT for published/public data.
-- 4. Restrict INSERT/UPDATE/DELETE to authenticated roles via JWT claims or Edge Functions.
-- 5. Remove all direct admin writes from the browser public key.
