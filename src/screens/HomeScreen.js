import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenHeader from '../components/ScreenHeader';
import InsightCard from '../components/InsightCard';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const TOTAL_MAZE_LEVELS = 3;

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation }) {
  const { user, refreshUser, getUserStreak } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [refreshing, setRefreshing] = useState(false);
  const [quizMeta, setQuizMeta] = useState(null);
  const [quizCount, setQuizCount] = useState(0);
  const [board, setBoard] = useState([]);
  const [notesCount, setNotesCount] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(null);
  const scrollRef = useRef(null);
  const boardSectionY = useRef(0);

const load = useCallback(async () => {
  try {
    const [{ meta, questions }, { rows }, notes, streakData] =
      await Promise.all([
        api.getQuizBank().catch(() => ({
          meta: null,
          questions: [],
        })),

        api.getLeaderboard(5).catch(() => ({
          rows: [],
        })),

        (isTeacher
          ? api.getStudyMaterials()
          : api.getPublishedNotes()
        ).catch(() => ({
          materials: [],
        })),

        !isTeacher
          ? getUserStreak().catch(() => null)
          : Promise.resolve(null),
      ]);

    setQuizMeta(meta);
    setQuizCount((questions || []).length);
    setBoard(rows || []);
    setNotesCount((notes.materials || []).length);
    setDailyStreak(streakData);
  } catch {
    /* keep last good state */
  }
}, [isTeacher, getUserStreak]);

  useFocusEffect(useCallback(() => { load(); refreshUser?.(); }, [load, refreshUser]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), refreshUser?.()]);
    setRefreshing(false);
  }, [load, refreshUser]);

  const rank = board.findIndex((r) => r.user_id === user?.id) + 1;
  const currentLevel = Math.min(user?.unlockedLevel || 1, TOTAL_MAZE_LEVELS);
  const levelsCleared = Math.max(0, currentLevel - 1);
  const mazePercent = Math.round((levelsCleared / TOTAL_MAZE_LEVELS) * 100);

  function goToScoreboard() {
    if (isTeacher) {
      navigation.navigate('Class');
    } else if (board.length > 0) {
      scrollRef.current?.scrollTo({ y: Math.max(0, boardSectionY.current - 16), animated: true });
    }
  }

  const studentActions = [
    { key: 'maze', label: 'Maze', image: require('../../assets/Artwork/icon-maze.png'), onPress: () => navigation.getParent()?.navigate('MazeLevels') },
    { key: 'scoreboard', label: 'Scoreboard', image: require('../../assets/Artwork/icon-scoreboard.png'), onPress: goToScoreboard },
    { key: 'notes', label: 'Notes', image: require('../../assets/Artwork/icon-notes.png'), onPress: () => navigation.navigate('Learn') },
    { key: 'shop', label: 'Rewards', image: require('../../assets/Artwork/icon-rewards.png'), onPress: () => navigation.navigate('Rewards') },
  ];

  const teacherActions = [
    { key: 'studio', label: 'Studio', icon: 'create-outline', onPress: () => navigation.navigate('Studio') },
    { key: 'scoreboard', label: 'Scoreboard', image: require('../../assets/Artwork/icon-scoreboard.png'), onPress: goToScoreboard },
    { key: 'notes', label: 'Notes', image: require('../../assets/Artwork/icon-notes.png'), onPress: () => navigation.navigate('Notes') },
    { key: 'preview', label: 'Preview', icon: 'game-controller-outline', onPress: () => navigation.getParent()?.navigate('MazeLevels') },
  ];

  const actions = isTeacher ? teacherActions : studentActions;

  const notesInsight = isTeacher
    ? {
        title: notesCount ? `${notesCount} study notes posted` : 'Share a study note',
        description: notesCount
          ? 'Students can read these in the Learn tab.'
          : 'Post a short summary so students can revise between games.',
        icon: 'book',
        color: '#6366F1',
        actionText: 'Open Notes',
        onPress: () => navigation.navigate('Notes'),
      }
    : {
        title: notesCount ? `${notesCount} notes waiting` : 'Learn between rounds',
        description: notesCount
          ? 'Your teacher posted study notes you can revise anytime.'
          : 'Study notes from your teacher will show up in Learn.',
        icon: 'book',
        color: '#6366F1',
        actionText: 'Open Learn',
        onPress: () => navigation.navigate('Learn'),
      };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />

      <ScreenHeader>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <View style={styles.brandLogoWrap}>
              <Image source={require('../../assets/logo.png')} style={styles.brandLogo} />
            </View>
            <Text style={styles.brandText}>
              <Text style={styles.brandStudy}>Study</Text>
              <Text style={styles.brandMaze}>Maze</Text>
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.75} accessibilityLabel="Profile">
              <View style={styles.avatarWrap}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Ionicons name="person" size={18} color={COLORS.white} />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.bellButton}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
            </View>
          </View>
        </View>
      </ScreenHeader>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
      >
        <Text style={styles.greeting}>
          {greetingWord()}, <Text style={styles.greetingName}>{user?.username || 'Player'}</Text>
        </Text>

        <LinearGradient colors={COLORS.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>
              {isTeacher ? 'Your class at a glance' : 'Keep your streak alive!'}
            </Text>

            {!isTeacher && (
              <View style={styles.streakRow}>
                <View style={styles.streakIconWrap}>
                  <Ionicons name="flame" size={20} color={COLORS.accent} />
                </View>
                <Text style={styles.streakText}>
                  <Text style={styles.streakNumber}> {dailyStreak?.current_streak ?? 0} </Text> day streak
                </Text>
              </View>
            )}

<View style={styles.pillRow}>
  {isTeacher ? (
    <>
      <View style={styles.pill}>
        <Ionicons
          name="people"
          size={14}
          color={COLORS.white}
        />
        <Text style={styles.pillText}>
          {board.length} students
        </Text>
      </View>

      <View style={styles.pill}>
        <Ionicons
          name="document-text"
          size={14}
          color={COLORS.white}
        />
        <Text style={styles.pillText}>
          {notesCount} notes
        </Text>
      </View>
    </>
  ) : (
    <>
      <View style={styles.pill}>
        <Ionicons
          name="trophy"
          size={14}
          color={COLORS.white}
        />
        <Text style={styles.pillText}>
          Best {dailyStreak?.longest_streak ?? 0} days
        </Text>
      </View>

      <View style={styles.pill}>
        <Text style={styles.pillCoin}>
          🪙
        </Text>

        <Text style={styles.pillText}>
          {(user?.coins ?? 0).toLocaleString()} coins
        </Text>
      </View>
    </>
  )}
</View>

            <TouchableOpacity
              style={styles.continueBtn}
              activeOpacity={0.85}
              onPress={() => (isTeacher ? navigation.navigate('Studio') : navigation.getParent()?.navigate('Streak'))}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <Image
            source={require('../../assets/Artwork/dashboard-runner.png')}
            style={styles.heroIllustration}
            resizeMode="contain"
          />
        </LinearGradient>

        <View style={styles.quickActions}>
          {actions.map((action) => (
            <TouchableOpacity key={action.key} style={styles.actionCard} onPress={action.onPress} activeOpacity={0.8}>
              {action.image ? (
                <Image source={action.image} style={styles.actionImage} resizeMode="contain" />
              ) : (
                <View style={styles.actionIconWrap}>
                  <Ionicons name={action.icon} size={26} color={COLORS.primary} />
                </View>
              )}
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Study materials</Text>
        <TouchableOpacity
          style={styles.uploadCard}
          activeOpacity={0.85}
          onPress={() =>
            isTeacher
              ? navigation.navigate('Studio')
              : Alert.alert('Coming soon', 'Personal uploads for students aren\'t available yet — ask your teacher to add material in Studio.')
          }
        >
          <Image source={require('../../assets/Artwork/icon-upload.png')} style={styles.uploadIcon} resizeMode="contain" />
          <View style={styles.uploadInfo}>
            <Text style={styles.uploadTitle}>Upload study material</Text>
            <Text style={styles.uploadDesc}>Add notes, PDFs or images to create quizzes and AI notes.</Text>
          </View>
          <View style={styles.uploadBtn}>
            <Text style={styles.uploadBtnText}>Upload</Text>
          </View>
        </TouchableOpacity>

        {!isTeacher && (
          <>
            <Text style={styles.sectionTitle}>Continue learning</Text>
            <TouchableOpacity
              style={styles.continueCard}
              activeOpacity={0.85}
              onPress={() => navigation.getParent()?.navigate('MazeLevels')}
            >
              <Image
                source={require('../../assets/Artwork/dashboard-runner.png')}
                style={styles.continueThumb}
                resizeMode="cover"
              />
              <View style={styles.continueInfo}>
                <Text style={styles.continueTitle}>Maze Runner</Text>
                <Text style={styles.continueLevel}>Level {currentLevel} of {TOTAL_MAZE_LEVELS}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${mazePercent}%` }]} />
                </View>
                <Text style={styles.progressLabel}>{mazePercent}% complete</Text>
              </View>
              <View style={styles.playButton}>
                <Ionicons name="play" size={18} color={COLORS.white} />
              </View>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.sectionTitle}>Recommended for you</Text>
        <View style={styles.recommendRow}>
          <View style={[styles.recommendCard, { backgroundColor: COLORS.primaryFaded }]}>
            <Image source={require('../../assets/Artwork/icon-notes.png')} style={styles.recommendIcon} resizeMode="contain" />
            <Text style={styles.recommendTitle} numberOfLines={2}>
              {quizMeta
                ? `Quiz: ${quizMeta.topic}`
                : isTeacher ? 'No quiz published yet' : 'Warm up with a game'}
            </Text>
            <Text style={styles.recommendDesc} numberOfLines={2}>
              {quizMeta
                ? (isTeacher ? 'Students can play this now.' : `${quizCount} question${quizCount === 1 ? '' : 's'} ready`)
                : (isTeacher ? 'Build one from Studio.' : 'Built-in questions are ready.')}
            </Text>
            <TouchableOpacity
              style={styles.recommendBtn}
              activeOpacity={0.85}
              onPress={() => (isTeacher ? navigation.navigate('Studio') : navigation.navigate('Play'))}
            >
              <Text style={styles.recommendBtnText}>{isTeacher ? 'Open Studio' : 'Start quiz'}</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.recommendCard, { backgroundColor: '#FBF1E4' }]}>
            <Image source={require('../../assets/Artwork/icon-scoreboard.png')} style={styles.recommendIcon} resizeMode="contain" />
            <Text style={styles.recommendTitle} numberOfLines={2}>
              {isTeacher ? `${board.length} on the board` : rank ? `#${rank} this week` : 'Join the board'}
            </Text>
            <Text style={styles.recommendDesc} numberOfLines={2}>
              {isTeacher
                ? 'Live class standings.'
                : rank
                  ? "Keep going! You're climbing the leaderboard."
                  : 'Finish a game to appear here.'}
            </Text>
            {isTeacher && (
              <TouchableOpacity style={styles.recommendBtn} activeOpacity={0.85} onPress={() => navigation.navigate('Class')}>
                <Text style={styles.recommendBtnText}>View class</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <InsightCard {...notesInsight} />

        {board.length > 0 && (
          <View onLayout={(e) => { boardSectionY.current = e.nativeEvent.layout.y; }}>
            <Text style={styles.sectionTitle}>Class standings — Top 5</Text>
            <View style={styles.boardCard}>
              {board.map((row, i) => (
                <View key={row.user_id} style={[styles.boardRow, i === board.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.rankDot, i === 0 && styles.rankGold, i === 1 && styles.rankSilver, i === 2 && styles.rankBronze]}>
                    <Text style={styles.rankText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.boardName} numberOfLines={1}>{row.display_name}</Text>
                  <Text style={styles.boardCoins}>{row.total_coins} 🪙</Text>
                </View>
              ))}
              {isTeacher ? (
                <TouchableOpacity onPress={() => navigation.navigate('Class')} style={styles.viewAll}>
                  <Text style={styles.viewAllText}>View full class</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandLogoWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
    ...SHADOWS.small,
  },
  brandLogo: { width: '100%', height: '100%' },
  brandText: { fontSize: 19, letterSpacing: -0.4 },
  brandStudy: { color: COLORS.textPrimary, fontWeight: '900' },
  brandMaze: { color: COLORS.primary, fontWeight: '900' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  avatarImg: { width: '100%', height: '100%' },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },

  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16, letterSpacing: -0.4 },
  greetingName: { color: COLORS.primary },

  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
    minHeight: 210,
    ...SHADOWS.medium,
  },
  heroContent: { width: '50%' },
  heroEyebrow: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  streakIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  streakText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },
  streakNumber: { color: COLORS.white, fontSize: 20, fontWeight: '900' },
  pillRow: { marginTop: 14, gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  pillText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  pillCoin: { fontSize: 13 },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  continueBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },
  heroIllustration: {
    position: 'absolute',
    right: 0,
    bottom: -16,
    width: '78%',
    height: '114%',
  },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  actionImage: { width: 44, height: 44, marginBottom: 8 },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '700', textAlign: 'center' },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 12,
  },

  uploadCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  uploadIcon: { width: 52, height: 52, marginRight: 12 },
  uploadInfo: { flex: 1, marginRight: 10 },
  uploadTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  uploadDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16, marginTop: 3 },
  uploadBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  uploadBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },

  continueCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  continueThumb: { width: 64, height: 64, borderRadius: 14, marginRight: 12 },
  continueInfo: { flex: 1, marginRight: 10 },
  continueTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  continueLevel: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.backgroundTertiary, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: COLORS.textTertiary, marginTop: 5, fontWeight: '600' },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recommendRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  recommendCard: { flex: 1, borderRadius: 18, padding: 14 },
  recommendIcon: { width: 36, height: 36, marginBottom: 10 },
  recommendTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4, minHeight: 34 },
  recommendDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16, minHeight: 32 },
  recommendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 9,
    marginTop: 12,
    ...SHADOWS.small,
  },
  recommendBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },

  boardCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 6,
    ...SHADOWS.small,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  rankDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankGold: { backgroundColor: COLORS.accent },
  rankSilver: { backgroundColor: '#C7D0DC' },
  rankBronze: { backgroundColor: '#E0A878' },
  rankText: { fontWeight: '800', fontSize: 12, color: COLORS.textPrimary },
  boardName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  boardCoins: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  viewAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  viewAllText: { color: COLORS.primary, fontWeight: '700', fontSize: 13, marginRight: 2 },
});
