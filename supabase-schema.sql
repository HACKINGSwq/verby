-- Verby v7.9 Cloud Sync + Realtime schema
-- Run in Supabase SQL Editor

create table if not exists public.verby_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  display_name text,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.verby_chars (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists verby_chars_user_idx on public.verby_chars(user_id);

create table if not exists public.verby_chats (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  char_id text,
  thread_id text,
  messages jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);
create index if not exists verby_chats_user_idx on public.verby_chats(user_id);
create index if not exists verby_chats_char_idx on public.verby_chats(char_id);

create table if not exists public.verby_follows (
  follower_id uuid references auth.users(id) on delete cascade,
  following_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

alter table public.verby_profiles enable row level security;
alter table public.verby_chars enable row level security;
alter table public.verby_chats enable row level security;
alter table public.verby_follows enable row level security;

do $$ begin
  create policy "profiles_own" on public.verby_profiles
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "chars_own" on public.verby_chars
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "chats_own" on public.verby_chats
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "follows_own" on public.verby_follows
    for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
exception when duplicate_object then null; end $$;

alter publication supabase_realtime add table public.verby_chats;
