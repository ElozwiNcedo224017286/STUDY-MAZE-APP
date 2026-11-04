import React, { useEffect, useRef } from 'react';
import { Pressable, View, Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function MemoryCard({ card, size, index, disabled, onPress }) {
  const { colors } = useTheme();
  const revealed = card.face_up || card.matched;
  const turn = useRef(new Animated.Value(revealed ? 1 : 0)).current;
  useEffect(() => { Animated.spring(turn, { toValue: revealed ? 1 : 0, friction: 9, tension: 65, useNativeDriver: true }).start(); }, [revealed, turn]);
  const face = revealed ? String(card.face_value || '') : '';
  // Rotate each side separately so nested 3D transforms cannot flatten the face on web.
  return (
    <Pressable onPress={onPress} disabled={disabled} testID={`memory-card-${index}`} accessibilityRole="button" accessibilityLabel={revealed ? `${card.matched ? 'Matched' : 'Revealed'} card ${index + 1}: ${face}` : `Flip card ${index + 1}`} accessibilityState={{ disabled, selected: !!card.matched }} style={{ width: size, height: size * 1.12 }}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[styles.face, { transform: [{ perspective: 900 }, { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }]}>
          <LinearGradient colors={['#5B21B6', '#8B5CF6']} style={[styles.back, styles.backFill]}><View style={styles.backRing}><Ionicons name="sparkles" size={Math.round(size * 0.32)} color="#EDE9FE" accessible={false} /></View></LinearGradient>
        </Animated.View>
        <Animated.View style={[styles.face, { backgroundColor: card.matched ? colors.successLight : colors.surface, borderColor: card.matched ? colors.success : colors.border, borderWidth: 2, transform: [{ perspective: 900 }, { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) }] }]}>
          <Text style={{ color: colors.textPrimary, textAlign: 'center', padding: 4, fontSize: face.length > 5 ? 13 : Math.round(size * 0.39) }}>{face}</Text>
          {card.matched && <View style={styles.check}><Ionicons name="checkmark" size={12} color="#FFFFFF" accessible={false} /></View>}
        </Animated.View>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  face: { ...StyleSheet.absoluteFillObject, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', overflow: 'hidden' },
  back: { borderWidth: 1, borderColor: '#A78BFA' }, backRing: { padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)' },
  backFill: { width: '100%', height: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', right: 4, top: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
});
