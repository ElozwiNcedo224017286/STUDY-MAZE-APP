/*import React from 'react';
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
*/











import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, SHADOWS } from '../theme/colors';
import { searchQuizAPISubject } from '../api/questions';

const SUBJECTS = [
  { id: 'science', name: 'Science', icon: '🔬' },
  { id: 'english', name: 'English', icon: '📚' },
  { id: 'engineering', name: 'Engineering', icon: '⚙️' },
  { id: 'it', name: 'IT', icon: '💻' },
  { id: 'geography', name: 'Geography', icon: '🌍' },
  { id: 'robotics', name: 'Robotics', icon: '🤖' },
  { id: 'mathematics', name: 'Mathematics', icon: '📐' },
  { id: 'business', name: 'Business', icon: '💼' },
];


const FAVORITES_STORAGE_KEY = '@study_maze_favorite_subjects';

const DEFAULT_SUBJECT_ICON = '📚';


export default function MazeGameDashboardScreen({
  navigation,
}) {

  const [subjectSearch, setSubjectSearch] =
    useState('');

  const [searchingSubject, setSearchingSubject] =
    useState(false);

  const [searchResult, setSearchResult] =
    useState(null);

  const [searchError, setSearchError] =
    useState('');

  const [favoriteSubjects, setFavoriteSubjects] =
    useState([]);

  const [favoritesLoaded, setFavoritesLoaded] =
    useState(false);


  /* =====================================================
     LOAD FAVORITES
  ===================================================== */

  useEffect(() => {

    let mounted = true;

    const loadFavorites = async () => {

      try {

        const stored =
          await AsyncStorage.getItem(
            FAVORITES_STORAGE_KEY
          );

        if (!mounted) {
          return;
        }

        if (stored) {

          const parsed =
            JSON.parse(stored);

          if (Array.isArray(parsed)) {
            setFavoriteSubjects(parsed);
          }

        }

      } catch (error) {

        console.log(
          'Could not load favorite subjects:',
          error
        );

      } finally {

        if (mounted) {
          setFavoritesLoaded(true);
        }

      }

    };

    loadFavorites();

    return () => {
      mounted = false;
    };

  }, []);


  /* =====================================================
     SAVE FAVORITES
  ===================================================== */

  const saveFavorites = useCallback(
    async favorites => {

      try {

        await AsyncStorage.setItem(
          FAVORITES_STORAGE_KEY,
          JSON.stringify(favorites)
        );

      } catch (error) {

        console.log(
          'Could not save favorite subjects:',
          error
        );

      }

    },
    []
  );


  /* =====================================================
     CHECK FAVORITE
  ===================================================== */

  const isFavorite = useCallback(
    subjectName => {

      if (!subjectName) {
        return false;
      }

      return favoriteSubjects.some(
        item =>
          String(item.name).toLowerCase() ===
          String(subjectName).toLowerCase()
      );

    },
    [favoriteSubjects]
  );


  /* =====================================================
     ADD FAVORITE
  ===================================================== */

  const addFavorite = useCallback(
    subjectData => {

      if (!subjectData?.name) {
        return;
      }

      if (isFavorite(subjectData.name)) {
        return;
      }

      const newFavorite = {

        id:
          subjectData.id ||
          String(subjectData.name)
            .toLowerCase()
            .replace(/\s+/g, '-'),

        name:
          subjectData.name,

        icon:
          subjectData.icon ||
          DEFAULT_SUBJECT_ICON,

        questionCount:
          Number(
            subjectData.questionCount || 0
          ),

        quizCount:
          Number(
            subjectData.quizCount || 0
          ),

        source: 'quizapi',

      };

      const updated = [
        ...favoriteSubjects,
        newFavorite,
      ];

      setFavoriteSubjects(updated);

      saveFavorites(updated);

    },
    [
      favoriteSubjects,
      isFavorite,
      saveFavorites,
    ]
  );


  /* =====================================================
     REMOVE FAVORITE
  ===================================================== */

  const removeFavorite = useCallback(
    subjectName => {

      const updated =
        favoriteSubjects.filter(
          item =>
            String(item.name).toLowerCase() !==
            String(subjectName).toLowerCase()
        );

      setFavoriteSubjects(updated);

      saveFavorites(updated);

    },
    [
      favoriteSubjects,
      saveFavorites,
    ]
  );


  /* =====================================================
     SEARCH QUIZAPI
  ===================================================== */

  const searchSubject = useCallback(
    async () => {

      const term =
        subjectSearch.trim();

      if (!term) {

        setSearchResult(null);

        setSearchError(
          'Enter a subject to search.'
        );

        return;
      }

      setSearchingSubject(true);

      setSearchError('');

      setSearchResult(null);

      try {

        const result =
          await searchQuizAPISubject(term);

        if (!result) {

          setSearchResult({
            subject: term,
            available: false,
            questionCount: 0,
            quizCount: 0,
          });

          return;
        }

        setSearchResult(result);

      } catch (error) {

        console.log(
          'QuizAPI subject search failed:',
          error
        );

        setSearchError(
          error?.message ||
          'Unable to search QuizAPI.'
        );

      } finally {

        setSearchingSubject(false);

      }

    },
    [subjectSearch]
  );


  /* =====================================================
     OPEN SUBJECT
     
     Dashboard → MazeGame
     
     The subject is passed through navigation.
  ===================================================== */

  const openSubject = useCallback(
    subjectName => {

      if (!subjectName) {
        return;
      }

      navigation.navigate(
        'MazeGame',
        {
          selectedSubject: subjectName,
        }
      );

    },
    [navigation]
  );


  return (

    <View style={styles.container}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >

            <Ionicons
              name="chevron-back"
              size={21}
              color={COLORS.textPrimary}
            />

          </TouchableOpacity>


          <View style={styles.headerInfo}>

            <Text style={styles.title}>
              Maze Game
            </Text>

            <Text style={styles.subtitle}>
              Search, favorite and play any subject
            </Text>

          </View>

        </View>


        {/* =================================================
            HERO
        ================================================= */}

        <LinearGradient
          colors={COLORS.gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >

          <View style={styles.heroContent}>

            <View style={styles.heroIcon}>

              <Ionicons
                name="game-controller"
                size={28}
                color={COLORS.accent}
              />

            </View>

            <Text style={styles.heroTitle}>
              Study Maze
            </Text>

            <Text style={styles.heroText}>
              Choose any subject, select your
              difficulty and enter the maze.
            </Text>

          </View>


          <View style={styles.heroBadge}>

            <Ionicons
              name="sparkles"
              size={14}
              color={COLORS.accent}
            />

            <Text style={styles.heroBadgeText}>
              Learn • Play • Earn
            </Text>

          </View>

        </LinearGradient>


        {/* =================================================
            FIND SUBJECT
        ================================================= */}

        <View style={styles.searchSection}>

          <View style={styles.sectionHeader}>

            <View>

              <Text style={styles.sectionTitle}>
                Find a Subject
              </Text>

              <Text style={styles.sectionSubtitle}>
                Search QuizAPI for any subject.
              </Text>

            </View>

            <View style={styles.searchIconBox}>

              <Ionicons
                name="search"
                size={18}
                color={COLORS.primary}
              />

            </View>

          </View>


          <View style={styles.searchRow}>

            <TextInput
              value={subjectSearch}
              onChangeText={value => {

                setSubjectSearch(value);
                setSearchResult(null);
                setSearchError('');

              }}
              placeholder="Mathematics, Python, Cybersecurity..."
              placeholderTextColor={
                COLORS.textTertiary
              }
              style={styles.searchInput}
              onSubmitEditing={searchSubject}
              returnKeyType="search"
            />


            <TouchableOpacity
              style={styles.searchButton}
              onPress={searchSubject}
              disabled={searchingSubject}
            >

              {searchingSubject ? (

                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />

              ) : (

                <Ionicons
                  name="search"
                  size={19}
                  color={COLORS.white}
                />

              )}

            </TouchableOpacity>

          </View>


          {searchError ? (

            <Text style={styles.searchError}>
              {searchError}
            </Text>

          ) : null}


          {/* =================================================
              SEARCH RESULT
          ================================================= */}

          {searchResult ? (

            <View style={styles.searchResultCard}>

              <View style={styles.resultHeader}>

                <View style={styles.resultIconBox}>

                  <Ionicons
                    name="book"
                    size={22}
                    color={COLORS.primary}
                  />

                </View>


                <View style={styles.resultInfo}>

                  <Text style={styles.resultSubject}>
                    {
                      searchResult.subject ||
                      subjectSearch
                    }
                  </Text>


                  {searchResult.available ? (

                    <View style={styles.availableRow}>

                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={COLORS.success}
                      />

                      <Text style={styles.availableText}>
                        Available on QuizAPI
                      </Text>

                    </View>

                  ) : (

                    <View style={styles.availableRow}>

                      <Ionicons
                        name="close-circle"
                        size={14}
                        color={COLORS.error || '#E85D5D'}
                      />

                      <Text style={styles.unavailableText}>
                        Not available on QuizAPI
                      </Text>

                    </View>

                  )}

                </View>

              </View>


              {searchResult.available ? (

                <>

                  <Text style={styles.resultMeta}>
                    {searchResult.questionCount || 0}
                    {' questions  •  '}
                    {searchResult.quizCount || 0}
                    {' quizzes'}
                  </Text>


                  <View style={styles.resultActions}>

                    <TouchableOpacity
                      style={[
                        styles.favoriteButton,
                        isFavorite(
                          searchResult.subject
                        ) &&
                          styles.favoriteButtonActive,
                      ]}
                      onPress={() => {

                        if (
                          isFavorite(
                            searchResult.subject
                          )
                        ) {

                          removeFavorite(
                            searchResult.subject
                          );

                        } else {

                          addFavorite({

                            name:
                              searchResult.subject,

                            questionCount:
                              searchResult.questionCount,

                            quizCount:
                              searchResult.quizCount,

                          });

                        }

                      }}
                    >

                      <Ionicons
                        name={
                          isFavorite(
                            searchResult.subject
                          )
                            ? 'star'
                            : 'star-outline'
                        }
                        size={16}
                        color={
                          isFavorite(
                            searchResult.subject
                          )
                            ? COLORS.white
                            : COLORS.primary
                        }
                      />

                      <Text
                        style={[
                          styles.favoriteButtonText,
                          isFavorite(
                            searchResult.subject
                          ) &&
                            styles.favoriteButtonTextActive,
                        ]}
                      >
                        {
                          isFavorite(
                            searchResult.subject
                          )
                            ? 'Favorited'
                            : 'Favorite'
                        }
                      </Text>

                    </TouchableOpacity>


                    <TouchableOpacity
                      style={styles.playSubjectButton}
                      onPress={() =>
                        openSubject(
                          searchResult.subject
                        )
                      }
                    >

                      <Ionicons
                        name="play"
                        size={15}
                        color={COLORS.white}
                      />

                      <Text style={styles.playSubjectText}>
                        Play
                      </Text>

                    </TouchableOpacity>

                  </View>

                </>

              ) : null}

            </View>

          ) : null}

        </View>


        {/* =================================================
            FAVORITES
        ================================================= */}

        <View style={styles.favoritesSection}>

          <View style={styles.favoriteHeaderRow}>

            <View style={styles.favoriteHeaderInfo}>

              <Text style={styles.sectionTitle}>
                Favorite Subjects
              </Text>

              <Text style={styles.sectionSubtitle}>
                Tap a favorite to choose its difficulty.
              </Text>

            </View>


            <View style={styles.favoriteCount}>

              <Text style={styles.favoriteCountText}>
                {favoriteSubjects.length}
              </Text>

            </View>

          </View>


          {favoritesLoaded &&
          favoriteSubjects.length === 0 ? (

            <View style={styles.emptyFavorites}>

              <View style={styles.emptyIconBox}>

                <Ionicons
                  name="star-outline"
                  size={28}
                  color={COLORS.accent}
                />

              </View>

              <Text style={styles.emptyFavoriteTitle}>
                No favorite subjects yet
              </Text>

              <Text style={styles.emptyFavoriteText}>
                Search for a subject above.
                When QuizAPI finds it, tap
                Favorite to save it here.
              </Text>

            </View>

          ) : null}


          {favoriteSubjects.map(
            favorite => (

              <View
                key={favorite.id}
                style={styles.favoriteCard}
              >

                <TouchableOpacity
                  style={styles.favoriteMain}
                  onPress={() =>
                    openSubject(
                      favorite.name
                    )
                  }
                >

                  <View style={styles.favoriteIconBox}>
                    <Text style={styles.favoriteIcon}>
                      {(
                        SUBJECTS.find(item => item.id === favorite.subject) ||
                        SUBJECTS.find(item => item.name === favorite.subject)
                      )?.icon || DEFAULT_SUBJECT_ICON}
                    </Text>
                  </View>


                  <View style={styles.favoriteInfo}>

                    <Text style={styles.favoriteName}>
                      {favorite.name}
                    </Text>

                    <Text style={styles.favoriteMeta}>
                      {
                        favorite.questionCount
                          ? `${favorite.questionCount} questions`
                          : 'QuizAPI subject'
                      }
                    </Text>

                  </View>


                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={COLORS.primary}
                  />

                </TouchableOpacity>


                <TouchableOpacity
                  style={styles.removeFavoriteButton}
                  onPress={() =>
                    removeFavorite(
                      favorite.name
                    )
                  }
                >

                  <Ionicons
                    name="star"
                    size={15}
                    color={COLORS.accent}
                  />

                </TouchableOpacity>

              </View>

            )
          )}

        </View>

      </ScrollView>

    </View>

  );
}


/* ==========================================================
   STYLES
========================================================== */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor:
      COLORS.backgroundSecondary,
  },

  content: {
    padding: 20,
    paddingTop: 45,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },

  backButton: {
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

  headerInfo: {
    flex: 1,
  },

  title: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 18,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },

  hero: {
    minHeight: 155,
    borderRadius: 22,
    marginBottom: 18,
    padding: 18,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },

  heroContent: {
    maxWidth: '75%',
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '900',
  },

  heroText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  heroBadge: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26,16,48,0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  heroBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },

  searchSection: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    marginBottom: 20,
    ...SHADOWS.small,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 3,
    marginBottom: 10,
  },

  searchIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  searchInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 11,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    fontSize: 11,
  },

  searchButton: {
    width: 45,
    height: 44,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchError: {
    color: COLORS.error || '#E85D5D',
    fontSize: 9,
    marginTop: 8,
    fontWeight: '800',
  },

  searchResultCard: {
    marginTop: 10,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resultIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  resultInfo: {
    flex: 1,
  },

  resultSubject: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },

  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  availableText: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: '800',
  },

  unavailableText: {
    color: COLORS.error || '#E85D5D',
    fontSize: 9,
    fontWeight: '800',
  },

  resultMeta: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 8,
  },

  resultActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  favoriteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },

  favoriteButtonActive: {
    backgroundColor: COLORS.primary,
  },

  favoriteButtonText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
  },

  favoriteButtonTextActive: {
    color: COLORS.white,
  },

  playSubjectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
  },

  playSubjectText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },

  favoritesSection: {
    marginBottom: 20,
  },

  favoriteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  favoriteHeaderInfo: {
    flex: 1,
  },

  favoriteCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteCountText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '900',
  },

  emptyFavorites: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    ...SHADOWS.small,
  },

  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  emptyFavoriteTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },

  emptyFavoriteText: {
    color: COLORS.textSecondary,
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 5,
  },

  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 9,
    marginBottom: 9,
    ...SHADOWS.small,
  },

  favoriteMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  favoriteIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  favoriteIcon: {
    fontSize: 20,
  },

  favoriteInfo: {
    flex: 1,
  },

  favoriteName: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '900',
  },

  favoriteMeta: {
    color: COLORS.textSecondary,
    fontSize: 8,
    marginTop: 2,
  },

  removeFavoriteButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
  },

});