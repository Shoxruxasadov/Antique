/**
 * Design tokens - Light mode
 * Dark mode will be added when provided
 */

export const lightTheme = {
  // Brand
  brand: '#A98142',
  brandElevated: '#C09440',
  brandLight: '#F7F8F4',
  brandLightElevated: '#EDE9D4',

  // Background
  bgBase: '#F7F8F4',
  bgBaseElevated: '#E7E5E4',
  bgLight: '#FFFFFF',
  bgWhite: '#FFFFFF',
  bgWhiteA3: '#FFFFFFA3',
  bgBrandLayer: '#F7F8F4',
  bgInverted: '#1C1917',
  bgDark: '#1C1917',
  bgSurface: '#2D2524',

  // Text
  textBase: '#2D2524',
  textSecondary: '#6F7F82',
  textTertiary: '#A9B2B5',
  textBrand: '#A98142',
  textWhite: '#FFFFFF',
  textInverse: '#FFFFFF',

  // Border
  border1: '#F7F8F4',
  border2: '#E7E5E4',
  border3: '#DCD9D6',
  borderBrand: '#A98142',
  borderDark: '#6D6D6D',

  // Status
  greenLight: '#D7F274',
  green: '#44D84B',
  redLight: '#F5E1E1',
  red: '#C8191B',
};

// Placeholder for dark mode - will be populated when provided
export const darkTheme = {
  ...lightTheme,
  // Override with dark mode values when available
};

// Typography - Albert Sans
export const fonts = {
  regular: 'AlbertSans_400Regular',
  medium: 'AlbertSans_500Medium',
  semiBold: 'AlbertSans_600SemiBold',
  bold: 'AlbertSans_700Bold',
};

// Default export for current theme
export const colors = lightTheme;
