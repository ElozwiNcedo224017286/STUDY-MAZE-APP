import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../theme/colors';

export default function ScreenHeader({
  title,
  titleHighlight,
  subtitle,
  right,
  children,
}) {
  const insets = useSafeAreaInsets();

  if (children) {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          {(title || titleHighlight) ? (
            <Text style={styles.titleRow}>
              {title ? (
                <Text style={styles.titlePart}>
                  {title}
                  {titleHighlight ? ' ' : ''}
                </Text>
              ) : null}
              {titleHighlight ? (
                <Text style={styles.titleHighlightPart}>{titleHighlight}</Text>
              ) : null}
            </Text>
          ) : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

export const headerStyles = StyleSheet.create({
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  iconButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textBlock: {
    flex: 1,
    paddingRight: 12,
  },
  right: {
    flexShrink: 0,
  },
  titleRow: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  titlePart: {
    color: COLORS.textPrimary,
    fontWeight: '900',
  },
  titleHighlightPart: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
});
