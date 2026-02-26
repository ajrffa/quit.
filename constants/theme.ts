export const Colors = {
  background: '#0a0a0a',
  card: '#141414',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  textDim: '#707070',
  textMuted: '#505050',
  border: '#2a2a2a',
  gold: '#d4af37',  // The core premium accent color
  error: '#ff4d4d',
  success: '#4dff4d',
  tabBar: '#121212',
  tabActive: '#d4af37',
  tabInactive: '#666666',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  round: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 56,
};

export const FontWeight = {
  thin: '100' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const FontFamily = {
  thin: 'Outfit_100Thin',
  extraLight: 'Outfit_200ExtraLight',
  light: 'Outfit_300Light',
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  sans: 'Outfit_400Regular', // Default fallback map
};
