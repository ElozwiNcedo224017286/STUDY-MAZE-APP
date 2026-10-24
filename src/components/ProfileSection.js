import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function ProfileSection({ title, children }) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {title ? <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text> : null}
      <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
});
