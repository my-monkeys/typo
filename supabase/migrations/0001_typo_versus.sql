-- typo versus mode — tables on the SHARED my-monkey project (klliwmgdyuatstjvzzbb, prefix typo_)
-- Applied 2026-05-31 via Supabase MCP apply_migration "typo_versus".
create table if not exists public.typo_versus_rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  config      jsonb not null default '{}'::jsonb,
  status      text not null default 'lobby',   -- lobby | racing | done
  host_id     text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.typo_versus_players (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.typo_versus_rooms(id) on delete cascade,
  player_id    text not null,
  nick         text not null default '',
  color        text not null default '',
  is_host      boolean not null default false,
  finished     boolean not null default false,
  finished_at  timestamptz,
  wpm          integer,
  accuracy     integer,
  joined_at    timestamptz not null default now(),
  unique (room_id, player_id)
);

create index if not exists typo_versus_players_room_idx on public.typo_versus_players (room_id);

-- RLS: anonymous public access, scoped to these two tables only.
alter table public.typo_versus_rooms   enable row level security;
alter table public.typo_versus_players enable row level security;

create policy "typo_versus_rooms anon rw" on public.typo_versus_rooms
  for all to anon, authenticated using (true) with check (true);
create policy "typo_versus_players anon rw" on public.typo_versus_players
  for all to anon, authenticated using (true) with check (true);

-- Realtime: emit full rows on update/delete so filtered postgres_changes work.
alter table public.typo_versus_rooms   replica identity full;
alter table public.typo_versus_players replica identity full;
alter publication supabase_realtime add table public.typo_versus_rooms;
alter publication supabase_realtime add table public.typo_versus_players;
