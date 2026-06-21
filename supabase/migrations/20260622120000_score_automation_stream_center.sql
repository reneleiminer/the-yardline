create extension if not exists pgcrypto;

create table if not exists public.score_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  name text not null,
  description text,
  is_enabled boolean not null default false,
  source_type text not null default 'not_configured',
  source_url text,
  league_id uuid references public.leagues(id) on delete set null,
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_team_mappings (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.score_providers(provider_key) on delete cascade,
  league_id uuid references public.leagues(id) on delete set null,
  external_team_name text not null,
  external_team_id text,
  yardline_team_id uuid not null references public.teams(id) on delete cascade,
  confidence numeric(5,4) not null default 0,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_game_mappings (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.score_providers(provider_key) on delete cascade,
  external_game_id text not null,
  yardline_game_id uuid not null references public.games(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete set null,
  matched_at timestamptz not null default now(),
  confidence numeric(5,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_key, external_game_id)
);

create table if not exists public.score_import_runs (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  league_id uuid references public.leagues(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed', 'disabled', 'not_configured')),
  games_checked integer not null default 0,
  games_matched integer not null default 0,
  scores_found integer not null default 0,
  scores_updated integer not null default 0,
  suggestions_created integer not null default 0,
  conflicts_found integer not null default 0,
  error_message text,
  raw_summary jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.score_import_suggestions (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  league_id uuid references public.leagues(id) on delete set null,
  game_id uuid not null references public.games(id) on delete cascade,
  external_game_id text,
  detected_home_score integer,
  detected_away_score integer,
  detected_status text,
  detected_kickoff timestamptz,
  detected_home_team_name text,
  detected_away_team_name text,
  current_home_score integer,
  current_away_score integer,
  current_status text,
  confidence numeric(5,4) not null default 0,
  source_url text,
  raw_payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'ignored', 'conflict', 'failed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.app_users(id) on delete set null
);

create table if not exists public.score_update_logs (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  provider_key text,
  old_home_score integer,
  old_away_score integer,
  new_home_score integer,
  new_away_score integer,
  old_status text,
  new_status text,
  update_source text not null check (update_source in ('automation', 'admin_review', 'manual')),
  created_at timestamptz not null default now(),
  created_by uuid references public.app_users(id) on delete set null
);

create table if not exists public.game_streams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  provider text not null check (provider in ('youtube', 'twitch', 'custom', 'yardline')),
  stream_url text not null,
  embed_url text,
  title text,
  provider_label text,
  is_official boolean not null default false,
  is_yardline_stream boolean not null default false,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended', 'disabled')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.app_users(id) on delete set null
);

create table if not exists public.stream_channels (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_channel_id text,
  title text not null,
  assigned_game_id uuid references public.games(id) on delete set null,
  assigned_team_id uuid references public.teams(id) on delete set null,
  rtmp_url text,
  stream_key_encrypted text,
  playback_id text,
  playback_url text,
  status text not null default 'not_configured',
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_score_providers_enabled on public.score_providers(is_enabled);
create index if not exists idx_external_team_mappings_provider on public.external_team_mappings(provider_key, league_id);
create unique index if not exists idx_external_team_mappings_unique on public.external_team_mappings(provider_key, coalesce(external_team_id, ''), external_team_name, yardline_team_id);
create index if not exists idx_external_game_mappings_provider on public.external_game_mappings(provider_key, external_game_id);
create index if not exists idx_score_import_runs_provider_created on public.score_import_runs(provider_key, created_at desc);
create index if not exists idx_score_import_suggestions_status on public.score_import_suggestions(status, created_at desc);
create index if not exists idx_score_import_suggestions_game on public.score_import_suggestions(game_id);
create index if not exists idx_score_update_logs_game on public.score_update_logs(game_id, created_at desc);
create index if not exists idx_game_streams_game on public.game_streams(game_id, status);
create index if not exists idx_stream_channels_game on public.stream_channels(assigned_game_id);

insert into public.score_providers (provider_key, name, description, is_enabled, source_type, config)
values
  ('gfl_not_configured', 'GFL / GFL2 Connector', 'Provider-Grundlage fuer GFL/GFL2. Deaktiviert bis eine stabile offizielle Datenquelle konfiguriert ist.', false, 'not_configured', '{"league_family":"gfl"}'::jsonb),
  ('elf_not_configured', 'ELF / AFLE Connector', 'Provider-Grundlage fuer ELF/AFLE. Deaktiviert bis eine stabile offizielle Datenquelle konfiguriert ist.', false, 'not_configured', '{"league_family":"elf"}'::jsonb)
on conflict (provider_key) do nothing;

alter table public.score_providers enable row level security;
alter table public.external_team_mappings enable row level security;
alter table public.external_game_mappings enable row level security;
alter table public.score_import_runs enable row level security;
alter table public.score_import_suggestions enable row level security;
alter table public.score_update_logs enable row level security;
alter table public.game_streams enable row level security;
alter table public.stream_channels enable row level security;

create or replace function public.is_yardline_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users
    where id = auth.uid()
      and coalesce(role_slug, role) = 'admin'
  );
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'score_providers',
    'external_team_mappings',
    'external_game_mappings',
    'score_import_runs',
    'score_import_suggestions',
    'score_update_logs',
    'game_streams',
    'stream_channels'
  ]
  loop
    execute format('drop policy if exists "%s admin read" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s admin write" on public.%I', tbl, tbl);
    execute format('create policy "%s admin read" on public.%I for select using (public.is_yardline_admin())', tbl, tbl);
    execute format('create policy "%s admin write" on public.%I for all using (public.is_yardline_admin()) with check (public.is_yardline_admin())', tbl, tbl);
  end loop;
end $$;
