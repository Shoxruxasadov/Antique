/**
 * Native app store rating dialog ochadi (iOS/Android).
 * Simulator yoki native modul yo‘q bo‘lsa — hech narsa qilmaydi (ExpoStoreReview native module topilmasa crash bo‘lmasin).
 */
export async function requestAppReview() {
  try {
    const { isDevice } = require('expo-device');
    if (!isDevice) return;
  } catch (_) {
    return;
  }
  try {
    const StoreReview = require('expo-store-review');
    const available = await StoreReview.isAvailableAsync?.();
    if (!available) return;
    await StoreReview.requestReview?.();
  } catch (_) {
    // Native module 'ExpoStoreReview' topilmasa yoki prebuild qilinmagan bo‘lsa — ignore
  }
}
