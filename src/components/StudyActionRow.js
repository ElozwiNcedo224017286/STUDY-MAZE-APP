import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { TYPE, SPACE, RADIUS } from '../theme/layout';

export default function StudyActionRow({ icon, title, description, onPress, accessibilityLabel }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.78} accessibilityRole="button" accessibilityLabel={accessibilityLabel || title}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><Ionicons name={icon} size={21} color={colors.primaryText} /></View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {description ? <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.card, padding: SPACE.lg, gap: SPACE.md, marginBottom: SPACE.md, minHeight: 80 },
  icon: { width: 44, height: 44, borderRadius: RADIUS.small, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { ...TYPE.cardTitle },
  description: { ...TYPE.caption, marginTop: SPACE.xs },
});
