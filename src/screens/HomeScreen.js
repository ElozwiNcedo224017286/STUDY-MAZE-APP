import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenHeader, { headerStyles } from '../components/ScreenHeader';
import BrandRow, { STUDENT_TAGLINE, TEACHER_TAGLINE } from '../components/BrandRow';
import InsightCard from '../components/InsightCard';
import FeatureCard from '../components/FeatureCard';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [refreshing, setRefreshing] = useState(false);
  const [quizMeta, setQuizMeta] = useState(null);
  const [board, setBoard] = useState([]);
  const [notesCount, setNotesCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const [{ meta }, { rows }, notes] = await Promise.all([
        api.getQuizBank().catch(() => ({ meta: null })),
        api.getLeaderboard(5).catch(() => ({ rows: [] })),
        (isTeacher ? api.getStudyMaterials() : api.getPublishedNotes()).catch(() => ({ materials: [] })),
      ]);
      setQuizMeta(meta);
      setBoard(rows || []);
      setNotesCount((notes.materials || []).length);
    } catch {
      /* keep last good state */
    }
  }, [isTeacher]);

  useFocusEffect(useCallback(() => { load(); refreshUser?.(); }, [load, refreshUser]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), refreshUser?.()]);
    setRefreshing(false);
  }, [load, refreshUser]);

  const rank = board.findIndex((r) => r.user_id === user?.id) + 1;

  const studentActions = [
    { key: 'maze', label: 'Maze', icon: 'map', onPress: () => navigation.getParent()?.navigate('MazeLevels') },
    { key: 'quiz', label: 'Quiz', icon: 'flash', onPress: () => navigation.getParent()?.navigate('QuizRush') },
    { key: 'memory', label: 'Memory', icon: 'grid', onPress: () => navigation.getParent()?.navigate('MemoryFlip') },
    { key: 'shop', label: 'Rewards', icon: 'gift', onPress: () => navigation.navigate('Rewards') },
  ];

  const teacherActions = [
    { key: 'studio', label: 'Studio', icon: 'create', onPress: () => navigation.navigate('Studio') },
    { key: 'class', label: 'Class', icon: 'people', onPress: () => navigation.navigate('Class') },
    { key: 'notes', label: 'Notes', icon: 'document-text', onPress: () => navigation.navigate('Notes') },
    { key: 'preview', label: 'Preview', icon: 'game-controller', onPress: () => navigation.getParent()?.navigate('MazeLevels') },
  ];

  const actions = isTeacher ? teacherActions : studentActions;

  const insights = isTeacher
    ? [
        quizMeta
          ? {
              title: `Live quiz: ${quizMeta.topic}`,
              description: 'Students can play this set in Maze, Quiz Rush, and Memory Flip.',
              icon: 'radio-button-on',
              color: COLORS.primary,
              actionText: 'Manage in Studio',
              onPress: () => navigation.navigate('Studio'),
            }
          : {
              title: 'No quiz published yet',
              description: 'Build questions from slides or add them by hand, then publish to your class.',
              icon: 'add-circle',
              color: COLORS.primary,
              actionText: 'Open Studio',
              onPress: () => navigation.navigate('Studio'),
            },
        {
          title: `${board.length} learners on the board`,
          description: 'Coins earned across all games — a live pulse on who is engaging.',
          icon: 'trophy',
          color: '#F59E0B',
          actionText: 'View class',
          onPress: () => navigation.navigate('Class'),
        },
        {
          title: notesCount ? `${notesCount} study notes posted` : 'Share a study note',
          description: notesCount
            ? 'Students can read these in the Learn tab.'
            : 'Post a short summary so students can revise between games.',
          icon: 'book',
          color: '#6366F1',
          actionText: 'Open Notes',
          onPress: () => navigation.navigate('Notes'),
        },
      ]
    : [
        quizMeta
          ? {
              title: `Quiz live: ${quizMeta.topic}`,
              description: `Prepared by ${quizMeta.teacher}. Play any game to practise it.`,
              icon: 'sparkles',
              color: COLORS.primary,
              actionText: 'Start playing',
              onPress: () => navigation.navigate('Play'),
            }
          : {
              title: 'Warm up with a game',
              description: 'Your teacher has not published a custom quiz yet — built-in questions are ready.',
              icon: 'game-controller',
              color: COLORS.primary,
              actionText: 'Choose a game',
              onPress: () => navigation.navigate('Play'),
            },
        {
          title: rank ? `You are #${rank} on the board` : 'Climb the class board',
          description: rank
            ? 'Keep playing to earn coins and hold your place.'
            : 'Finish a game to appear on the class leaderboard.',
          icon: 'podium',
          color: '#F59E0B',
        },
        {
          title: notesCount ? `${notesCount} notes waiting` : 'Learn between rounds',
          description: notesCount
            ? 'Your teacher posted study notes you can revise anytime.'
            : 'Study notes from your teacher will show up in Learn.',
          icon: 'book',
          color: '#6366F1',
          actionText: 'Open Learn',
          onPress: () => navigation.navigate('Learn'),
        },
      ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />
      <ScreenHeader>
        <View style={styles.heroRow}>
          <BrandRow tagline={isTeacher ? TEACHER_TAGLINE : STUDENT_TAGLINE} />
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.75}
            accessibilityLabel="Profile"
          >
            <View style={headerStyles.iconButton}>
              <Ionicons name="person-outline" size={20} color={COLORS.textPrimary} />
            </View>
          </TouchableOpacity>
        </View>
      </ScreenHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
      >
        <LinearGradient colors={COLORS.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{isTeacher ? 'Teacher dashboard' : 'Welcome back'}</Text>
          <Text style={styles.heroName}>{user?.username || 'Player'}</Text>
          <Text style={styles.heroSub}>
            {isTeacher
              ? 'Publish quizzes, share notes, and watch your class climb.'
              : 'Dodge ghosts, beat the clock, match pairs — then cash in coins.'}
          </Text>
          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{user?.coins ?? 0}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{user?.highScore ?? 0}</Text>
              <Text style={styles.statLabel}>Best</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{isTeacher ? board.length : user?.unlockedLevel || 1}</Text>
              <Text style={styles.statLabel}>{isTeacher ? 'Players' : 'Level'}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.quickActions}>
          {actions.map((action) => (
            <TouchableOpacity key={action.key} style={styles.actionCard} onPress={action.onPress} activeOpacity={0.75}>
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon} size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!isTeacher && (
          <>
            <Text style={styles.sectionTitle}>Jump back in</Text>
            <FeatureCard
              title="Maze Runner"
              description="Dodge ghosts, collect tokens, answer quiz nodes."
              icon="map-outline"
              colors={['#6D28D9', '#7C3AED']}
              tag="3 levels"
              onPress={() => navigation.getParent()?.navigate('MazeLevels')}
            />
          </>
        )}

        <Text style={styles.sectionTitle}>{isTeacher ? "Today's insights" : 'For you'}</Text>
        {insights.map((item) => (
          <InsightCard key={item.title} {...item} />
        ))}

        {board.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Class standings</Text>
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    ...SHADOWS.medium,
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
  heroName: { color: COLORS.white, fontSize: 26, fontWeight: '800', marginTop: 4, letterSpacing: -0.4 },
  heroSub: { color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 19, marginTop: 6 },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: { color: COLORS.white, fontWeight: '800', fontSize: 18 },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2, fontWeight: '600' },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionCard: { flex: 1, alignItems: 'center', marginHorizontal: 4 },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    ...SHADOWS.small,
  },
  actionText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 14,
    marginBottom: 12,
  },
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
