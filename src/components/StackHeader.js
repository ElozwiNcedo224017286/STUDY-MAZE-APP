import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { TYPE, SPACE, RADIUS, PAGE_CONTENT } from '../theme/layout';

export default function StackHeader({ title, subtitle, onBack, right }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.back, { backgroundColor: colors.backgroundTertiary }]} onPress={onBack} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.white,
    paddingBottom: SPACE.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  row: { ...PAGE_CONTENT, flexDirection: 'row', alignItems: 'center' },
  back: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.small,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  text: { flex: 1, marginHorizontal: 12 },
  title: { ...TYPE.cardTitle, fontSize: 18, lineHeight: 25, color: COLORS.textPrimary },
  subtitle: { ...TYPE.caption, color: COLORS.textSecondary, marginTop: SPACE.xs },
  right: { minWidth: 38, alignItems: 'flex-end' },
});
