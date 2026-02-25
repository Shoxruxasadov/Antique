-- Details va History tablari uchun yangi ustunlar.
-- Supabase Dashboard → SQL Editor da ishga tushiring yoki: supabase db push

alter table public.antiques
  add column if not exists specification jsonb,
  add column if not exists origin_provenance text,
  add column if not exists source text default 'AI Analysis',
  add column if not exists purchase_price numeric;

comment on column public.antiques.specification is 'Details tab: Case Material, Glass Type, Construction, Era, Style, Dimensions (Gemini dan)';
comment on column public.antiques.origin_provenance is 'Details tab: Origin & Provenance matni (Gemini dan)';
comment on column public.antiques.source is 'History tab: manba, masalan "Estate Sale" yoki "AI Analysis"';
comment on column public.antiques.purchase_price is 'History tab: xarid narxi (agar mavjud bo''lsa)';
