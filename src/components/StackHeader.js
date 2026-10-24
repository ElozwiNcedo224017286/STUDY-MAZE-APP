import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function StackHeader({ title, subtitle, onBack, right }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.back, { backgroundColor: colors.backgroundTertiary }]} onPress={onBack} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : <View style={styles.back} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  text: { flex: 1, marginHorizontal: 12 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600' },
  right: { minWidth: 38, alignItems: 'flex-end' },
});
