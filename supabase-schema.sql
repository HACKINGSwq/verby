-- Verby v7.9 Cloud Sync schema (run in Supabase SQL editor)
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
create table if not exists public.verby_chats (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  char_id text,
  thread_id text,
  messages jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);
alter table public.verby_profiles enable row level security;
alter table public.verby_chars enable row level security;
alter table public.verby_chats enable row level security;
