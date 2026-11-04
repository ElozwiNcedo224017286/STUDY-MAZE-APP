import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { TYPE, SPACE, RADIUS } from '../../theme/layout';

export default function QuestAction({ title, description, icon, onPress, disabled, label }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label || title} accessibilityHint={description}
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? colors.primaryFaded : colors.surface, borderColor: pressed ? colors.primaryText : colors.border, opacity: disabled ? 0.55 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><Ionicons name={icon} size={23} color={colors.primaryText} accessible={false} /></View>
      <View style={styles.copy}><Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text><Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text></View>
      <View style={[styles.arrow, { backgroundColor: colors.primarySoft }]}><Ionicons name="arrow-forward" size={16} color={colors.primaryText} accessible={false} /></View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: RADIUS.card, minHeight: 88, padding: SPACE.lg, flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 }, title: { ...TYPE.cardTitle }, description: { ...TYPE.caption, marginTop: SPACE.xs },
  arrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
