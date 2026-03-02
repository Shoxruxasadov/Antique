/**
 * i18n — barcha ekranlar uchun tarjimalar.
 * Til: getLocale() / setLocale(locale). Matn: t('key').
 * iOS: har doim tizim (App Settings) tilidan; ilova ichidagi til tanlanmaydi.
 * Android: tanlangan til AsyncStorage da saqlanadi.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { translations, supportedLocales } from './translations';

const LOCALE_STORAGE_KEY = 'antiqpro_locale';

let currentLocale = 'en';

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  if (!locale || !translations[locale]) return;
  currentLocale = locale;
  if (Platform.OS === 'android') {
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale).catch(() => {});
  }
}

/**
 * iOS: faqat tizim tilidan (AsyncStorage o‘qilmaydi).
 * Android: AsyncStorage dagi saqlangan til.
 */
export async function initLocale() {
  if (Platform.OS === 'ios') {
    currentLocale = getLocaleFromSystem();
    return;
  }
  try {
    const saved = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && translations[saved]) currentLocale = saved;
  } catch (_) {}
}

export function t(key) {
  return translations[currentLocale]?.[key] ?? translations.en?.[key] ?? key;
}

export function getLanguageLabel() {
  return t('appSettings.languageValue');
}

/**
 * Tizim (qurilma) tilini o‘qiydi va bizning supportedLocales ga mos kod qaytaradi.
 * iOS da Settings dan til o‘zgargach ilova oldinga qaytganda app tilini yangilash uchun.
 */
export function getLocaleFromSystem() {
  try {
    const locales = Localization.getLocales?.();
    if (!locales?.length) return 'en';
    const first = locales[0];
    const code = first.languageCode || '';
    const tag = (first.languageTag || '').toLowerCase();
    if (translations[code]) return code;
    if (tag.startsWith('zh')) return 'zh';
    return supportedLocales.includes(code) ? code : 'en';
  } catch (_) {
    return 'en';
  }
}

export { supportedLocales, translations };
