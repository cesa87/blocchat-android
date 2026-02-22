/**
 * BlocChat Design System — React Native
 * Mirrors the web app's Neo Night theme (index.css)
 *
 * HSL → Hex conversions from the CSS custom properties:
 *   --background: 40 20% 96%  → #F7F4EF
 *   --foreground: 240 8% 12%  → #1D1D22
 *   --card:       40 18% 98%  → #FCFAF7
 *   --accent:     334 100% 50% → #FF0066  (Hot Pink)
 *   --secondary:  240 6% 16%  → #272729
 *   --border:     240 6% 18%  → #2C2C2F
 *   --muted:      40 12% 92%  → #ECE9E3
 *   --muted-fg:   240 6% 36%  → #575759
 *   --input:      40 14% 92%  → #ECE9E2
 *   --destructive: 0 75% 55%  → #E02828
 */

export const colors = {
  // Core palette
  background: '#F7F4EF',
  foreground: '#1D1D22',
  card: '#FCFAF7',
  cardForeground: '#1D1D22',

  // Primary (Bone White) – used for surfaces, subtle glow
  primary: '#F7F4EF',
  primaryForeground: '#1D1D22',

  // Accent (Hot Pink) – CTAs, own-message bubbles, highlights
  accent: '#FF0066',
  accentForeground: '#FAFAFA',
  accentMuted: 'rgba(255, 0, 102, 0.32)', // bubble-mine bg
  accentBorder: 'rgba(255, 0, 102, 0.6)', // bubble-mine border

  // Secondary (Dark) – drawer, dark chips
  secondary: '#272729',
  secondaryForeground: '#F7F4EF',

  // Muted
  muted: '#ECE9E3',
  mutedForeground: '#575759',

  // Border
  border: '#2C2C2F',
  borderSubtle: 'rgba(44, 44, 47, 0.7)',
  borderLight: 'rgba(44, 44, 47, 0.4)',

  // Input
  input: '#ECE9E2',
  inputFocusBorder: 'rgba(247, 244, 239, 0.6)',

  // Destructive
  destructive: '#E02828',
  destructiveForeground: '#FAFAFA',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.2)',

  // Status
  online: '#22C55E',
  offline: '#94A3B8',
};

/** Light theme overrides (matches [data-theme='light']) */
export const lightOverrides = {
  background: '#F0F0F5', // hsl(240 12% 96%)
  foreground: '#1D1D26', // hsl(240 12% 12%)
  card: '#F5F5FA',       // hsl(240 12% 98%)
  secondary: '#E3E3EA',  // hsl(240 10% 90%)
  secondaryForeground: '#1F1F28',
  muted: '#E6E6ED',      // hsl(240 10% 92%)
  mutedForeground: '#5C5C6B', // hsl(240 8% 40%)
  border: '#D1D1DB',     // hsl(240 10% 84%)
  input: '#E3E3EA',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,   // --radius: 1rem
  xl: 24,   // --radius-lg: 1.5rem
  full: 9999,
} as const;

export const fonts = {
  // Will use system fonts since custom fonts require native linking
  // Sora → system sans-serif, IBM Plex Mono → system monospace
  sans: undefined, // uses RN default (San Francisco on iOS, Roboto on Android)
  mono: undefined, // platform monospace
} as const;

export const fontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 15,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  card: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  modal: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 12,
  },
  bubble: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
};
