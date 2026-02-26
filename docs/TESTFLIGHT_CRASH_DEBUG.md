# TestFlight crash debug

Agar ilova TestFlight’da ochilganda "Crashed" chiqsa:

## 1. EAS Build’da env o‘zgaruvchilar

EAS serverda `.env` ishlatilmaydi. Production/TestFlight build’da Supabase ishlashi uchun kalitlarni build vaqtida berish kerak.

**Variant A – eas.json orqali (faqat public qiymatlar):**

`eas.json` ichida `build.production.env` qo‘shing:

```json
"production": {
  "distribution": "store",
  "env": {
    "EXPO_PUBLIC_SUPABASE_URL": "https://iqxltjnjatrsbbxvaxsh.supabase.co",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "YOUR_ANON_KEY"
  },
  ...
}
```

**Variant B – EAS Secrets (maxfiy ma’lumotlar uchun yaxshiroq):**

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://iqxltjnjatrsbbxvaxsh.supabase.co" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --scope project
```

Keyin `eas.json` da shu secret’lardan foydalanishni [EAS Variables](https://docs.expo.dev/build-reference/variables/) bo‘yicha sozlang.

## 2. Crash log’larni ko‘rish

- **Xcode:** Window → Organizer → Crashes (ilova TestFlight’dan o‘rnatilgan bo‘lsa).
- **App Store Connect:** TestFlight → Build → Crashes.
- Telefonda "Share" bosilsa, crash report developer’ga yuboriladi (agar sozlangan bo‘lsa).

## 3. Loyihada qilingan o‘zgarishlar

- **AppErrorBoundary:** Root’da error boundary qo‘shildi — JS xatolari native crash o‘rniga "Something went wrong" sahifasini ko‘rsatadi.
- **App.js prepare():** Rehydrate va getSession try/catch ichida, bitta store xatosi butun app’ni tushirmaydi.

Yangi build yuklab, yana sinab ko‘ring. Agar hali ham crash bo‘lsa, Xcode Organizer yoki App Store Connect’dagi crash log’ni tekshiring.
