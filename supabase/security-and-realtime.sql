-- The Yardline Supabase setup notes
-- Run this in the Supabase SQL Editor when you want to enable Realtime for app data.
-- This does not enable RLS yet, because the current app still uses the public client
-- for internal admin writes. Enabling strict RLS before moving writes behind Supabase
-- Auth or server functions would break Admin, Data Editor, Media and Podcast tools.

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

-- Security hardening roadmap:
-- 1. Move internal accounts to Supabase Auth or Edge Functions.
-- 2. Enable RLS on write-heavy tables.
-- 3. Allow public SELECT for published/public data.
-- 4. Restrict INSERT/UPDATE/DELETE to authenticated roles via JWT claims or Edge Functions.
-- 5. Remove all direct admin writes from the browser public key.
