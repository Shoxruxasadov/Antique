/**
 * Oddiy i18n — local tillar (key orqali matn olish).
 * Til o‘zgartirilganda app native settings orqali (Linking.openSettings).
 */

const translations = {
  en: {
    'appSettings.title': 'App Settings',
    'appSettings.notifications': 'Notifications',
    'appSettings.vibration': 'Vibration',
    'appSettings.darkMode': 'Dark Mode',
    'appSettings.language': 'Language',
    'appSettings.languageValue': 'English',
    'scanner.scanLeft': 'Scans left',
    'scanner.getMore': 'Get more',
  },
  uz: {
    'appSettings.title': 'Ilova sozlamalari',
    'appSettings.notifications': 'Bildirishnomalar',
    'appSettings.vibration': 'Titrash',
    'appSettings.darkMode': 'Qorong‘u rejim',
    'appSettings.language': 'Til',
    'appSettings.languageValue': 'O‘zbekcha',
    'scanner.scanLeft': 'Skanlar qoldi',
    'scanner.getMore': 'Ko‘proq olish',
  },
};

let currentLocale = 'en';

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  if (translations[locale]) currentLocale = locale;
}

export function t(key) {
  return translations[currentLocale]?.[key] ?? translations.en?.[key] ?? key;
}

export function getLanguageLabel() {
  return t('appSettings.languageValue');
}
