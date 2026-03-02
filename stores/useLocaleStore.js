import { create } from 'zustand';

/**
 * Til (locale) uchun store — o‘zgarganda App key={locale} orqali qayta mount qilinadi,
 * shuning uchun barcha ekranlar yangi tilda ko‘rinadi.
 * Persist yo‘q: asl qiymat i18n initLocale() dan olinadi.
 */
export const useLocaleStore = create((set) => ({
  locale: 'en',
  setLocale: (locale) => set({ locale }),
}));
