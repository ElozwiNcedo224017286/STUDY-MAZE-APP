import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme/colors';

export default function LearnToolCard({ tool, width, onPress, index }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 90,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

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
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          ],
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
      >
        <View style={[styles.card, tool.soon && styles.cardSoon]}>
          <View style={[styles.badge, tool.soon ? styles.badgeSoon : styles.badgeLive]}>
            <Ionicons
              name={tool.soon ? 'time-outline' : 'sparkles'}
              size={10}
              color={tool.soon ? COLORS.warning : COLORS.primary}
            />
            <Text style={[styles.badgeText, tool.soon ? styles.badgeSoonText : styles.badgeLiveText]}>
              {tool.soon ? 'Soon' : 'AI'}
            </Text>
          </View>

          <LinearGradient
            colors={tool.colors}
            style={styles.icon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={tool.icon} size={26} color={COLORS.white} />
          </LinearGradient>

          <Text style={styles.title} numberOfLines={1}>{tool.title}</Text>
          <Text style={styles.text} numberOfLines={2}>{tool.text}</Text>

          <View style={[styles.action, { backgroundColor: tool.soon ? COLORS.border : tool.actionColor }]}>
            <Text style={[styles.actionText, tool.soon && styles.actionSoon]}>{tool.actionText}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  touchable: { flex: 1 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    minHeight: 228,
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
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  text: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 34,
    marginBottom: 14,
  },
  action: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 'auto',
  },
  actionText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  actionSoon: { color: COLORS.textTertiary },
});
