import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../theme/colors';

export default function SplashScreen({ navigation }) {
  const [ready, setReady] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const cta = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      setReady(true);
      Animated.spring(cta, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    });
  }, [cta, fade, rise]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={[COLORS.backgroundSecondary, '#EDE7FB', COLORS.white]} style={StyleSheet.absoluteFill} />
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />

      <SafeAreaView style={styles.center}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }], alignItems: 'center' }}>
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
          </View>
          <Text style={styles.wordmark}>
            <Text style={styles.study}>Study</Text>
            <Text style={styles.maze}>Maze</Text>
          </Text>
          <Text style={styles.tagline}>PLAY · LEARN · EARN</Text>
          <Text style={styles.pitch}>
            Games built from your class material — maze, quiz rush, and memory, in one beautiful place.
          </Text>
        </Animated.View>

        {ready && (
          <Animated.View style={{ opacity: cta, transform: [{ scale: cta }], marginTop: 28 }}>
            <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={() => navigation.replace('Auth')}>
              <Text style={styles.ctaText}>Get started</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  orbOne: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.16,
    top: -80,
    right: -70,
  },
  orbTwo: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.accent,
    opacity: 0.12,
    bottom: -60,
    left: -50,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoWrap: {
    width: 108,
    height: 108,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 18,
    ...SHADOWS.large,
  },
  logo: { width: '100%', height: '100%' },
  wordmark: { fontSize: 34, letterSpacing: -0.8 },
  study: { color: COLORS.textPrimary, fontWeight: '900' },
  maze: { color: COLORS.primary, fontWeight: '900' },
  tagline: { color: COLORS.textSecondary, fontSize: 12, letterSpacing: 2.4, marginTop: 8, fontWeight: '700' },
  pitch: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 320,
  },
  cta: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 42,
    borderRadius: 16,
    ...SHADOWS.medium,
  },
  ctaText: { color: COLORS.white, fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
});
