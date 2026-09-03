import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { LEVELS } from './mazeData';

// Every quiz node ('2') in a level's grid is worth 30 coins if answered correctly.
const MAZE_TOTAL_REWARD = LEVELS.reduce(
  (sum, lvl) => sum + lvl.grid.reduce((s, row) => s + row.split('').filter((ch) => ch === '2').length, 0) * 30,
  0
);

const GAMES = [
  {
    key: 'MazeLevels',
    title: 'Maze Runner',
    description: 'Dodge ghosts, collect tokens, and answer quiz nodes across 3 levels.',
    icon: 'map-outline',
    tag: 'Adventure',
    image: require('../../assets/Artwork/game-maze-runner.png'),
    reward: MAZE_TOTAL_REWARD,
  },
  {
    key: 'QuizRush',
    title: 'Quiz Rush',
    description: 'Beat the clock on rapid-fire questions. Three lives. One streak.',
    icon: 'flash-outline',
    tag: 'Speed',
    image: require('../../assets/Artwork/game-quiz-rush.png'),
    reward: 200, // 10-question streak x 20 coins each
  },
  {
    key: 'MemoryFlip',
    title: 'Memory Flip',
    description: 'Match subject pairs before the 60-second timer runs out.',
    icon: 'grid-outline',
    tag: 'Focus',
    image: require('../../assets/Artwork/game-memory-flip.png'),
    reward: 90, // top-end speed bonus (max(20, round(timeLeft * 1.5)))
  },
];

export default function PlayScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [quizMeta, setQuizMeta] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { meta } = await api.getQuizBank();
      setQuizMeta(meta);
    } catch { /* ignore */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />

      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            <Text style={styles.headerPlay}>Play </Text>
            <Text style={styles.headerZone}>Zone</Text>
          </Text>
          <Text style={styles.headerSub}>Three games. One quiz bank. Earn coins as you learn.</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statCoin}>🪙</Text>
          <Text style={styles.statText}>{(user?.coins ?? 0).toLocaleString()}</Text>
          <View style={styles.statDivider} />
          <Ionicons name="flame" size={15} color="#F97316" />
          <Text style={styles.statText}>{user?.streakDays ?? 0}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[COLORS.primary]} />
        }
      >
        <LinearGradient colors={COLORS.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroContent}>
            {quizMeta ? (
              <>
                <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
                <Text style={styles.heroTitle}>Playing: {quizMeta.topic}</Text>
                <Text style={styles.heroSub}>This is the live question set from your teacher.</Text>
              </>
            ) : (
              <>
                <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>READY</Text></View>
                <Text style={styles.heroTitle}>Built-in questions ready</Text>
                <Text style={styles.heroSub}>When your teacher publishes a quiz, every game here will use it.</Text>
              </>
            )}
          </View>
          <Image source={require('../../assets/Artwork/icon-quiz-tray.png')} style={styles.heroImage} resizeMode="contain" />
        </LinearGradient>

        <Text style={styles.eyebrow}>GAMES</Text>
        <Text style={styles.sectionTitle}>Choose how you want to learn</Text>

        {GAMES.map((game) => (
          <TouchableOpacity
            key={game.key}
            style={styles.gameCard}
            activeOpacity={0.85}
            onPress={() => navigation.getParent()?.navigate(game.key)}
          >
            <Image source={game.image} style={styles.gameImage} resizeMode="cover" />
            <View style={styles.gameInfo}>
              <View style={styles.gameTopRow}>
                <View style={styles.gameIconWrap}>
                  <Ionicons name={game.icon} size={18} color={COLORS.white} />
                </View>
                <Text style={styles.gameTitle} numberOfLines={1}>{game.title}</Text>
                <View style={styles.tagPill}><Text style={styles.tagText}>{game.tag}</Text></View>
              </View>
              <Text style={styles.gameDesc}>{game.description}</Text>
              <View style={styles.gameBottomRow}>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardCoin}>🪙</Text>
                  <Text style={styles.rewardText}>+{game.reward}</Text>
                </View>
                <View style={styles.goArrow}>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.white} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, gap: 12 },
  headerTitle: { fontSize: 30, letterSpacing: -0.6 },
  headerPlay: { color: COLORS.textPrimary, fontWeight: '900' },
  headerZone: { color: COLORS.primary, fontWeight: '900' },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  statCoin: { fontSize: 14 },
  statText: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  statDivider: { width: 1, height: 14, backgroundColor: COLORS.border, marginHorizontal: 2 },

  body: { paddingHorizontal: 20, paddingTop: 4 },

  hero: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 130,
    ...SHADOWS.medium,
  },
  heroContent: { flex: 1, paddingRight: 10 },
  liveBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  liveBadgeText: { color: COLORS.white, fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  heroTitle: { color: COLORS.white, fontWeight: '800', fontSize: 16, marginBottom: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
  heroImage: { width: 74, height: 74 },

  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: COLORS.primary, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4, marginBottom: 14 },

  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: 16,
    padding: 12,
    ...SHADOWS.small,
  },
  gameImage: { width: 88, height: 88, borderRadius: 16, marginRight: 12 },
  gameInfo: { flex: 1, justifyContent: 'space-between' },
  gameTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  gameIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  tagPill: { backgroundColor: COLORS.primarySoft, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  tagText: { color: COLORS.primary, fontWeight: '700', fontSize: 11 },
  gameDesc: { fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 10 },
  gameBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rewardCoin: { fontSize: 12 },
  rewardText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  goArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
