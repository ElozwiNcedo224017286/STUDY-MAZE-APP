import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';

const FEATURES = [
  { key: 'maze', label: 'Maze challenges', image: require('../../assets/Artwork/icon-maze.png') },
  { key: 'quiz', label: 'Quick quizzes', icon: 'help-circle' },
  { key: 'rewards', label: 'Earn rewards', image: require('../../assets/Artwork/icon-rewards.png') },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_WIDTH = SCREEN_WIDTH - 48;
const HERO_HEIGHT = Math.min(HERO_WIDTH * (1024 / 1536), SCREEN_HEIGHT * 0.3);

export default function SplashScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={[COLORS.backgroundSecondary, '#EDE7FB', COLORS.white]} style={StyleSheet.absoluteFill} />
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />

      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.wordmark}>
              <Text style={styles.study}>Study</Text>
              <Text style={styles.maze}>Maze</Text>
            </Text>
            <Text style={styles.tagline}>PLAY. LEARN. EARN</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Image source={require('../../assets/Artwork/welcome-maze.png')} style={styles.hero} resizeMode="contain" />

          <Text style={styles.heading}>
            Turn learning{'\n'}into an <Text style={styles.headingAccent}>adventure</Text>
          </Text>
          <Text style={styles.pitch}>
            Play quick games made from your class material, earn coins and climb the leaderboard.
          </Text>

          <View style={styles.featureRow}>
            {FEATURES.map((f) => (
              <View key={f.key} style={styles.featureCard}>
                {f.image ? (
                  <Image source={f.image} style={styles.featureImage} resizeMode="contain" />
                ) : (
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={f.icon} size={26} color={COLORS.primary} />
                  </View>
                )}
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomBlock}>
          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.9}
            onPress={() => navigation.replace('Auth', { mode: 'register' })}
          >
            <Text style={styles.ctaText}>Get started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginRow}
            activeOpacity={0.7}
            onPress={() => navigation.replace('Auth', { mode: 'login' })}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginLink}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  flex: { flex: 1 },
  orbOne: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.3,
    top: -100,
    right: -90,
  },
  orbTwo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#FDE8D0',
    opacity: 0.7,
    bottom: -70,
    left: -60,
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    overflow: 'hidden',
    marginRight: 10,
    ...SHADOWS.small,
  },
  logo: { width: '100%', height: '100%' },
  headerText: { justifyContent: 'center' },
  wordmark: { fontSize: 22, letterSpacing: -0.6 },
  study: { color: COLORS.textPrimary, fontWeight: '900' },
  maze: { color: COLORS.primary, fontWeight: '900' },
  tagline: { color: COLORS.textSecondary, fontSize: 10, letterSpacing: 2, marginTop: 2, fontWeight: '700' },
  hero: { width: HERO_WIDTH, height: HERO_HEIGHT, marginVertical: 8 },
  heading: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 27,
  },
  headingAccent: { color: COLORS.primary },
  pitch: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 320,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    gap: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  featureImage: { width: 36, height: 36, marginBottom: 6 },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  featureLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  bottomBlock: { width: '100%', paddingHorizontal: 24, paddingBottom: 12, alignItems: 'center' },
  cta: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  ctaText: { color: COLORS.white, fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  loginRow: { marginTop: 12, padding: 4 },
  loginText: { color: COLORS.textSecondary, fontSize: 13 },
  loginLink: { color: COLORS.primary, fontWeight: '800' },
});
