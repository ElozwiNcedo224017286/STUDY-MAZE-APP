import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { TYPE, SPACE, RADIUS } from '../../theme/layout';

export default function LearnToolCard({ tool, width, onPress, index }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  }

  function pressOut() {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();
  }

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          width,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        disabled={tool.soon}
        style={styles.touchable}
        accessibilityRole="button"
        accessibilityLabel={tool.title}
        accessibilityHint={tool.text}
        testID={`study-tool-${tool.key}`}
      >
        <View style={[styles.card, tool.soon && styles.cardSoon]}>
          <LinearGradient
            colors={tool.colors}
            style={styles.icon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={tool.icon} size={26} color={COLORS.white} />
          </LinearGradient>

          <Text style={styles.title}>{tool.title}</Text>
          <Text style={styles.text}>{tool.text}</Text>

          <View style={[styles.action, { backgroundColor: tool.soon ? colors.border : tool.colors[0] }]}>
            <Text style={[styles.actionText, tool.soon && styles.actionSoon]}>{tool.actionText}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  wrap: { flexGrow: 0 },
  touchable: { flex: 1 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 226,
    flex: 1,
    ...SHADOWS.small,
  },
  cardSoon: { opacity: 0.88 },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeLive: { backgroundColor: COLORS.primarySoft },
  badgeSoon: { backgroundColor: COLORS.warningLight },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeLiveText: { color: COLORS.primary },
  badgeSoonText: { color: COLORS.warning },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.lg,
  },
  title: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  text: {
    ...TYPE.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    minHeight: 36,
    marginBottom: SPACE.lg,
  },
  action: {
    width: '100%',
    borderRadius: RADIUS.small,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.xs,
    minHeight: 44,
    alignItems: 'center',
    marginTop: 'auto',
  },
  actionText: { ...TYPE.label, color: COLORS.white, textAlign: 'center' },
  actionSoon: { color: COLORS.textTertiary },
});
