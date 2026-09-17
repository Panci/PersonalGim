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

export const COLORS = {
  // Backgrounds
  background: '#000000',      // AMOLED Pure Black
  surface: '#1C1C1E',         // Dark Slate / Charcoal for cards
  surfaceLight: '#242426',    // Slightly lighter for elevated modals/inputs
  surfaceHighlight: '#2C2C2E',// Hover/active state on cards
  
  // Brand / Accents
  // Neon green accent inspired by the supplied reference image. The slightly
  // deeper tone keeps white labels readable on filled buttons and cards.
  primary: '#16C95B',
  primaryLight: '#4BE77C',
  primaryDark: '#0C9842',
  primaryMuted: 'rgba(22, 201, 91, 0.15)',

  // Text
  text: '#FFFFFF',            // High contrast white
  textSecondary: '#A1A1A6',   // Clean medium gray for labels and metadata
  textMuted: '#636366',       // Muted gray for inactive icons and placeholders
  textOrange: '#35DD6E',      // Green text for actions/links

  // Day Badges (from IMG_1171.PNG)
  dayBadges: {
    lun: '#DDA700',           // Amber / Gold (Lunes)
    mar: '#E91E63',           // Magenta / Red (Martes)
    mie: '#00C853',           // Emerald Green (Miércoles)
    jue: '#AB47BC',           // Purple / Violet (Jueves)
    vie: '#00BCD4',           // Cyan / Sky Blue (Viernes)
    sab: '#2979FF',           // Electric Blue (Sábado)
    dom: '#78909C',           // Slate Gray (Domingo)
  },

  // Set Types
  setTypes: {
    normal: '#16C95B',
    warmup: '#F59E0B',
    drop: '#EC4899',
    failure: '#EF4444',
  },

  // Functional Status
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FFCC00',
  info: '#0A84FF',
  border: '#2C2C2E',
  divider: '#1C1C1E',
};
