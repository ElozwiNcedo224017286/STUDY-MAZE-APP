import { Platform } from 'react-native';

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, page: 20, section: 24, xl: 32 };
export const RADIUS = { small: 12, card: 18, hero: 24, pill: 999 };
export const CONTENT_WIDTH = 960;
export const FONT_FAMILY = Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' });
export const TYPE = {
  pageTitle: { fontFamily: FONT_FAMILY, fontSize: 28, lineHeight: 35, fontWeight: '800', letterSpacing: -0.5 },
  sectionTitle: { fontFamily: FONT_FAMILY, fontSize: 20, lineHeight: 27, fontWeight: '800', letterSpacing: -0.3 },
  cardTitle: { fontFamily: FONT_FAMILY, fontSize: 16, lineHeight: 23, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontFamily: FONT_FAMILY, fontSize: 14, lineHeight: 21, fontWeight: '400' },
  label: { fontFamily: FONT_FAMILY, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  caption: { fontFamily: FONT_FAMILY, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  eyebrow: { fontFamily: FONT_FAMILY, fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 1 },
};
export const PAGE_CONTENT = { width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: SPACE.page };

export function studyToolWidth(windowWidth, fontScale = 1) {
  const available = Math.min(windowWidth, CONTENT_WIDTH) - SPACE.page * 2;
  return windowWidth < 360 || fontScale >= 1.4 ? available : (available - SPACE.md) / 2;
}
