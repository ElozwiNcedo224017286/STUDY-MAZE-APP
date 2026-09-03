import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function ProfileMenuItem({
  icon,
  title,
  description,
  onPress,
  danger,
}) {

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: danger ? COLORS.errorLight : COLORS.primarySoft }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.error : COLORS.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, danger && { color: COLORS.error }]}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
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
