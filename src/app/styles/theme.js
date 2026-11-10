/**
 * Rquest Central Design System & Theme Engine
 * Adapted from "Neighborhood Commerce" (Stitch Design Specification)
 * 
 * Hyperlocal community-first marketplace design language:
 * - Deep Maritime Navy (#0B2D6B) for high-trust authority and focal CTAs
 * - Warm Parchment Canvas (#F8F4EF) for tactile, grounded contrast
 * - Fine hairline borders (#ebe7e0) and clean white elevated card surfaces
 * - Two-tier typography: Plus Jakarta Sans (Headings) + Inter (Body & Labels)
 */

export const colors = {
  // Brand Palette - Maritime Navy & Cobalt
  primary: '#0B2D6B',
  primaryHover: '#1a4a9c',
  primaryActive: '#001947',
  primaryContainer: '#2e6fdb',
  primaryLight: '#E6F0FF',
  primaryGradient: 'linear-gradient(135deg, #0B2D6B 0%, #1a4a9c 100%)',
  primaryGradientAlt: 'linear-gradient(90deg, #0B2D6B 0%, #2e6fdb 100%)',

  // Secondary Accent - Radiant Cobalt
  secondary: '#0159c5',
  secondaryHover: '#004397',
  secondaryContainer: '#5690fe',
  secondaryLight: '#d8e2ff',

  // Tertiary - Roasted Amber-Brown & Craft Accents
  tertiary: '#5B3A29',
  tertiaryHover: '#472919',
  tertiaryContainer: '#926a56',
  tertiaryFixed: '#ffdbcb',
  onTertiaryFixed: '#2e1507',

  // Warm Parchment & Neutral Surface Scales
  surface: '#ffffff',
  surfaceContainer: '#f1ede8',
  surfaceContainerLow: '#f7f3ee',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#ebe8e3',
  surfaceContainerHighest: '#e6e2dd',

  // Canvas & Layout Aliases
  bg: '#F8F4EF',
  bgDim: '#ddd9d5',
  bgBright: '#fdf9f4',
  brandDark: '#0B2D6B',
  brandSurface: '#ffffff',
  brandBg: '#F8F4EF',
  brandMuted: '#f1ede8',

  // Fine Hairline Borders & Outlines
  border: '#ebe7e0',
  borderLight: '#f1ede8',
  borderDark: '#c2c6d5',
  outline: '#747781',
  outlineVariant: '#c2c6d5',

  // Typography Content Colors
  textMain: '#1c1c19',
  textMuted: '#444650',
  textLight: '#747781',
  white: '#ffffff',

  // Hyperlocal Specialized Badges & Chips
  liveBadgeBg: '#ffdbcb',
  liveBadgeText: '#2e1507',
  verifiedChipBg: '#E6F0FF',
  verifiedChipBorder: '#d2e3fc',
  verifiedChipText: '#0056bd',
  serviceChipBg: '#f7ebe1',
  serviceChipBorder: '#e8d5c8',
  serviceChipText: '#5B3A29',
  starGold: '#926a56',

  // Functional & Semantic Feedback
  semantic: {
    success: '#059669',
    successHover: '#047857',
    successLight: '#ecfdf5',
    successBorder: '#a7f3d0',

    warning: '#f59e0b',
    warningHover: '#d97706',
    warningLight: '#fffbeb',
    warningBorder: '#fde68a',

    error: '#ba1a1a',
    errorHover: '#93000a',
    errorLight: '#ffdad6',
    errorBorder: '#fecaca',

    info: '#0056bd',
    infoHover: '#004397',
    infoLight: '#E6F0FF',
    infoBorder: '#d2e3fc',
  },
};

export const typography = {
  fontFamily: {
    headline: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sans: "'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'Fira Code', source-code-pro, Menlo, Monaco, Consolas, monospace",
  },
  fontSize: {
    labelSm: 11,
    xs: 11,
    labelMd: 12,
    bodySm: 12,
    sm: 12,
    bodyMd: 14,
    labelLg: 14,
    base: 14,
    headlineSm: 15,
    md: 15,
    bodyLg: 16,
    lg: 16,
    headlineMd: 18,
    xl: 18,
    '2xl': 20,
    headlineLg: 24,
    '3xl': 24,
    '4xl': 30,
    '5xl': 36,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
};

export const radii = {
  xs: 4,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.04)',
  md: '0 2px 8px rgba(0, 0, 0, 0.05)',
  lg: '0 8px 24px -4px rgba(11, 45, 107, 0.08)',
  card: '0 1px 4px rgba(0, 0, 0, 0.03)',
  popover: '0 10px 25px -4px rgba(11, 45, 107, 0.12)',
  primary: '0 2px 8px rgba(11, 45, 107, 0.18)',
  ambientGlow: '0 8px 30px rgba(11, 45, 107, 0.08)',
  nav: '0 -4px 16px rgba(11, 45, 107, 0.06)',
};

/**
 * Ant Design 5 ConfigProvider Theme Tokens
 * Maps "Neighborhood Commerce" specification to Ant Design's CSS-in-JS token engine.
 */
export const antdTheme = {
  token: {
    colorPrimary: colors.primary,
    colorPrimaryHover: colors.primaryHover,
    colorPrimaryActive: colors.primaryActive,
    colorLink: colors.primary,
    colorLinkHover: colors.secondary,
    colorTextBase: colors.textMain,
    colorText: colors.textMain,
    colorTextSecondary: colors.textMuted,
    colorTextTertiary: colors.textLight,
    colorBorder: colors.border,
    colorBorderSecondary: colors.surfaceContainer,
    colorBgBase: colors.surface,
    colorBgLayout: colors.bg,
    colorSuccess: colors.semantic.success,
    colorWarning: colors.semantic.warning,
    colorError: colors.semantic.error,
    colorInfo: colors.semantic.info,
    fontFamily: typography.fontFamily.sans,
    fontSize: typography.fontSize.base,
    borderRadius: radii.md,
    borderRadiusSM: radii.xs,
    borderRadiusLG: radii.lg,
    boxShadow: shadows.md,
    boxShadowSecondary: shadows.lg,
  },
  components: {
    Button: {
      controlHeight: 38,
      borderRadius: radii.md,
      fontWeight: typography.fontWeight.semibold,
      primaryShadow: '0 2px 8px rgba(11, 45, 107, 0.18)',
      colorText: colors.textMain,
    },
    Input: {
      controlHeight: 42,
      borderRadius: radii.lg,
      colorBorder: colors.border,
      colorBgContainer: colors.surface,
      activeBorderColor: colors.primary,
      hoverBorderColor: colors.borderDark,
    },
    Select: {
      controlHeight: 38,
      borderRadius: radii.md,
      colorBorder: colors.border,
    },
    Card: {
      borderRadiusLG: radii.lg,
      colorBorderSecondary: colors.border,
      boxShadowCard: shadows.card,
      colorBgContainer: colors.surface,
    },
    Tabs: {
      inkBarColor: colors.primary,
      itemSelectedColor: colors.primary,
      itemHoverColor: colors.primaryHover,
      itemColor: colors.textMuted,
      titleFontSize: typography.fontSize.base,
      horizontalItemPadding: '10px 16px',
    },
    Modal: {
      borderRadiusLG: radii.xl,
      colorBgElevated: colors.surface,
    },
    Drawer: {
      borderRadiusLG: radii.xl,
      colorBgElevated: colors.surface,
    },
    Tag: {
      borderRadiusSM: radii.xs,
      fontSize: typography.fontSize.labelSm,
    },
    Typography: {
      colorText: colors.textMain,
      colorTextHeading: colors.textMain,
      colorTextDescription: colors.textMuted,
      fontFamily: typography.fontFamily.sans,
    },
    Segmented: {
      borderRadius: radii.md,
      itemSelectedBg: colors.surface,
      itemColor: colors.textMuted,
      itemSelectedColor: colors.textMain,
      trackBg: colors.surfaceContainer,
    },
    Badge: {
      colorPrimary: colors.primary,
    },
  },
};

export const theme = {
  colors,
  typography,
  radii,
  shadows,
  antdTheme,
};

export default theme;
