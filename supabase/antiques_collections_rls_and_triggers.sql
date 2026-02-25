-- Jadvallar yaratilgandan keyin bajarish: RLS, policy, indekslar, updated_at trigger
-- Supabase Dashboard → SQL Editor da ishga tushiring.

-- ========== 0. (Ixtiyoriy) created_at / updated_at default ==========
-- Agar jadval yaratishda default bo'lmasa, insertda now() avtomatik ishlashi uchun:
-- alter table public.antiques alter column created_at set default now();
-- alter table public.antiques alter column updated_at set default now();
-- alter table public.collections alter column created_at set default now();
-- alter table public.collections alter column updated_at set default now();

-- ========== 1. RLS yoqish ==========
alter table public.antiques enable row level security;
alter table public.collections enable row level security;

-- ========== 2. Policy: user faqat o'z qatorlariga kirishi mumkin ==========
create policy "Users can CRUD own antiques"
  on public.antiques for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can CRUD own collections"
  on public.collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========== 3. Indekslar (tezroq so'rovlar uchun) ==========
create index if not exists idx_antiques_user_id on public.antiques(user_id);
create index if not exists idx_antiques_created_at on public.antiques(created_at desc);

create index if not exists idx_collections_user_id on public.collections(user_id);
create index if not exists idx_collections_created_at on public.collections(created_at desc);

-- ========== 4. updated_at avtomatik yangilash ==========
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger antiques_updated_at
  before update on public.antiques
  for each row execute function public.set_updated_at();

create trigger collections_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();
