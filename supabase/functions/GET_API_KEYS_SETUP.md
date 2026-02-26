# get-api-keys xavfsizligi

`get-api-keys` kalitlarni qaytaradi — **uni faqat boshqa Edge Function (ebay-search va h.k.) chaqirishi kerak**. Ilova (React Native) hech qachon bu endpointni chaqirmasligi kerak, aks holda Cert ID va Gemini key client’da ochiq bo‘lib qoladi.

## Qanday himoya qilish

1. **Supabase Secrets** da `INTERNAL_SECRET` qo‘shing (ixtiyoriy uzun parol, masalan `openssl rand -hex 32`).

2. **get-api-keys** funksiyasida so‘rov boshida tekshiring:
   - Agar `request.headers.get("x-internal-secret") !== Deno.env.get("INTERNAL_SECRET")` bo‘lsa → `401 Unauthorized` qaytaring, kalitlarni qaytarmang.
   - Faqat `x-internal-secret` to‘g‘ri bo‘lsa javob qayting.

3. **ebay-search** endi kalitlarni ikki usulda oladi:
   - Avval `EBAY_APP_ID` va `EBAY_CERT_ID` env’dan;
   - Agar bo‘lmasa → `get-api-keys` ga so‘rov yuboradi (header: `x-internal-secret: INTERNAL_SECRET`).

Shunday qilsangiz, faqat sizning Edge Function’laringiz kalitlarni oladi, ilova esa hech qachon olmaydi.
