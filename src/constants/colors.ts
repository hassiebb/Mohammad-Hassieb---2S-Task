/**
 * 2S Egypt Enterprise Design System — Brand Palette & Tokens
 *
 * Sourced from 2S Egypt verified brand identities (2segypt.com / sys.2segypt.com):
 * - Primary Midnight Slate: #0E1926 (Executive Navy / Dark Slate)
 * - Warm Amber Accent: #FF8622 (Brand Action & Highlight)
 * - Forest Emerald: #008669 (Verification & Success)
 * - Accessible neutral surfaces: #F8FAFC, #FFFFFF, #E2E8F0
 */

export const Palette = {
  // 2S Egypt Brand Primaries
  brandMidnight: '#0E1926',
  brandAmber: '#FF8622',
  brandEmerald: '#008669',

  primary: '#0E1926',
  primaryHover: '#1E2E44',
  primaryLight: '#F1F5F9',

  accent: '#FF8622',
  accentLight: '#FFF7ED',
  accentDark: '#C2410C',

  secondary: '#008669',
  secondaryLight: '#ECFDF5',

  // Neutral Scales
  surfaceBackground: '#F8FAFC',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',

  // Status Badges (Sales Order Workflow)
  statusDraft: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#FDE68A',
    label: 'Quotation',
  },
  statusSent: {
    bg: '#EFF6FF',
    text: '#1D4ED8',
    border: '#BFDBFE',
    label: 'Quotation Sent',
  },
  statusSale: {
    bg: '#ECFDF5',
    text: '#065F46',
    border: '#A7F3D0',
    label: 'Sales Order',
  },
  statusDone: {
    bg: '#F1F5F9',
    text: '#334155',
    border: '#CBD5E1',
    label: 'Locked',
  },
  statusCancel: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    label: 'Cancelled',
  },
};

export const ThemeColors = {
  light: {
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    background: '#F8FAFC',
    backgroundElement: '#F1F5F9',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    borderFocus: '#0E1926',
    primary: '#0E1926',
    primaryLight: '#F1F5F9',
    primaryText: '#FFFFFF',
    accent: '#FF8622',
    danger: '#DC2626',
    dangerLight: '#FEF2F2',
    success: '#008669',
    successLight: '#ECFDF5',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    card: '#FFFFFF',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    background: '#0B131E',
    backgroundElement: '#14202E',
    surface: '#14202E',
    border: '#243447',
    borderFocus: '#FF8622',
    primary: '#FF8622',
    primaryLight: '#243447',
    primaryText: '#FFFFFF',
    accent: '#FF8622',
    danger: '#EF4444',
    dangerLight: '#3B1515',
    success: '#10B981',
    successLight: '#064E3B',
    warning: '#F59E0B',
    warningLight: '#3D2505',
    card: '#14202E',
  },
} as const;
