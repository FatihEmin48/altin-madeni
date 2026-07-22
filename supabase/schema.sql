-- Altın Madeni — Supabase şeması (bulut kayıt + skor tablosu)
-- Supabase panelinde: SQL Editor → bu dosyayı yapıştır → Run.
-- RLS (Row Level Security) sayesinde herkes yalnızca KENDİ kaydını yazabilir;
-- skor tablosu herkese açık okunur. anon public key istemcide güvenle durur.

-- === Bulut kayıtları ===
create table if not exists public.saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;

drop policy if exists "own save select" on public.saves;
create policy "own save select" on public.saves for select using (auth.uid() = user_id);
drop policy if exists "own save insert" on public.saves;
create policy "own save insert" on public.saves for insert with check (auth.uid() = user_id);
drop policy if exists "own save update" on public.saves;
create policy "own save update" on public.saves for update using (auth.uid() = user_id);

-- === Skor tablosu ===
create table if not exists public.leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  gems bigint not null default 0,
  total_gold double precision not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard read all" on public.leaderboard;
create policy "leaderboard read all" on public.leaderboard for select using (true);
drop policy if exists "leaderboard insert own" on public.leaderboard;
create policy "leaderboard insert own" on public.leaderboard for insert with check (auth.uid() = user_id);
drop policy if exists "leaderboard update own" on public.leaderboard;
create policy "leaderboard update own" on public.leaderboard for update using (auth.uid() = user_id);
