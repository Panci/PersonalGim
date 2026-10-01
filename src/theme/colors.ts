/**
 * Previous brand palette, kept as a named reference so it can be restored
 * without having to recover values from an older commit.
 */
export const LEGACY_ORANGE_PALETTE = {
  primary: '#FF6A00',
  primaryLight: '#FF8533',
  primaryDark: '#D95A00',
  primaryMuted: 'rgba(255, 106, 0, 0.15)',
  textOrange: '#FF7A1A',
} as const;

export const GREEN_PALETTE = {
  primary: '#16C95B',
  primaryLight: '#4BE77C',
  primaryDark: '#0C9842',
  primaryHighlight: '#65EE91',
  primaryRgb: '22, 201, 91',
  textOrange: '#35DD6E',
  success: '#34C759',
  successBright: '#30D158',
  successRgb: '52, 199, 89',
} as const;

export const RED_PALETTE = {
  primary: '#FF0000',
  primaryLight: '#FF4D4D',
  primaryDark: '#B80000',
  primaryHighlight: '#FF7373',
  primaryRgb: '255, 0, 0',
  textOrange: '#FF4D4D',
  success: '#FF0000',
  successBright: '#FF3333',
  successRgb: '255, 0, 0',
} as const;

// Docker builds select the red brand; green remains available as a build option.
export const IS_RED_BRAND = process.env.EXPO_PUBLIC_BRAND_THEME === 'red';
const brand = IS_RED_BRAND ? RED_PALETTE : GREEN_PALETTE;

export const COLORS = {
  // Backgrounds
  background: '#000000',      // AMOLED Pure Black
  surface: '#1C1C1E',         // Dark Slate / Charcoal for cards
  surfaceLight: '#242426',    // Slightly lighter for elevated modals/inputs
  surfaceHighlight: '#2C2C2E',// Hover/active state on cards
  
  // Brand / Accents
  primary: brand.primary,
  primaryLight: brand.primaryLight,
  primaryDark: brand.primaryDark,
  primaryHighlight: brand.primaryHighlight,
  primaryMuted: `rgba(${brand.primaryRgb}, 0.15)`,
  primaryTint: (opacity: number) => `rgba(${brand.primaryRgb}, ${opacity})`,
  workoutOrange: '#FF7E00', // Sampled from the supplied orange reference.

  // Text
  text: '#FFFFFF',            // High contrast white
  textSecondary: '#A1A1A6',   // Clean medium gray for labels and metadata
  textMuted: '#636366',       // Muted gray for inactive icons and placeholders
  textOrange: brand.textOrange, // Accent text for actions/links

  // Day Badges (from IMG_1171.PNG)
  dayBadges: {
    lun: '#DDA700',           // Amber / Gold (Lunes)
    mar: '#E91E63',           // Magenta / Red (Martes)
    mie: IS_RED_BRAND ? '#FF0000' : '#00C853', // Miércoles
    jue: '#AB47BC',           // Purple / Violet (Jueves)
    vie: '#00BCD4',           // Cyan / Sky Blue (Viernes)
    sab: '#2979FF',           // Electric Blue (Sábado)
    dom: '#78909C',           // Slate Gray (Domingo)
  },

  // Set Types
  setTypes: {
    normal: brand.primary,
    warmup: '#F59E0B',
    drop: '#EC4899',
    failure: '#EF4444',
  },

  // Functional Status
  success: brand.success,
  successBright: brand.successBright,
  successTint: (opacity: number) => `rgba(${brand.successRgb}, ${opacity})`,
  danger: '#FF3B30',
  warning: '#FFCC00',
  info: '#0A84FF',
  border: '#2C2C2E',
  divider: '#1C1C1E',
};
