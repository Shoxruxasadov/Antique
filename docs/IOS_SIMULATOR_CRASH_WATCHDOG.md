# iOS Simulator crash: scene-update watchdog / deadlock

## Crash summary

- **Exception:** `EXC_CRASH (SIGKILL)`  
- **Reason:** `scene-update watchdog transgression` — ilova 10 soniya ichida scene-update’ni tugata olmadi.
- **Asosiy sabab:** **Deadlock** — main thread Expo modullarini ro‘yxatga olishda mutexda to‘xtab qoladi, JS thread esa `RNSScreenManager dealloc` da `dispatch_sync(main_queue)` chaqiradi. Main thread band bo‘lgani uchun ikki thread bir-birini kutadi.

## Qayerda bo‘ladi

- **Simulator** da tez-tez (xususan Debug build).
- Ilova **background** ga o‘tayotganda yoki **launch** paytida bo‘lishi mumkin.

## Nimalar qilish mumkin

### 1. Haqiqiy qurilmada sinash

Simulator’dagi deadlock ba’zan real qurilmada takrorlanmaydi. Ilovani **jismoniy iPhone/iPad** da ishga tushiring:

```bash
CI=false npx expo run:ios --device
```

yoki Xcode’dan device tanlab Run.

### 2. Release build (Simulator’da)

Debug build’da qo‘shimcha sync chaqiruvlar bo‘ladi, release’da ba’zan muammo yo‘qoladi:

```bash
npx expo run:ios --configuration Release
```

### 3. Paketlarni yangilash

Expo va react-native-screens’ning yangi patch’larida deadlock fix bo‘lishi mumkin:

```bash
npx expo install --fix
npm update react-native-screens react-native-safe-area-context
```

Keyin `npx expo prebuild --clean --platform ios` va qayta build.

### 4. Ilovani background’da tez yopmaslik

Crash “scene-update” va “Background” ko‘rsatilgani tufayli, ilovani **background** ga olgach bir oz kuting (1–2 soniya) va keyin boshqa app’ga o‘ting. Ba’zan shunda watchdog ishlamaydi.

### 5. Expo / RN issue

Agar muammo davom etsa, crash log va qisqa tafsilot bilan issue ochish mumkin:

- [expo/expo](https://github.com/expo/expo/issues)  
- [software-mansion/react-native-screens](https://github.com/software-mansion/react-native-screens/issues)  

Crash log’da muhim qatorlar: `EXNativeModulesProxy registerExpoModulesInBridge`, `RNSScreenManager dealloc`, `RCTUnsafeExecuteOnMainQueueSync`.

---

**Xulosa:** Bu React Native / Expo / react-native-screens native qatlamidagi deadlock. Ilova JS kodini o‘zgartirib to‘liq “fix” qilish qiyin; yuqoridagi choralar (device, release build, yangilash) tez-tez yordam beradi.
