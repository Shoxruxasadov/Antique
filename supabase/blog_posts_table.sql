-- Blog postlar uchun jadval (AllPostsScreen, PostScreen, HomeScreen blog qatori)
-- Supabase Dashboard → SQL Editor da bajarishingiz mumkin.

-- ========== BLOG_POSTS ==========
create table if not exists public.blog_posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Kontent
  title text not null,
  slug text unique,
  excerpt text,
  content text,
  read_time_minutes int2 default 3,

  -- Ko‘rinish
  image_url text,
  category text not null default 'Latest Posts',

  -- Qachon nashr qilindi (null = qoralama)
  published_at timestamptz,

  -- Ixtiyoriy: muallif (admin panel orqali yozishda ishlatish mumkin)
  author_id uuid references auth.users(id) on delete set null
);

comment on column public.blog_posts.slug is 'URL uchun: understanding-antique-rarity';
comment on column public.blog_posts.category is 'Tab uchun: Analyzing, News, Latest Posts';
comment on column public.blog_posts.read_time_minutes is 'App da "X min read"';
comment on column public.blog_posts.published_at is 'Null = draft, to‘ldirilgan = nashr sanasi';

alter table public.blog_posts enable row level security;

-- Barcha foydalanuvchilar faqat nashr qilingan postlarni o‘qiy oladi
create policy "Anyone can read published blog posts"
  on public.blog_posts for select
  using (published_at is not null and published_at <= now());

-- Muallif o‘z postini yangilay/o‘chira oladi (author_id bo‘lsa)
create policy "Authors can update own blog posts"
  on public.blog_posts for all
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- Service role yoki anon key orqali insert qilish kerak bo‘lsa, alohida policy qo‘shing
-- Masalan: Dashboard orqali post qo‘shishda service role ishlatiladi

create index if not exists idx_blog_posts_published_at on public.blog_posts(published_at desc nulls last);
create index if not exists idx_blog_posts_category on public.blog_posts(category);
create index if not exists idx_blog_posts_slug on public.blog_posts(slug) where slug is not null;

-- updated_at avtomatik
drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- ========== Namuna ma'lumot (ixtiyoriy) ==========
-- Bir nechta post qo‘shish uchun:
/*
insert into public.blog_posts (title, slug, excerpt, content, read_time_minutes, category, published_at) values
  (
    'Understanding Antique Rarity: What Makes a Antique Valuable?',
    'understanding-antique-rarity',
    'Age, condition, and market demand all play a role.',
    'Age, condition, historical significance, craftsmanship, and market demand all play a role in determining an item''s value.\n\n1. Age Alone Is Not Enough\n\nWhile antiques are typically defined as objects at least 100 years old...',
    3,
    'Analyzing',
    now()
  ),
  (
    'Understanding Coin Rarity: What Makes a Coin Valuable?',
    'understanding-coin-rarity',
    null,
    'Content here...',
    5,
    'News',
    now()
  ),
  (
    'Caring for Vintage Porcelain and Ceramics',
    'caring-vintage-porcelain',
    null,
    'Content here...',
    4,
    'Latest Posts',
    now()
  );
*/
