-- Antiques va Collections jadvalari (Plant Single / Condition sahifasi uchun)
-- Supabase Dashboard → SQL Editor da ishga tushiring.

-- ========== ANTIQUES (bitta antikvar buyum) ==========
create table if not exists public.antiques (
  id bigint generated always as identity primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text,
  description text,
  image_url text,
  origin_country text,
  period_start_year int4,
  period_end_year int4,
  estimated_age_years int4,
  rarity_score float4,
  rarity_max_score int4 default 10,
  overall_condition_summary text,
  condition_grade text,
  condition_description text,
  market_value_min float4,
  market_value_max float4,
  avg_growth_percentage float4,
  mechanical_function_status text,
  mechanical_function_notes text,
  case_condition_status text,
  case_condition_notes text,
  dial_hands_condition_status text,
  dial_hands_condition_notes text,
  crystal_condition_status text,
  crystal_condition_notes text,
  category text,
  tags text[] default '{}',
  specification jsonb,
  origin_provenance text,
  source text default 'AI Analysis',
  purchase_price numeric
);

alter table public.antiques enable row level security;

create policy "Users can CRUD own antiques"
  on public.antiques for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_antiques_user_id on public.antiques(user_id);
create index if not exists idx_antiques_created_at on public.antiques(created_at desc);

-- ========== COLLECTIONS (collection_name, antiques_ids array) ==========
create table if not exists public.collections (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  collection_name text not null,
  description text,
  thumbnail_image_url text,
  antiques_ids bigint[] default '{}'
);

alter table public.collections enable row level security;

create policy "Users can CRUD own collections"
  on public.collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_collections_user_id on public.collections(user_id);

-- ========== SNAP_HISTORY (har bir snap/scan saqlanadi) ==========
-- Har safar user rasm olganda yoki Identify qilganda shu jadvalga qator qo‘shiladi.
create table if not exists public.snap_history (
  id bigint generated always as identity primary key,
  created_at timestamptz default now() not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  image_url text not null,
  antique_id bigint references public.antiques(id) on delete set null,
  payload jsonb default '{}'
);

comment on column public.snap_history.image_url is 'Snap rasmi — Storage: snaps/{user_id}/{id}.jpg';
comment on column public.snap_history.antique_id is 'Agar bu snap "Add to Collection" qilingan bo‘lsa, shu antique';
comment on column public.snap_history.payload is 'O‘sha paytdagi natija: name, condition_grade, market_value_min, ...';

alter table public.snap_history enable row level security;

create policy "Users can CRUD own snap_history"
  on public.snap_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_snap_history_user_id on public.snap_history(user_id);
create index if not exists idx_snap_history_created_at on public.snap_history(created_at desc);
create index if not exists idx_snap_history_antique_id on public.snap_history(antique_id) where antique_id is not null;

-- ========== updated_at avtomatik yangilash ==========
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists antiques_updated_at on public.antiques;
create trigger antiques_updated_at
  before update on public.antiques
  for each row execute function public.set_updated_at();

drop trigger if exists collections_updated_at on public.collections;
create trigger collections_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();
