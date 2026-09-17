import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, SHADOWS } from '../theme/colors';

export const STUDENT_TAGLINE = 'Play. Learn. Earn.';
export const TEACHER_TAGLINE = 'Create. Teach. Inspire.';

export default function BrandRow({ tagline = STUDENT_TAGLINE, style }) {
  return (
    <View style={[styles.logoContainer, style]}>
      <View style={styles.logoIcon}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
      </View>
      <View style={styles.appNameContainer}>
        <Text style={styles.appName}>
          <Text style={styles.studyText}>Study</Text>
          <Text style={styles.mazeText}>Maze</Text>
        </Text>
        {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  appNameContainer: {
    flexDirection: 'column',
    flexShrink: 1,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  studyText: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  mazeText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  tagline: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },
});
