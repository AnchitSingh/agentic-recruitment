// Design Tokens - Centralized design system values
// Extracted from existing components to maintain current design

export const colors = {
  // Primary brand colors (amber-orange gradient)
  primary: {
    50: 'bg-amber-50',
    100: 'bg-amber-100',
    400: 'bg-amber-400',
    500: 'bg-amber-500',
    600: 'bg-amber-600',
    text: {
      50: 'text-amber-50',
      100: 'text-amber-100',
      600: 'text-amber-600',
      700: 'text-amber-700',
      800: 'text-amber-800',
    },
    border: {
      200: 'border-amber-200',
      300: 'border-amber-300',
      400: 'border-amber-400',
      500: 'border-amber-500',
    },
    gradient: 'bg-gradient-to-r from-amber-600 to-orange-600',
    gradientAlt: 'bg-gradient-to-r from-amber-500 to-orange-500',
    gradientLight: 'bg-gradient-to-r from-amber-100 to-orange-100',
    gradientBr: 'bg-gradient-to-br from-amber-100 to-orange-100',
    gradientBrStrong: 'bg-gradient-to-br from-amber-400 to-orange-500',
    shadow: 'shadow-amber-600/25',
    shadowHover: 'shadow-amber-600/40',
    ring: 'ring-amber-600',
  },
  
  // Secondary/neutral colors
  slate: {
    50: 'bg-slate-50',
    100: 'bg-slate-100',
    200: 'bg-slate-200',
    text: {
      500: 'text-slate-500',
      600: 'text-slate-600',
      700: 'text-slate-700',
      800: 'text-slate-800',
      900: 'text-slate-900',
    },
    border: {
      100: 'border-slate-100',
      200: 'border-slate-200',
    },
  },
  
  // Gray (used in some components)
  gray: {
    100: 'bg-gray-100',
    200: 'bg-gray-200',
    text: {
      600: 'text-gray-600',
      700: 'text-gray-700',
      800: 'text-gray-800',
    },
  },
  
  // Success/correct states
  green: {
    50: 'bg-green-50',
    100: 'bg-green-100',
    500: 'bg-green-500',
    text: {
      600: 'text-green-600',
      700: 'text-green-700',
      800: 'text-green-800',
    },
    border: {
      200: 'border-green-200',
      400: 'border-green-400',
      500: 'border-green-500',
    },
    gradient: 'bg-gradient-to-r from-green-500 to-emerald-500',
  },
  
  // Error/danger states
  red: {
    50: 'bg-red-50',
    100: 'bg-red-100',
    600: 'bg-red-600',
    700: 'bg-red-700',
    text: {
      600: 'text-red-600',
      700: 'text-red-700',
      800: 'text-red-800',
    },
    border: {
      200: 'border-red-200',
      300: 'border-red-300',
      400: 'border-red-400',
      500: 'border-red-500',
    },
    shadow: 'shadow-red-600/25',
    ring: 'ring-red-600',
  },
  
  // Warning states
  orange: {
    100: 'bg-orange-100',
    text: {
      700: 'text-orange-700',
    },
  },
  
  yellow: {
    50: 'bg-yellow-50',
    text: {
      700: 'text-yellow-700',
      800: 'text-yellow-800',
    },
    border: {
      200: 'border-yellow-200',
    },
  },
  
  // Info states
  blue: {
    50: 'bg-blue-50',
    100: 'bg-blue-100',
    text: {
      700: 'text-blue-700',
    },
    border: {
      200: 'border-blue-200',
    },
    gradient: 'bg-gradient-to-r from-blue-500 to-indigo-500',
  },
  
  // Additional colors
  purple: {
    100: 'bg-purple-100',
    text: {
      700: 'text-purple-700',
    },
    gradient: 'bg-gradient-to-r from-purple-500 to-violet-500',
  },
  
  // White/transparent
  white: 'bg-white',
  transparent: 'bg-transparent',
};

export const spacing = {
  // Padding
  padding: {
    xs: 'px-2 py-1',
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-3',
    xl: 'px-8 py-4',
  },
  
  // Gaps
  gap: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6',
  },
  
  // Margins
  margin: {
    xs: 'm-1',
    sm: 'm-2',
    md: 'm-3',
    lg: 'm-4',
    xl: 'm-6',
  },
};

export const typography = {
  size: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  },
  
  weight: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },
};

export const borderRadius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
};

export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  none: 'shadow-none',
};

export const transitions = {
  all: 'transition-all duration-200',
  colors: 'transition-colors duration-200',
  transform: 'transition-transform duration-200',
  opacity: 'transition-opacity duration-200',
};

export const effects = {
  backdrop: 'backdrop-blur-sm',
  backdropLg: 'backdrop-blur-lg',
  hover: {
    scale: 'hover:scale-105',
    scaleSmall: 'hover:scale-[1.02]',
    translateY: 'hover:-translate-y-0.5',
    shadow: 'hover:shadow-lg',
  },
  active: {
    scale: 'active:scale-95',
  },
};

// Component-specific token combinations
export const components = {
  button: {
    base: `inline-flex items-center justify-center ${typography.weight.semibold} ${borderRadius.xl} ${transitions.all} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${effects.active.scale}`,
    
    variants: {
      primary: `${colors.primary.gradient} text-white ${shadows.lg} ${colors.primary.shadow} ${colors.primary.shadowHover} ${effects.hover.scale} ${effects.hover.translateY} focus-visible:${colors.primary.ring}`,
      secondary: `${colors.slate[100]} ${colors.slate.text[700]} hover:${colors.slate[200]} ${effects.hover.shadow} ${effects.hover.translateY} focus-visible:ring-slate-500`,
      danger: `${colors.red[600]} text-white hover:${colors.red[700]} ${shadows.lg} ${colors.red.shadow} ${effects.hover.translateY} focus-visible:${colors.red.ring}`,
      ghost: `${colors.slate.text[600]} hover:${colors.slate.text[800]} hover:${colors.slate[100]} hover:${shadows.sm} ${effects.hover.translateY} focus-visible:ring-slate-500`,
    },
    
    sizes: {
      sm: `${spacing.padding.sm} ${typography.size.sm} min-h-[2rem]`,
      md: `${spacing.padding.lg} ${typography.size.base} min-h-[2.75rem]`,
      lg: `${spacing.padding.xl} ${typography.size.lg} min-h-[3rem]`,
    },
    
    disabled: 'opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none',
    loading: 'cursor-wait',
  },
  
  badge: {
    base: `inline-flex items-center ${typography.weight.medium} ${borderRadius.full}`,
    
    variants: {
      default: `${colors.slate[100]} ${colors.slate.text[700]}`,
      primary: `${colors.primary[100]} ${colors.primary.text[700]}`,
      success: `${colors.green[100]} ${colors.green.text[700]}`,
      danger: `${colors.red[100]} ${colors.red.text[700]}`,
      warning: `${colors.orange[100]} ${colors.orange.text[700]}`,
      info: `${colors.blue[100]} ${colors.blue.text[700]}`,
      purple: `${colors.purple[100]} ${colors.purple.text[700]}`,
    },
    
    sizes: {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-2.5 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
    },
  },
  
  modal: {
    backdrop: `fixed inset-0 bg-black/40 ${effects.backdrop} ${transitions.opacity} animate-backdrop-in`,
    container: `relative inline-block w-full p-6 my-8 overflow-hidden text-left align-middle ${transitions.all} transform ${colors.white} ${shadows['2xl']} ${borderRadius['2xl']} sm:${borderRadius['3xl']} z-[10000] animate-modal-in`,
    iconContainer: `mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 ${borderRadius.full} ${colors.primary[100]} mb-4`,
  },
  
  card: {
    base: `${colors.white} ${borderRadius.xl} ${shadows.sm} hover:${shadows.md} ${transitions.all} border ${colors.slate.border[100]} hover:${colors.primary.border[200]}`,
  },
  
  input: {
    base: `w-full ${spacing.padding.md} ${borderRadius.lg} border ${colors.slate.border[200]} focus:${colors.primary.border[400]} focus:outline-none ${transitions.colors}`,
    error: `${colors.red.border[300]} ${colors.red[50]}`,
  },
  
  progressBar: {
    container: `w-full ${colors.slate[200]} ${borderRadius.full} h-2 sm:h-2.5`,
    bar: `h-2 sm:h-2.5 ${borderRadius.full} ${transitions.all} duration-500 ease-out`,
    colors: {
      amber: colors.primary.gradientAlt,
      green: colors.green.gradient,
      blue: colors.blue.gradient,
      purple: colors.purple.gradient,
    },
  },
};

// Background patterns
export const backgrounds = {
  page: 'antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900',
  pageMinHeight: 'antialiased bg-gradient-to-br from-slate-50 via-white to-amber-50/30 text-slate-900 min-h-screen',
};

// Utility function to combine classes
export const cn = (...classes) => classes.filter(Boolean).join(' ');
