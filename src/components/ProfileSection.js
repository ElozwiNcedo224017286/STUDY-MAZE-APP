import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../theme/colors';

export default function ProfileSection({ title, children }) {
  return (
    <View style={styles.container}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.sectionContent}>{children}</View>
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
