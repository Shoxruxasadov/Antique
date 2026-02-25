# eBay + Gemini: real narxlar va rasmlar

Antiques uchun: **Gemini** rasmni tahlil qiladi (nom, davr, kategoriya, condition) → chiqgan **kalit so‘zlar** bilan **eBay API** da qidiruv → real listing’lar, narxlar va rasmlar olinadi.

**`.env`:** Ilovada skan qilganda Gemini ishlashi uchun `.env` ga qo‘shing:
```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```
(Gemini API key: [Google AI Studio](https://aistudio.google.com/apikey))

---

## 1. Umumiy oqim

```
User rasm yuboradi
    → Gemini API (image + prompt): "Identify antique, return name, category, era, keywords for search"
    → eBay API: search by keywords → items (title, price, image URL)
    → Ilovada: identifikatsiya + "eBay’da o‘xshashlar" (narxlar, bitta rasm tanlash)
```

- **Rasmlar:** eBay listing’lardan `imageUrl` yoki `galleryURL` olasiz; xohlasangiz "o‘xshash" listing ning rasmini antiques’ga asosiy rasm qilib saqlashingiz mumkin.
- **Narx:** eBay’dagi real narxlar (current price). Bir nechta listing’dan min/max/median hisoblab `market_value_min`, `market_value_max` va o‘rtacha growth ko‘rsatishingiz mumkin.

---

## 2. eBay API

- **eBay Developer:** [developer.ebay.com](https://developer.ebay.com) → App ro‘yxatdan o‘tkazing.
- **Browse API** (zamonaviy): `search` endpoint — qidiruv so‘zi bo‘yicha listing’lar, har biri uchun `price`, `image`, `itemId`, `title`.
- **Auth:** OAuth 2.0 (user token) yoki **Application access** (client credentials) — faqat public ma’lumot (listing’lar, narxlar) uchun application token yetadi.
- **Limitlar:** Kunlik/organization limitlari bor; production’da rate limit va cache (masalan, bir xil qidiruv 1 soat) qilish ma’qul.

**Misol (Browse API search):**
```http
GET https://api.ebay.com/buy/browse/v1/item_summary/search?q=victorian+gold+trinket+box+french
Headers: Authorization: Bearer <ACCESS_TOKEN>
```
Javobda: `itemSummaries[]` — har biri `price.value`, `image.imageUrl`, `title`, `itemId`.

---

## 3. Gemini API (sizda bor)

- Rasmni base64 yoki URL orqali yuborasiz.
- Prompt masalan: "This is a photo of an antique. Return a JSON: name, category, era (e.g. Victorian), country of origin, and an array of 5–10 English search keywords for finding similar items on eBay."
- Chiqgan `keywords` ni eBay `search?q=` da ishlatasiz.

---

## 4. Texnik yondashuv

| Qism | Vazifa |
|------|--------|
| **Ilova (yoki backend)** | Rasmni Gemini’ga yuboradi, javobdagi keywords ni oladi |
| **eBay search** | `keywords.join(' ')` bilan Browse API `search` chaqiriladi |
| **Narx** | Listing’lardan `price.value` larni o‘qib, min/max/median hisoblash; `antiques` jadvalida `market_value_min`, `market_value_max` saqlash mumkin |
| **Rasm** | eBay’dan bir yoki bir nechta `imageUrl`; xohlasangiz bittasini `antiques.image_url` qilib saqlaysiz (legal: eBay rasmlarini ko‘rsatish odatda listing’ga link bilan ruxsat etiladi, to‘g‘ridan-to‘g‘ri saqlash litsenziyaga bog‘liq) |

---

## 5. Xavfsizlik

- **API kalitlari:** eBay va Gemini kalitlarini ilova ichida ochiq saqlamang. **Backend** (Node/Cloud Function) yarating: ilova rasmini backend’ga yuboradi → backend Gemini + eBay chaqiradi → javobni ilovaga qaytaradi. Yoki Expo’da `EXPO_PUBLIC_` faqat client’da ko‘rinadi — production’da backend orqali proxy qilish yaxshiroq.
- **eBay:** Production’da OAuth yoki Application token’ni backend’da saqlang; environment variables ishlating.

---

## 6. Qisqa xulosa

- **eBay’dan real narx:** Ha — Browse API `search` → listing’lardan `price` olasiz, antiques uchun `market_value_min` / `market_value_max` ni shu narxlardan hisoblashingiz mumkin.
- **eBay’dan rasmlar:** Ha — har bir listing’da `image.imageUrl`; ilovada "o‘xshash buyumlar" bo‘limida ko‘rsatish yoki (litsenziyaga qarab) bitta rasmini antiques’ga referens qilish mumkin.
- **Gemini:** Rasmni tahlil qilib eBay qidiruv uchun kalit so‘zlar beradi; sizda API bor, backend yoki ilova ichida integrasiya qilish mumkin.

Agar xohlasangiz, keyingi qadamda backend (Node/Express yoki Supabase Edge Function) da bitta endpoint yozish rejasini beraman: rasm → Gemini → eBay search → min/max price + listing’lar (image + price) qaytarish.
