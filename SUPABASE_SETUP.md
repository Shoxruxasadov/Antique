# Supabase integratsiya — kerakli ma’lumotlar

Login va Sign Up ishlashi uchun Supabase loyihangizdan quyidagilarni oling va loyihada sozlang.

## 1. Kerakli ma’lumotlar

| Ma’lumot | Qayerdan olinadi |
|----------|-------------------|
| **Project URL** | Supabase Dashboard → [supabase.com](https://supabase.com) → loyihangiz → **Project Settings** → **API** → **Project URL** |
| **Anon (public) key** | Xuddi shu sahifada → **Project API keys** → **anon** `public` |

## 2. Loyihada sozlash

Loyiha ildizida `.env` yoki `.env.local` yarating (git’ga commit qilmaslik kerak):

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Expo env o‘qiydi: `EXPO_PUBLIC_` bilan boshlangan o‘zgaruvchilar klientga chiqadi.

Yoki `lib/supabase.js` ichida to‘g‘ridan-to‘g‘ri (faqat test uchun, production’da env ishlating):

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

## 3. Supabase Dashboard’da Auth sozlashi

1. **Authentication** → **Providers** → **Email** yoqilgan bo‘lishi kerak.
2. **Authentication** → **URL Configuration** → **Site URL**: ilova uchun (masalan `exp://...` yoki production URL).
3. (Ixtiyoriy) **Authentication** → **Email Templates** — xabnomalarni o‘zgartirish mumkin.

## 4. (Ixtiyoriy) Profil jadvali

Agar ism/avatar saqlashni ma’lumotlar bazasida xohlasangiz:

1. **Table Editor** → **New table** → `profiles`.
2. Ustunlar: `id` (uuid, primary key, default `auth.uid()`), `full_name` (text), `avatar_url` (text), `updated_at` (timestamptz).
3. **Row Level Security**: `profiles` uchun policy — user faqat o‘z qatorini o‘qiy/yozishi mumkin.

Hozirgi kod `auth.users` va `user_metadata` (Sign Up paytida yuborilgan `full_name`) dan foydalanadi; profil jadvali keyinroq qo‘shilishi mumkin.

## 5. Storage — avatar (Edit Profile)

Edit Profile’da rasm yuklash uchun Supabase Storage’da `avatar` bucket yarating:

1. **Storage** → **New bucket** → name: `avatar`.
2. Bucket’ni **Public** qiling (yoki RLS policy orqali o‘qishga ruxsat bering), chunki profil rasmi public URL orqali ko‘rsatiladi.
3. Path: `{userId}/profile_image.png` yoki `.jpg` — kod avtomatik yozadi (`avatar/{userId}/profile_image.*`).

Agar bucket public bo‘lmasa, **Policies** da: `avatar` bucket uchun `SELECT` (o‘qish) barcha uchun, `INSERT`/`UPDATE` faqat `auth.uid()` bo‘lgan user uchun.

## 6. Jadvalar: `antiques` va `collections`

Plant Single / Condition sahifasidagi ma’lumotlar uchun jadvallar va SQL **`supabase/antiques_collections_schema.sql`** faylida. Dashboard → SQL Editor da shu fayl ichidagi so‘rovlarni ishga tushiring.

**collections:** `id`, `user_id`, `collection_name`, `description`, `thumbnail_image_url`, **`antiques_ids`** (bigint[] — antiques.id larning massivi), `created_at`, `updated_at`.

**antiques:** `id` (bigint, auto), `user_id`, `name`, `description`, `image_url`, … (condition/market/category/tags), `created_at`, `updated_at`.

**snap_history (har bir history snap):** `id` (bigint), `user_id`, **`image_url`** (snap rasmi — Storage’da `snaps/{user_id}/{id}.jpg`), **`antique_id`** (nullable — agar "Add to Collection" qilingan bo‘lsa), **`payload`** (jsonb — o‘sha paytdagi natija: name, condition_grade, market_value_min, …), `created_at`. History sahifada barcha snap’lar shu jadvaldan o‘qiladi.

Storage: `snaps` bucket yarating (public yoki RLS), path: `{user_id}/{snap_id}.jpg`.

## 7. Tekshirish

- Env yoki `lib/supabase.js` to‘g‘ri bo‘lsa, Sign In va Sign Up Supabase orqali ishlaydi.
- Env bo‘lmasa, Sign In/Sign Up “demo” rejimida ishlaydi (faqat store’da user saqlanadi, backend yo‘q).
