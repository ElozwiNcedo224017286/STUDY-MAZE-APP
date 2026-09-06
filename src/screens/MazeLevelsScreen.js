<<<<<<< HEAD
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
=======

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

import {
  SUBJECTS,
  DIFFICULTIES,
} from './mazeData';

export default function MazeLevelsScreen({ navigation }) {
  const { user } = useAuth();

  const [selectedSubject, setSelectedSubject] =
    useState(null);

  const unlockedLevel =
    user?.unlockedLevel || 1;

  function chooseSubject(subject) {
    setSelectedSubject(subject);
  }

  function chooseDifficulty(difficulty) {
    if (!selectedSubject) return;

    const difficultyIndex =
      DIFFICULTIES.findIndex(
        (item) => item.id === difficulty.id
      );

    // Difficulty unlocking.
    //
    // Easy = always available
    // Medium = level 2
    // Hard = level 3
    // Expert = level 4
    //
    const requiredLevel =
      difficultyIndex + 1;

    if (requiredLevel > unlockedLevel) {
      return;
    }

    navigation.navigate('MazeGame', {
      subject: selectedSubject.id,
      difficulty: difficulty.id,
    });
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
    >
      <View style={styles.topnav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (selectedSubject) {
              setSelectedSubject(null);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.backBtnText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>
            Study Maze
          </Text>

          <Text style={styles.subtitle}>
            {selectedSubject
              ? `${selectedSubject.icon} ${selectedSubject.name}`
              : 'Choose a subject'}
          </Text>
        </View>
      </View>

      {!selectedSubject ? (
        <>
          <Text style={styles.sectionTitle}>
            Choose a Subject
          </Text>

          <Text style={styles.sectionDescription}>
            Select what you want to study.
          </Text>

          {SUBJECTS.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              style={styles.subjectCard}
              onPress={() =>
                chooseSubject(subject)
              }
              activeOpacity={0.8}
            >
              <View style={styles.subjectIcon}>
                <Text style={styles.subjectIconText}>
                  {subject.icon}
                </Text>
              </View>

              <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>
                  {subject.name}
                </Text>

                <Text style={styles.subjectDescription}>
                  {subject.description}
                </Text>
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <View style={styles.selectedSubjectCard}>
            <Text style={styles.selectedIcon}>
              {selectedSubject.icon}
            </Text>

            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName}>
                {selectedSubject.name}
              </Text>

              <Text style={styles.selectedDescription}>
                {selectedSubject.description}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Choose Difficulty
          </Text>

          <Text style={styles.sectionDescription}>
            Higher difficulties create larger mazes,
            faster ghosts and harder questions.
          </Text>

          {Array.isArray(DIFFICULTIES) && DIFFICULTIES.map(
            (difficulty, index) => {
              const requiredLevel =
                index + 1;

              const locked =
                requiredLevel >
                unlockedLevel;

              return (
                <TouchableOpacity
                  key={difficulty.id}
                  style={[
                    styles.difficultyCard,
                    locked &&
                      styles.cardLocked,
                  ]}
                  disabled={locked}
                  onPress={() =>
                    chooseDifficulty(
                      difficulty
                    )
                  }
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.difficultyIcon,
                      locked &&
                        styles.difficultyIconLocked,
                    ]}
                  >
                    <Text style={styles.difficultyIconText}>
                      {locked
                        ? '🔒'
                        : difficulty.icon}
                    </Text>
                  </View>

                  <View style={styles.difficultyInfo}>
                    <Text style={styles.difficultyName}>
                      {difficulty.name}
                    </Text>

                    <Text style={styles.difficultyDescription}>
                      {locked
                        ? `Complete Level ${requiredLevel - 1} to unlock`
                        : difficulty.description}
                    </Text>
                  </View>

                  {!locked && (
                    <View style={styles.playButton}>
                      <Text style={styles.playButtonText}>
                        PLAY
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }
          )}
        </>
      )}
>>>>>>> origin/maze-updates
    </ScrollView>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
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
=======
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  container: {
    padding: 18,
    paddingTop: 50,
    paddingBottom: 40,
  },

  topnav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backBtnText: {
    color: colors.ink,
    fontSize: 22,
  },

  title: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 17,
  },

  subtitle: {
    color: colors.inkDim,
    fontSize: 11,
    marginTop: 2,
  },

  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 5,
  },

  sectionDescription: {
    color: colors.inkDim,
    fontSize: 11.5,
    lineHeight: 17,
    marginBottom: 15,
  },

  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
  },

  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.panelLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  subjectIconText: {
    fontSize: 25,
  },

  subjectInfo: {
    flex: 1,
  },

  subjectName: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 14,
  },

  subjectDescription: {
    color: colors.inkDim,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 3,
  },

  arrow: {
    color: colors.mint,
    fontSize: 27,
    fontWeight: '300',
    marginLeft: 8,
  },

  selectedSubjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panelLight,
    borderWidth: 2,
    borderColor: colors.mint,
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
  },

  selectedIcon: {
    fontSize: 34,
    marginRight: 13,
  },

  selectedName: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 16,
  },

  selectedDescription: {
    color: colors.inkDim,
    fontSize: 10.5,
    marginTop: 3,
    lineHeight: 15,
  },

  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
  },

  cardLocked: {
    opacity: 0.45,
  },

  difficultyIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: colors.panelLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  difficultyIconLocked: {
    backgroundColor: colors.panel,
  },

  difficultyIconText: {
    fontSize: 21,
  },

  difficultyInfo: {
    flex: 1,
  },

  difficultyName: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 14,
  },

  difficultyDescription: {
    color: colors.inkDim,
    fontSize: 10.5,
    marginTop: 3,
    lineHeight: 15,
  },

  playButton: {
    backgroundColor: colors.mint,
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  playButtonText: {
    color: '#062B1F',
    fontWeight: '900',
    fontSize: 10,
  },
>>>>>>> origin/maze-updates
});
