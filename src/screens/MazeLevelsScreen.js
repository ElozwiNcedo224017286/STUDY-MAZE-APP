import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { LEVELS } from './mazeData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_IMAGE_SIZE = Math.min(SCREEN_WIDTH * 0.62, 230);

// Every quiz node ('2') in a level's grid is worth 30 coins if answered correctly —
// this is the real, deterministic max coin reward for clearing that level.
function levelReward(level) {
  const quizNodes = level.grid.reduce((sum, row) => sum + row.split('').filter((ch) => ch === '2').length, 0);
  return quizNodes * 30;
}

export default function MazeLevelsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const unlocked = user?.unlockedLevel || 1;
  const levelsCleared = Math.min(unlocked - 1, LEVELS.length);
  const totalReward = LEVELS.reduce((sum, lvl) => sum + levelReward(lvl), 0);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Maze Runner</Text>
      </View>

      <LinearGradient colors={COLORS.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Image source={require('../../assets/Artwork/maze-hero-portal.png')} style={styles.heroImage} resizeMode="contain" />
        <View style={styles.heroBadge}>
          <Ionicons name="trophy" size={16} color={COLORS.accent} />
          <Text style={styles.heroBadgeText}>{levelsCleared} of {LEVELS.length}{'\n'}levels completed</Text>
        </View>
        <View style={styles.heroCoinPill}>
          <Text style={styles.heroCoin}>🪙</Text>
          <Text style={styles.heroCoinText}>{(user?.coins ?? 0).toLocaleString()}</Text>
        </View>
      </LinearGradient>

      {LEVELS.map((lvl, i) => {
        const locked = lvl.id > unlocked;
        const cleared = lvl.id < unlocked;
        const current = lvl.id === unlocked;
        const reward = levelReward(lvl);

        return (
          <View key={lvl.id} style={[styles.card, current && styles.cardCurrent]}>
            <View style={styles.nodeWrap}>
              {locked ? (
                <Image
                  source={lvl.id === 3
                    ? require('../../assets/Artwork/maze-node-locked-3.png')
                    : require('../../assets/Artwork/maze-node-locked.png')}
                  style={styles.nodeImage}
                  resizeMode="contain"
                />
              ) : lvl.id === 1 ? (
                <Image source={require('../../assets/Artwork/maze-node-unlocked.png')} style={styles.nodeImage} resizeMode="contain" />
              ) : (
                <View style={[styles.nodeCircle, cleared && styles.nodeCircleCleared]}>
                  <Ionicons name={cleared ? 'checkmark' : 'key'} size={20} color={COLORS.white} />
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{lvl.name}</Text>
              <Text style={styles.desc}>{lvl.desc}</Text>
              <View style={styles.rewardPill}>
                <Text style={styles.rewardCoin}>🪙</Text>
                <Text style={styles.rewardText}>+{reward}</Text>
              </View>
            </View>

            {locked ? (
              <View style={styles.lockedBtn}>
                <Ionicons name="lock-closed" size={14} color={COLORS.textTertiary} />
                <Text style={styles.lockedBtnText}>Complete{'\n'}Level {lvl.id - 1}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.playBtn} onPress={() => navigation.navigate('MazeGame', { levelIndex: i })}>
                <Text style={styles.playBtnText}>Play</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <View style={styles.rewardBanner}>
        <Image source={require('../../assets/Artwork/maze-reward-chest.png')} style={styles.rewardBannerImage} resizeMode="contain" />
        <Text style={styles.rewardBannerText}>Complete all levels to earn up to{'\n'}<Text style={styles.rewardBannerCoins}>+{totalReward} coins</Text></Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  container: { padding: 20, paddingBottom: 40 },
  topnav: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  title: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 18 },

  hero: {
    borderRadius: 22,
    minHeight: HERO_IMAGE_SIZE * 0.88,
    marginBottom: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    ...SHADOWS.medium,
  },
  heroImage: {
    position: 'absolute',
    right: -16,
    bottom: -16,
    width: HERO_IMAGE_SIZE,
    height: HERO_IMAGE_SIZE,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(26,16,48,0.55)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 14,
    alignSelf: 'flex-start',
  },
  heroBadgeText: { color: COLORS.white, fontWeight: '700', fontSize: 12, lineHeight: 15 },
  heroCoinPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26,16,48,0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroCoin: { fontSize: 13 },
  heroCoinText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  cardCurrent: { borderWidth: 2, borderColor: COLORS.primary },
  nodeWrap: { width: 52, height: 52, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  nodeImage: { width: 52, height: 52 },
  nodeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircleCleared: { backgroundColor: COLORS.success },
  name: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 15 },
  desc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3, marginBottom: 8 },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  rewardCoin: { fontSize: 11 },
  rewardText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  playBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16, marginLeft: 10 },
  playBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  lockedBtn: { alignItems: 'center', marginLeft: 10, width: 68 },
  lockedBtnText: { color: COLORS.textTertiary, fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2, lineHeight: 13 },

  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inkDark,
    borderRadius: 18,
    padding: 14,
    marginTop: 6,
    gap: 12,
  },
  rewardBannerImage: { width: 56, height: 56 },
  rewardBannerText: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
  rewardBannerCoins: { color: COLORS.accent, fontWeight: '800', fontSize: 14 },
});
