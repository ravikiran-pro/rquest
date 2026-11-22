/**
 * Rquest Central Design System & Theme Engine
 * Adapted from "Corner Store Gallery" (Selected Design Specification)
 * 
 * Hyperlocal community-first marketplace design language:
 * - Shopfront Terracotta (#A8451F) for focal CTAs (white text 5.9:1, WCAG AA)
 * - Warm Parchment Canvas (#FAF7F2) for tactile, grounded contrast
 * - Fine hairline borders (#E6DED2) and clean white elevated card surfaces
 * - Two-tier typography: Fraunces (Headings) + Inter (Body & Labels)
 */

export const colors = {
  // Brand Palette - Shopfront Terracotta
  primary: '#A8451F',
  primaryHover: '#8A3918',
  primaryActive: '#6F2D12',
  primaryContainer: '#C2542B',
  primaryLight: '#FBEDE6',
  primaryGradient: 'linear-gradient(135deg, #A8451F 0%, #8A3918 100%)',
  primaryGradientAlt: 'linear-gradient(90deg, #A8451F 0%, #C2542B 100%)',

  // Secondary Accent - Deep Forest Green (open-now signage)
  secondary: '#3D6B4F',
  secondaryHover: '#2F5540',
  secondaryContainer: '#628F72',
  secondaryLight: '#E7F0E9',

  // Signature Accent - Warm Honey (signage highlights)
  accent: '#E2A63D',
  accentHover: '#D0952C',
  accentLight: '#FBF3E2',
  accentText: '#2A2620',

  // Hyperlocal Badge - Soft Sage & Forest Green
  hyperBadgeBg: '#EAF0E7',
  hyperBadgeText: '#2F5D3C',
  hyperBadgeDot: '#4F8A5B',

  // Tertiary - Roasted Amber-Brown & Craft Accents
  tertiary: '#5B3A29',
  tertiaryHover: '#472919',
  tertiaryContainer: '#926a56',
  tertiaryFixed: '#ffdbcb',
  onTertiaryFixed: '#2e1507',

  // Warm Cream & Neutral Surface Scales
  surface: '#ffffff',
  surfaceWarm: '#F3EDE4',
  surfacePeach: '#F6E8DC',
  surfacePeachBorder: '#EAD8C6',
  surfaceContainer: '#F0EAE0',
  surfaceContainerLow: '#F6F1E9',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#EBE3D6',
  surfaceContainerHighest: '#E4DACB',

  // Canvas & Layout Aliases
  bg: '#FAF7F2',
  bgHero: '#FAF7F2',
  bgDim: '#ddd6cb',
  bgBright: '#FAF7F2',
  brandDark: '#2A2620',
  brandSurface: '#ffffff',
  brandBg: '#FAF7F2',
  brandMuted: '#F0EAE0',
  darkPill: '#2A2620',
  darkButton: '#2A2620',

  // Fine Hairline Borders & Outlines
  border: '#E6DED2',
  borderLight: '#F0EAE0',
  borderDark: '#C9BEB0',
  outline: '#7A7268',
  outlineVariant: '#C9BEB0',

  // Typography Content Colors
  textMain: '#2A2620',
  textMuted: '#5C554B',
  textLight: '#7A7268',
  white: '#ffffff',

  // Hyperlocal Specialized Badges & Chips
  liveBadgeBg: '#FBEDE6',
  liveBadgeText: '#6F2D12',
  verifiedChipBg: '#E7F0E9',
  verifiedChipBorder: '#CFE3D4',
  verifiedChipText: '#2F5D3C',
  serviceChipBg: '#f6ede1',
  serviceChipBorder: '#ead9c3',
  serviceChipText: '#5B3A29',
  starGold: '#E2A63D',

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

    error: '#B3123F',
    errorHover: '#8C0D30',
    errorLight: '#ffdad6',
    errorBorder: '#fecaca',

    info: '#2F5D3C',
    infoHover: '#2F5540',
    infoLight: '#FBEDE6',
    infoBorder: '#CFE3D4',
  },
};

export const typography = {
  fontFamily: {
    serif: "'Fraunces', Georgia, 'Times New Roman', serif",
    display: "'Fraunces', Georgia, 'Times New Roman', serif",
    headline: "'Fraunces', Georgia, 'Times New Roman', serif",
    sansHeadline: "'Fraunces', Georgia, 'Times New Roman', serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  sm: '0 1px 3px rgba(42, 38, 32, 0.04)',
  md: '0 2px 8px rgba(42, 38, 32, 0.06)',
  lg: '0 8px 24px -4px rgba(42, 38, 32, 0.1)',
  card: '0 1px 4px rgba(42, 38, 32, 0.04)',
  popover: '0 10px 25px -4px rgba(42, 38, 32, 0.14)',
  primary: '0 2px 8px rgba(168, 69, 31, 0.22)',
  ambientGlow: '0 8px 30px rgba(42, 38, 32, 0.08)',
  nav: '0 -4px 16px rgba(42, 38, 32, 0.06)',
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
    // One soft focus ring for every field (inputs, selects, date pickers)
    controlOutline: 'rgba(168, 69, 31, 0.16)',
    controlOutlineWidth: 3,
    colorErrorOutline: 'rgba(179, 18, 63, 0.14)',
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
      primaryShadow: '0 2px 8px rgba(168, 69, 31, 0.22)',
      colorText: colors.textMain,
    },
    Input: {
      controlHeight: 44,
      borderRadius: radii.lg,
      colorBorder: colors.border,
      colorBgContainer: colors.surface,
      activeBorderColor: colors.primary,
      hoverBorderColor: colors.borderDark,
      activeShadow: '0 0 0 3px rgba(168, 69, 31, 0.16)',
      errorActiveShadow: '0 0 0 3px rgba(179, 18, 63, 0.14)',
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
