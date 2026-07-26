import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const LOAD_HINTS = ['Loading study modules…', 'Sharpening pencils…', 'Waking up the ghosts…', 'Stacking coins…'];

// One floating emoji that drifts up and down and gently rotates, looping forever.
function FloatingIcon({ emoji, startX, startY, size, duration, delay }) {
  const bob = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: duration * 4, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [bob, spin, duration, delay]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -26] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] });

  return (
    <Animated.Text
      style={[
        styles.floatIcon,
        { left: startX, top: startY, fontSize: size, transform: [{ translateY }, { rotate }] }
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

const ICONS = [
  { emoji: '🧩', size: 40, duration: 1800, delay: 0 },
  { emoji: '👻', size: 34, duration: 2200, delay: 200 },
  { emoji: '🪙', size: 30, duration: 1600, delay: 400 },
  { emoji: '⚡', size: 36, duration: 2000, delay: 100 },
  { emoji: '🧠', size: 32, duration: 2400, delay: 300 },
  { emoji: '📚', size: 30, duration: 1900, delay: 500 },
  { emoji: '🏆', size: 34, duration: 2100, delay: 250 },
  { emoji: '❤️', size: 26, duration: 1700, delay: 350 }
];

export default function SplashScreen({ navigation }) {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'ready'
  const [hint, setHint] = useState(LOAD_HINTS[0]);
  const progress = useRef(new Animated.Value(0)).current;
  const [progressPct, setProgressPct] = useState(0);
  const logoPulse = useRef(new Animated.Value(0)).current;
  const iconsFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    ).start();
  }, [logoPulse]);

  // Simulated loading bar, then fade the floating icons + CTA in once it's done.
  useEffect(() => {
    const listenerId = progress.addListener(({ value }) => {
      setProgressPct(Math.round(value * 100));
      setHint(LOAD_HINTS[Math.min(LOAD_HINTS.length - 1, Math.floor(value * LOAD_HINTS.length))]);
    });
    Animated.timing(progress, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start(() => {
      setPhase('ready');
      Animated.timing(iconsFade, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
    return () => progress.removeListener(listenerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoScale = logoPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  // Scatter icons randomly-but-deterministically across the screen, avoiding the very center.
  const placedIcons = ICONS.map((icon, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const startX = 24 + col * ((SCREEN_W - 80) / 3) + (i % 2 === 0 ? -10 : 10);
    const startY = 90 + row * 140 + (i % 3) * 18;
    return { ...icon, startX, startY };
  });

  return (
    <View style={styles.container}>
      {phase === 'ready' && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: iconsFade }]} pointerEvents="none">
          {placedIcons.map((icon, i) => <FloatingIcon key={i} {...icon} />)}
        </Animated.View>
      )}

      <View style={styles.centerBlock} pointerEvents="box-none">
        <Animated.Text style={[styles.logo, { transform: [{ scale: logoScale }] }]}>STUDY MAZE</Animated.Text>
        <Text style={styles.tagline}>learn · play · earn</Text>

        {phase === 'loading' ? (
          <>
            <View style={styles.loadTrack}>
              <Animated.View
                style={[
                  styles.loadFill,
                  { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }
                ]}
              />
            </View>
            <Text style={styles.loadHint}>{hint} {progressPct}%</Text>
          </>
        ) : (
          <>
            <Text style={styles.pitch}>Dodge ghosts, beat the clock, match pairs — all built from your own class material.</Text>
            <TouchableOpacity style={styles.cta} onPress={() => navigation.replace('Auth')}>
              <Text style={styles.ctaText}>Get Started ▶</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  floatIcon: { position: 'absolute' },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28
  },
  logo: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.gold,
    letterSpacing: 2,
    textShadowColor: 'rgba(255,214,10,0.5)',
    textShadowRadius: 16,
    marginBottom: 6
  },
  tagline: { color: colors.inkDim, fontSize: 13, letterSpacing: 1, marginBottom: 18 },
  loadTrack: { width: 200, height: 10, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 6, overflow: 'hidden' },
  loadFill: { height: '100%', backgroundColor: colors.mint },
  loadHint: { color: colors.inkDim, fontSize: 11, marginTop: 12 },
  pitch: { color: colors.ink, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 30, opacity: 0.9 },
  cta: {
    backgroundColor: colors.mint,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#04a677',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0
  },
  ctaText: { color: '#062B1F', fontWeight: '800', fontSize: 15 }
});