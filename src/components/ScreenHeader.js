import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import StackHeader from './StackHeader';
import { TYPE, SPACE, PAGE_CONTENT } from '../theme/layout';

export default function ScreenHeader({
  title,
  titleHighlight,
  subtitle,
  right,
  children,
  onBack,
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  if (onBack) {
    return <StackHeader title={[title, titleHighlight].filter(Boolean).join(' ')} subtitle={subtitle} onBack={onBack} right={right} />;
  }

  if (children) {
    return (
      <View style={[styles.header, { paddingTop: insets.top + SPACE.lg }]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACE.lg }]}>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          {(title || titleHighlight) ? (
            <Text style={styles.titleRow} accessibilityRole="header">
              {title ? (
                <Text style={[styles.titlePart, { color: colors.textPrimary }]}>
                  {title}
                  {titleHighlight ? ' ' : ''}
                </Text>
              ) : null}
              {titleHighlight ? (
                <Text style={[styles.titleHighlightPart, { color: colors.primaryText }]}>{titleHighlight}</Text>
              ) : null}
            </Text>
          ) : null}
          {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
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
    ...PAGE_CONTENT,
    paddingBottom: SPACE.lg,
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
    ...TYPE.pageTitle,
  },
  titlePart: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  titleHighlightPart: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  subtitle: {
    ...TYPE.body,
    color: COLORS.textSecondary,
    marginTop: SPACE.xs,
  },
});
