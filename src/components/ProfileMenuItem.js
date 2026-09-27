import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function ProfileMenuItem({
  icon,
  title,
  description,
  onPress,
  danger,
  disabled = false,
  titleStyle,
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={[styles.container, { borderBottomColor: colors.divider }, disabled && styles.disabled]} onPress={onPress} activeOpacity={0.7} disabled={disabled}>
      <View style={[styles.iconWrap, { backgroundColor: danger ? COLORS.errorLight : COLORS.primarySoft }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.error : colors.primaryText} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }, danger && { color: COLORS.error }, titleStyle]}>{title}</Text>
        {description ? <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  disabled: { opacity: 0.55 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginLeft: 14,
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
