-- Blog va blog_category jadvallaridan barcha foydalanuvchilar o'qiy olishi uchun RLS policy.
-- Supabase Dashboard → SQL Editor da bajarishingiz mumkin.
-- blog va blog_category jadvallari allaqachon mavjud bo'lishi kerak.

-- blog_category: barcha o'qish
alter table public.blog_category enable row level security;
drop policy if exists "Allow public read blog_category" on public.blog_category;
create policy "Allow public read blog_category"
  on public.blog_category for select
  using (true);

-- blog: faqat published_at <= now() bo'lgan postlarni o'qish
alter table public.blog enable row level security;
drop policy if exists "Allow public read published blog" on public.blog;
create policy "Allow public read published blog"
  on public.blog for select
  using (published_at is not null and published_at <= now());
