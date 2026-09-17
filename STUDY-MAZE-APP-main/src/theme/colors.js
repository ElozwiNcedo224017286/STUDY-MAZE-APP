// Study Maze design system — AgriMate structure, violet palette.

export const COLORS = {
  primary: '#6D28D9',
  primaryLight: '#8B5CF6',
  primaryDark: '#4C1D95',
  primarySoft: 'rgba(109, 40, 217, 0.12)',
  primaryFaded: 'rgba(109, 40, 217, 0.06)',

  accent: '#F5C542',
  accentLight: '#FDE68A',
  accentDark: '#D4A017',

  inkDark: '#1A1030',
  inkSoft: '#2D1B4E',
  inkMid: '#3D2A63',

  background: '#FFFFFF',
  backgroundSecondary: '#F6F4FB',
  backgroundTertiary: '#EEEAF8',
  backgroundWarm: '#FBF8FF',

  textPrimary: '#1A2332',
  textSecondary: '#5A6B7F',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.12)',
  info: '#6366F1',
  infoLight: 'rgba(99, 102, 241, 0.12)',

  white: '#FFFFFF',
  black: '#000000',
  border: '#E8E4F2',
  borderLight: '#F3F0FA',
  divider: '#F0EDF6',

  cardBackground: '#FFFFFF',
  cardShadow: 'rgba(26, 16, 48, 0.08)',

  gradients: {
    hero: ['#6D28D9', '#8B5CF6'],
    heroSoft: ['rgba(109, 40, 217, 0.16)', 'rgba(139, 92, 246, 0.05)'],
    gold: ['#F5C542', '#FBBF24'],
  },
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
};

// Arcade palette kept for in-game screens (maze, quiz rush, memory flip).
export const colors = {
  bg: '#12082B',
  panel: '#1E1044',
  panelLight: '#2A165C',
  wall: '#7B2CBF',
  wallEdge: '#9D4EDD',
  gold: '#FFD60A',
  mint: '#06FFA5',
  coral: '#FF4D6D',
  teal: '#4ECDC4',
  ink: '#F4F0FF',
  inkDim: '#B7A9E0',
  inkDim: '#B7A9E0'
};

export const spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28 };
