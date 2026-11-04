import React, { useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { TYPE, SPACE, RADIUS } from '../../theme/layout';

export default function LearnToolCard({ tool, width, onPress }) {
  const { colors, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const animate = value => Animated.spring(scale, { toValue: value, friction: 7, useNativeDriver: true }).start();
  return (
    <Animated.View style={{ width, transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={() => animate(0.975)} onPressOut={() => animate(1)} accessibilityRole="button" accessibilityLabel={tool.title} accessibilityHint={tool.text} testID={`study-tool-${tool.key}`}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.artFrame, { backgroundColor: isDark ? colors.backgroundTertiary : `${tool.colors[0]}0D` }]}>
          <View style={[styles.orb, { backgroundColor: `${tool.colors[0]}13` }]} />
          <Image source={tool.image} style={styles.art} resizeMode="contain" accessible={false} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{tool.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{tool.text}</Text>
        <View style={[styles.action, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.actionText, { color: colors.primaryText }]}>{tool.actionText}</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.primaryText} accessible={false} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  card: { flex: 1, padding: SPACE.md, borderWidth: 1, borderRadius: RADIUS.hero, minHeight: 268 },
  artFrame: { height: 108, borderRadius: 17, marginBottom: SPACE.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orb: { width: 76, height: 76, borderRadius: 38, position: 'absolute' }, art: { width: 106, height: 106 },
  title: { ...TYPE.cardTitle, marginBottom: SPACE.xs },
  description: { ...TYPE.caption, flex: 1, marginBottom: SPACE.md },
  action: { minHeight: 44, borderRadius: RADIUS.small, paddingVertical: SPACE.sm, paddingHorizontal: SPACE.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.xs },
  actionText: { ...TYPE.caption, fontWeight: '700', flex: 1 },
});
