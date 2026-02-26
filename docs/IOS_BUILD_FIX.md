# iOS build exit code 1 — qanday tuzatish

Agar `npm run dev:ios` yoki `npx expo run:ios` "exited with code 1" bersa:

## 1. Tozalab qayta urinish

```bash
# Prebuild va ios papkani tozalash (agar mavjud bo‘lsa)
npx expo prebuild --clean --platform ios

# Yoki faqat ios build (prebuild avtomatik)
npx expo run:ios
```

**dev:ios ishlatmasdan** avval `npx expo run:ios` ni to‘g‘ridan-to‘g‘ri ishlating — xato matni aniqroq chiqadi.

## 2. Aniq xatoni ko‘rish

Concurrently ikki process ishlatadi, xato bitta qismda bo‘lishi mumkin. Shuning uchun:

```bash
# Birinchi terminal: Metro
npx expo start --clear

# Ikkinchi terminal: Metro ishga tushgach
CI=false npx expo run:ios
```

Ikkinchi terminalda chiqadigan **oxirgi qatorlar** (error / failed / duplicate) — asl sabab.

## 3. Pod xatosi bo‘lsa

Agar `ios` papka mavjud bo‘lsa (prebuild dan keyin):

```bash
cd ios
rm -rf Pods Podfile.lock build
pod install
cd ..
npx expo run:ios
```

## 4. Node / Watchman

```bash
watchman watch-del-all 2>/dev/null
rm -rf node_modules
npm install
npx expo run:ios
```

Xato matnini (screenshot yoki nusxa) yuborsangiz, aniq tahlil qilish mumkin.
