import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { TYPE, SPACE, RADIUS } from '../theme/layout';

export default function ProfileSection({ title, children }) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {title ? <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text> : null}
      <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...TYPE.sectionTitle,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
});
