-- snap_history jadvali — har bir snap/scan saqlanadi
-- Supabase Dashboard → SQL Editor da bitta blokni ishga tushiring.

-- ========== JADVAL ==========
create table if not exists public.snap_history (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  antique_id bigint references public.antiques(id) on delete set null,
  payload jsonb not null default '{}'::jsonb
);

comment on column public.snap_history.image_url is 'Snap rasmi — Storage: snaps/{user_id}/{id}.jpg';
comment on column public.snap_history.antique_id is 'Agar bu snap "Add to Collection" qilingan bo''lsa, shu antique';
comment on column public.snap_history.payload is 'O''sha paytdagi natija: name, condition_grade, market_value_min, ...';

-- ========== RLS ==========
alter table public.snap_history enable row level security;

create policy "Users can CRUD own snap_history"
  on public.snap_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========== INDEKSLAR ==========
create index if not exists idx_snap_history_user_id on public.snap_history(user_id);
create index if not exists idx_snap_history_created_at on public.snap_history(created_at desc);
create index if not exists idx_snap_history_antique_id on public.snap_history(antique_id) where antique_id is not null;
