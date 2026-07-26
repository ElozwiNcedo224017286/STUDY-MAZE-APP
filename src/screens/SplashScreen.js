import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
  AccessibilityInfo,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const LOAD_HINTS = ['Loading study modules…', 'Sharpening pencils…', 'Waking up the ghosts…', 'Stacking coins…'];

// ---------------------------------------------------------------------------
// Background: deep gradient + two soft ambient glows + a faint Pac-Man-style
// dot/wall maze watermark. Replaces the flat color fill with something that
// reads as an art-directed game background instead of a template.
// ---------------------------------------------------------------------------
function AmbientBackground() {
  return (
    <>
      <LinearGradient
        colors={[colors.bg, '#05060F']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glowOrb, styles.glowGold]} pointerEvents="none" />
      <View style={[styles.glowOrb, styles.glowMint]} pointerEvents="none" />
      <MazeWatermark />
    </>
  );
}

function MazeWatermark() {
  const cols = 6;
  const rows = 11;
  const cellW = SCREEN_W / cols;
  const cellH = 76;
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Skip a scattered subset so it reads as maze corridors, not a rigid grid.
      if ((r * 3 + c * 5) % 7 === 0) continue;
      dots.push({ x: c * cellW + cellW / 2, y: r * cellH + 40, key: `${r}-${c}` });
    }
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((d) => (
        <View key={d.key} style={[styles.mazeDot, { left: d.x, top: d.y }]} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Floating background icon (used once the CTA is showing)
// ---------------------------------------------------------------------------
function FloatingIcon({ emoji, startX, startY, size, duration, delay, reduceMotion }) {
  const bob = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: duration * 4, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [bob, spin, duration, delay, reduceMotion]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] });

  return (
    <View style={[styles.floatWrap, { left: startX, top: startY }]}>
      <View style={[styles.floatGlow, { width: size + 22, height: size + 22, borderRadius: (size + 22) / 2 }]} />
      <Animated.Text
        style={[styles.floatIcon, { fontSize: size, transform: [{ translateY }, { rotate }] }]}
      >
        {emoji}
      </Animated.Text>
    </View>
  );
}

const ICONS = [
  { emoji: '🧩', size: 34, duration: 1800, delay: 0 },
  { emoji: '👻', size: 30, duration: 2200, delay: 200 },
  { emoji: '🪙', size: 26, duration: 1600, delay: 400 },
  { emoji: '⚡', size: 30, duration: 2000, delay: 100 },
  { emoji: '🧠', size: 28, duration: 2400, delay: 300 },
  { emoji: '📚', size: 26, duration: 1900, delay: 500 },
  { emoji: '🏆', size: 30, duration: 2100, delay: 250 }
];

export default function SplashScreen({ navigation }) {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'reveal' | 'ready'
  const [hint, setHint] = useState(LOAD_HINTS[0]);
  const [reduceMotion, setReduceMotion] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const [progressPct, setProgressPct] = useState(0);
  const hintFade = useRef(new Animated.Value(1)).current;

  const logoIntro = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(0)).current;
  const dotTrail = useRef(new Animated.Value(0)).current;

  const cardFlip = useRef(new Animated.Value(0)).current;
  const mascotFade = useRef(new Animated.Value(0)).current;
  const ctaBounce = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const iconsFade = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
  }, []);

  // Logo pop-in, then a continuous soft glow breathing + dot-trail sweep.
  useEffect(() => {
    Animated.spring(logoIntro, { toValue: 1, friction: 5.5, tension: 60, useNativeDriver: true }).start();
    if (reduceMotion) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    ).start();
    Animated.loop(
      Animated.timing(dotTrail, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [logoIntro, logoPulse, dotTrail, reduceMotion]);

  // Loading progress -> crossfade hint text -> reveal sequence -> ready.
  useEffect(() => {
    const listenerId = progress.addListener(({ value }) => {
      setProgressPct(Math.round(value * 100));
      const nextHint = LOAD_HINTS[Math.min(LOAD_HINTS.length - 1, Math.floor(value * LOAD_HINTS.length))];
      setHint((prev) => {
        if (prev === nextHint) return prev;
        Animated.sequence([
          Animated.timing(hintFade, { toValue: 0, duration: 120, useNativeDriver: true }),
          Animated.timing(hintFade, { toValue: 1, duration: 220, useNativeDriver: true })
        ]).start();
        return nextHint;
      });
    });

    Animated.timing(progress, {
      toValue: 1,
      duration: 1900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start(() => {
      setPhase('reveal');
      Animated.sequence([
        Animated.timing(cardFlip, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(mascotFade, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(ctaBounce, { toValue: 1, friction: 4.5, tension: 80, useNativeDriver: true })
      ]).start(() => {
        setPhase('ready');
        Animated.timing(iconsFade, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
        if (!reduceMotion) {
          Animated.loop(
            Animated.sequence([
              Animated.delay(1200),
              Animated.timing(shine, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
            ])
          ).start();
        }
      });
    });

    return () => progress.removeListener(listenerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoScale = Animated.multiply(
    logoIntro,
    logoPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] })
  );
  const logoGlow = logoPulse.interpolate({ inputRange: [0, 1], outputRange: [10, 24] });

  const cardScaleX = cardFlip.interpolate({ inputRange: [0, 1], outputRange: [0.08, 1] });
  const cardOpacity = cardFlip.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] });

  const ctaScale = ctaBounce.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const shineTranslate = shine.interpolate({ inputRange: [0, 1], outputRange: [-140, 220] });

  const placedIcons = ICONS.map((icon, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const startX = 20 + col * ((SCREEN_W - 70) / 3) + (i % 2 === 0 ? -8 : 8);
    const startY = 80 + row * 150 + (i % 3) * 16;
    return { ...icon, startX, startY };
  });

  const handlePressIn = () => Animated.spring(pressScale, { toValue: 0.94, useNativeDriver: true, friction: 5 }).start();
  const handlePressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();

  return (
    <View style={styles.container}>
      <AmbientBackground />

      {phase === 'ready' && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: iconsFade }]} pointerEvents="none">
          {placedIcons.map((icon, i) => <FloatingIcon key={i} {...icon} reduceMotion={reduceMotion} />)}
        </Animated.View>
      )}

      <SafeAreaView style={styles.centerBlock} pointerEvents="box-none">
        <View style={styles.logoWrap}>
          {/* Dark offset layer underneath fakes a bevel/depth edge on the text */}
          <Text style={[styles.logo, styles.logoShadowLayer]}>STUDY MAZE</Text>
          <Animated.Text
            style={[
              styles.logo,
              { textShadowRadius: logoGlow, opacity: logoIntro, transform: [{ scale: logoScale }] }
            ]}
          >
            STUDY MAZE
          </Animated.Text>
        </View>

        <Text style={styles.tagline}>LEARN · PLAY · EARN</Text>

        <View style={styles.dotTrailRow}>
          {[0, 1, 2, 3, 4].map((i) => {
            const t = dotTrail.interpolate({
              inputRange: [0, 0.2 * i, 0.2 * i + 0.2, 1],
              outputRange: [0.25, 0.25, 1, 0.25],
              extrapolate: 'clamp'
            });
            return <Animated.View key={i} style={[styles.trailDot, { opacity: t }]} />;
          })}
        </View>

        {phase === 'loading' && (
          <View style={styles.loadingBlock}>
            <View style={styles.loadTrack}>
              <Animated.View
                style={[
                  styles.loadFill,
                  { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }
                ]}
              />
              <Animated.Text
                style={[
                  styles.loadPac,
                  { left: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '96%'] }) }
                ]}
              >
                ●
              </Animated.Text>
            </View>
            <Animated.Text style={[styles.loadHint, { opacity: hintFade }]}>
              {hint}  ·  {progressPct}%
            </Animated.Text>
          </View>
        )}

        {(phase === 'reveal' || phase === 'ready') && (
          <>
            <Animated.View style={[styles.mascotCard, { opacity: cardOpacity, transform: [{ scaleX: cardScaleX }] }]}>
              <View style={styles.mascotCardInner}>
                <Animated.View style={{ opacity: mascotFade }}>
                  <Text style={styles.mascotEmoji}>🧠</Text>
                </Animated.View>
              </View>
            </Animated.View>

            <Animated.Text style={[styles.pitch, { opacity: ctaBounce }]}>
              Dodge ghosts, beat the clock, match pairs — all built from your own class material.
            </Animated.Text>

            <Animated.View style={{ opacity: ctaBounce, transform: [{ scale: Animated.multiply(ctaScale, pressScale) }] }}>
              <TouchableOpacity
                style={styles.cta}
                activeOpacity={0.9}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => navigation.replace('Auth')}
              >
                <View style={styles.ctaShineMask}>
                  <Animated.View style={[styles.ctaShine, { transform: [{ translateX: shineTranslate }, { rotate: '20deg' }] }]} />
                </View>
                <Text style={styles.ctaText}>Get Started ▶</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },

  glowOrb: { position: 'absolute', borderRadius: 260, opacity: 0.16 },
  glowGold: { width: 380, height: 380, top: -140, right: -110, backgroundColor: colors.gold },
  glowMint: { width: 420, height: 420, bottom: -180, left: -140, backgroundColor: colors.mint },

  mazeDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: colors.ink, opacity: 0.08 },

  floatWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  floatGlow: { position: 'absolute', backgroundColor: colors.gold, opacity: 0.1 },
  floatIcon: {},

  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },

  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  logo: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.gold,
    letterSpacing: 3,
    textShadowColor: 'rgba(255,214,10,0.65)',
    textShadowOffset: { width: 0, height: 0 }
  },
  logoShadowLayer: {
    position: 'absolute',
    color: '#00000055',
    textShadowColor: 'transparent',
    transform: [{ translateY: 3 }]
  },

  tagline: { color: colors.inkDim, fontSize: 12, letterSpacing: 3, marginTop: 8, marginBottom: 14 },

  dotTrailRow: { flexDirection: 'row', marginBottom: 26 },
  trailDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint, marginHorizontal: 4 },

  loadingBlock: { alignItems: 'center' },
  loadTrack: {
    width: 220,
    height: 12,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 8,
    overflow: 'visible',
    justifyContent: 'center'
  },
  loadFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.mint, borderRadius: 6 },
  loadPac: { position: 'absolute', top: -3, color: colors.gold, fontSize: 18, marginLeft: -6 },
  loadHint: { color: colors.inkDim, fontSize: 11, marginTop: 14, letterSpacing: 0.5 },

  mascotCard: {
    width: 156,
    height: 156,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20
  },
  mascotCardInner: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: colors.panel,
    borderWidth: 5,
    borderColor: colors.wallEdge,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mascotEmoji: { fontSize: 68 },

  pitch: { color: colors.ink, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28, opacity: 0.9 },

  cta: {
    backgroundColor: colors.mint,
    paddingVertical: 15,
    paddingHorizontal: 36,
    borderRadius: 14,
    shadowColor: '#04a677',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    overflow: 'hidden'
  },
  ctaShineMask: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 14 },
  ctaShine: { position: 'absolute', top: -40, bottom: -40, width: 40, backgroundColor: 'rgba(255,255,255,0.35)' },
  ctaText: { color: '#062B1F', fontWeight: '800', fontSize: 16, letterSpacing: 0.5, textAlign: 'center' }
});