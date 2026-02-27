import { useAppSettingsStore } from '../stores/useAppSettingsStore';

/**
 * Design tokens - Light mode
 */
export const lightTheme = {
  // Brand
  brand: '#DFAC4C',
  brandElevated: '#D99936',
  brandLight: '#FBF6EB',
  brandLightElevated: '#F6EACB',

  // Background
  bgBase: '#F5F5F4',
  bgBaseElevated: '#E7E5E4',
  bgLight: '#FFFFFF',
  bgWhite: '#FFFFFF',
  bgWhiteA3: '#FFFFFFA3',
  bgBrandLayer: '#FBF6EB',
  bgInverted: '#161412',
  bgDark: '#161412',
  bgSurface: '#211D1D',

  // Text
  textBase: '#161412',
  textSecondary: '#79716B',
  textTertiary: '#A6A09B',
  textBrand: '#DFAC4C',
  textWhite: '#FFFFFF',
  textInverse: '#FFFFFF',

  // Border
  border1: '#F5F5F4',
  border2: '#E7E5E4',
  border3: '#D6D3D1',
  borderBrand: '#DFAC4C',
  borderDark: '#37332F',

  // Status
  greenLight: '#F0FDF4',
  green: '#13A648',
  redLight: '#FFF1F1',
  red: '#E91919',
};

/**
 * Dark theme — override keys as needed (siz kiritasiz)
 */
export const darkTheme = {
  ...lightTheme,

  brand: '#DFAC4C',
  brandElevated: '#D99936',
  brandLight: '#DFAC4C14',
  brandLightElevated: '#DFAC4C24',

  // Background
  bgBase: '#0C0A09',
  bgBaseElevated: '#161412',
  bgLight: '#161412',
  bgWhite: '#161412',
  bgWhiteA3: '#FFFFFF14',
  bgBrandLayer: '#FBF6EB',
  bgInverted: '#FAFAF9',
  bgDark: '#161412',
  bgSurface: '#211D1D',

  // Text
  textBase: '#FAFAF9',
  textSecondary: '#A6A09B',
  textTertiary: '#79716B',
  textBrand: '#DFAC4C',
  textWhite: '#FFFFFF',
  textInverse: '#161412',

  // Border
  border1: '#211D1D',
  border2: '#37332F',
  border3: '#4C4843',
  borderBrand: '#DFAC4C',
  borderDark: '#37332F',

  // Status
  greenLight: '#172A1B',
  green: '#13A648',
  redLight: '#311917',
  red: '#E91919',
};

/** Dark mode bo‘lsa darkTheme, aks holda lightTheme. isDark ham qaytariladi (StatusBar va boshqalar uchun). */
export function getColors(isDark) {
  const theme = isDark ? darkTheme : lightTheme;
  return { ...theme, isDark: !!isDark };
}

/** Dinamik colors — darkMode store dan olinadi, komponentda ishlatish uchun */
export function useColors() {
  const darkMode = useAppSettingsStore((s) => s.darkMode);
  return getColors(darkMode);
}

// Typography - Albert Sans
export const fonts = {
  regular: 'AlbertSans_400Regular',
  medium: 'AlbertSans_500Medium',
  semiBold: 'AlbertSans_600SemiBold',
  bold: 'AlbertSans_700Bold',
};

/** Statik fallback (eski importlar uchun); dinamik tema uchun useColors() ishlating */
export const colors = lightTheme;
