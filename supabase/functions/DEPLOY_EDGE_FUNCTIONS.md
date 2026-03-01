# Supabase Edge Functions – deploy

`ebay-search` (va boshqa function’lar) ni Supabase’ga yuklash uchun.

## Birinchi marta sozlash

1. **CLI o‘rnatish** (loyida allaqachon bor bo‘lishi mumkin):
   ```bash
   npm install
   ```

2. **Supabase’ga kirish**:
   ```bash
   npx supabase login
   ```
   Brauzer ochiladi, akkauntga kiring.

3. **Loyihani ulash**  
   [app.supabase.com](https://app.supabase.com) → loyihangiz → **Settings** → **General** → **Reference ID** (yoki URL’dagi `.../project/XXXXXXXX` dagi `XXXXXXXX`).
   ```bash
   npx supabase link --project-ref XXXXXXXX
   ```
   Parol so‘ralsa – Database password (Settings → Database).

## ebay-search ni yangilash

Kodni o‘zgartirgach, deploy qilish:

```bash
npm run supabase:deploy-ebay
```

Yoki loyiha ulangan bo‘lmasa, to‘g‘ridan project ref bilan:

```bash
npx supabase functions deploy ebay-search --project-ref XXXXXXXX
```

(Loyiha ID: Dashboard → Settings → General → Reference ID.)

## Secret’lar (EBAY_APP_ID, EBAY_CERT_ID)

Agar ularni CLI orqali qo‘ymoqchi bo‘lsangiz:

```bash
npx supabase secrets set EBAY_APP_ID="your-app-id" EBAY_CERT_ID="your-cert-id"
```

Yoki Dashboard: **Project Settings** → **Edge Functions** → **Secrets**.
