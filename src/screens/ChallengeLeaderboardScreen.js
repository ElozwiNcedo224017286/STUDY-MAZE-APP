import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, RefreshControl, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenHeader from '../components/ScreenHeader';
import StudyActionRow from '../components/StudyActionRow';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { TYPE, SPACE, RADIUS, PAGE_CONTENT } from '../theme/layout';

function Avatar({ uri, colors }) {
  const [failed, setFailed] = useState(false);
  return uri && !failed
    ? <Image source={{ uri }} style={avatarStyle} onError={() => setFailed(true)} />
    : <View style={[avatarStyle, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundTertiary }]}><Ionicons name="person-outline" size={19} color={colors.textSecondary} /></View>;
}
const avatarStyle = { width: 36, height: 36, borderRadius: 18 };
const dateLabel = (date) => new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export default function ChallengeLeaderboardScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isTab = route?.name === 'Challenges';
  const requestRef = useRef(0);
  const [state, setState] = useState({ ownerId: null, challenge: null, rows: [], loading: true, error: '' });
  const [refreshing, setRefreshing] = useState(false);
  const current = state.ownerId === user?.id;
  const challenge = current ? state.challenge : null;
  const rows = current ? state.rows : [];
  const loading = !current || state.loading;
  const error = current ? state.error : '';
  const ownRow = rows.find(row => row.user_id === user?.id);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    const ownerId = user?.id;
    setState({ ownerId, challenge: null, rows: [], loading: true, error: '' });
    try {
      const active = ownerId && user?.role === 'student' ? await api.getActiveChallenge() : null;
      const leaderboard = active ? (await api.getChallengeLeaderboard(active.id)).rows : [];
      if (request === requestRef.current) setState({ ownerId, challenge: active, rows: leaderboard, loading: false, error: '' });
    } catch (failure) {
      if (request === requestRef.current) setState({ ownerId, challenge: null, rows: [], loading: false, error: failure.message || 'Could not load standings.' });
    } finally {
      if (request === requestRef.current) setRefreshing(false);
    }
  }, [user?.id, user?.role]);

  useFocusEffect(useCallback(() => { load(); return () => { requestRef.current += 1; }; }, [load]));

  function open(screen) { (isTab ? navigation.getParent() || navigation : navigation).navigate(screen); }
  function play() { if (isTab) navigation.navigate('Play'); else navigation.navigate('Main', { screen: 'Play' }); }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScreenHeader title={isTab ? 'Class' : 'Leaderboard'} titleHighlight={isTab ? 'Challenges' : undefined} subtitle="A little friendly competition. A lot of progress." onBack={isTab ? undefined : () => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SPACE.section }]} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} tintColor={colors.primaryText} />}>
        <View style={styles.summary}>
          {[
            { icon: 'trophy-outline', value: ownRow ? `#${ownRow.rank}` : '—', label: 'Your rank' },
            { icon: 'flash-outline', value: ownRow ? Number(ownRow.total_xp).toLocaleString() : '—', label: 'Challenge XP' },
            { icon: 'flame-outline', value: user?.streakDays ?? 0, label: 'Day streak' },
          ].map(item => <View key={item.label} style={styles.stat}>
            <Ionicons name={item.icon} size={20} color={colors.primaryText} />
            <Text style={styles.statValue}>{item.value}</Text><Text style={styles.statLabel}>{item.label}</Text>
          </View>)}
        </View>

        {loading ? <View style={styles.message}><ActivityIndicator color={colors.primaryText} /><Text style={styles.description}>Loading your class challenge…</Text></View> : error ? (
          <View style={styles.card}><Ionicons name="cloud-offline-outline" size={30} color={colors.primaryText} /><Text style={styles.cardTitle}>Standings are unavailable</Text><Text style={styles.description} accessibilityRole="alert">{error}</Text><TouchableOpacity onPress={load} style={styles.primaryButton} accessibilityRole="button"><Text style={styles.primaryButtonText}>Try again</Text></TouchableOpacity></View>
        ) : !challenge ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Ionicons name="trophy-outline" size={32} color={colors.primaryText} /></View>
            <Text style={styles.sectionTitle}>Your next challenge is on its way</Text>
            <Text style={styles.emptyText}>When your class starts a challenge, the details and leaderboard will appear here. Keep practising in the meantime.</Text>
            <TouchableOpacity onPress={play} style={styles.primaryButton} accessibilityRole="button" accessibilityLabel="Explore games"><Text style={styles.primaryButtonText}>Explore games</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></TouchableOpacity>
          </View>
        ) : (
          <>
            <LinearGradient colors={isDark ? ['#33224D', '#20253B'] : ['#EDE5FC', '#F4F0FD']} style={styles.challengeCard}>
              <View style={styles.challengeMeta}><Text style={styles.eyebrow}>YOUR CLASS CHALLENGE</Text><View style={styles.statusBadge}><View style={styles.statusDot} /><Text style={styles.statusText}>{challenge.status.replace(/_/g, ' ')}</Text></View></View>
              <Text style={styles.sectionTitle}>{challenge.title}</Text>
              {!!challenge.description && <Text style={styles.description}>{challenge.description}</Text>}
              <View style={styles.dateRow}><Ionicons name="calendar-outline" size={16} color={colors.textSecondary} /><Text style={styles.dateText}>{dateLabel(challenge.starts_at)} – {dateLabel(challenge.ends_at)}</Text></View>
              <TouchableOpacity style={styles.primaryButton} onPress={play} accessibilityRole="button" accessibilityLabel="Play and earn XP"><Text style={styles.primaryButtonText}>Play and earn XP</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></TouchableOpacity>
            </LinearGradient>
            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Class leaderboard</Text><Text style={styles.caption}>{rows.length} {rows.length === 1 ? 'learner' : 'learners'}</Text></View>
            <View style={styles.leaderboard}>
              <View style={styles.tableHeader}><Text style={[styles.eyebrow, { flex: 1 }]}>LEARNER</Text><Text style={styles.eyebrow}>XP</Text></View>
              {rows.length === 0 ? <Text style={[styles.description, { padding: SPACE.lg }]}>No standings yet. Play a game to get things started.</Text> : rows.map((row, index) => {
                const mine = row.user_id === user?.id;
                return <View key={row.user_id} style={[styles.row, mine && styles.own, index === rows.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.rank, Number(row.rank) === 1 && styles.gold]}>{Number(row.rank) <= 3 ? <Ionicons name="medal-outline" size={19} color={colors.primaryText} /> : <Text style={styles.rankText}>{row.rank}</Text>}</View>
                  <Avatar key={row.user_id + (row.avatar_url || '')} uri={row.avatar_url} colors={colors} />
                  <View style={styles.nameCopy}><Text style={styles.name}>{row.display_name || 'Player'}{mine ? ' · You' : ''}</Text><Text style={styles.caption}>Rank {row.rank}</Text></View>
                  <Text style={styles.xp}>{Number(row.total_xp).toLocaleString()}</Text>
                </View>;
              })}
            </View>
            <Text style={styles.standingsNote}>Earn challenge XP in Maze Runner, Quiz Rush and Memory Flip. Pull down to refresh standings.</Text>
          </>
        )}
        <Text style={[styles.sectionTitle, { marginTop: SPACE.section, marginBottom: SPACE.lg }]}>Keep the momentum</Text>
        <StudyActionRow icon="flame-outline" title="Daily streak" description="Build a little study time into every day." onPress={() => open('Streak')} />
        <StudyActionRow icon="gift-outline" title="Rewards" description="See what your earned coins can unlock." onPress={() => open('Shop')} />
        <StudyActionRow icon="ribbon-outline" title="Achievements" description="Look back at your learning milestones." onPress={() => open('Achievements')} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary }, body: { ...PAGE_CONTENT, paddingTop: SPACE.sm },
  summary: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.section },
  stat: { flex: 1, paddingVertical: SPACE.lg, paddingHorizontal: SPACE.xs, backgroundColor: colors.surface, borderRadius: RADIUS.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: SPACE.xs },
  statValue: { ...TYPE.sectionTitle, color: colors.textPrimary }, statLabel: { ...TYPE.caption, color: colors.textSecondary, textAlign: 'center' },
  card: { borderRadius: RADIUS.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: SPACE.page },
  cardTitle: { ...TYPE.cardTitle, color: colors.textPrimary, marginTop: SPACE.md },
  description: { ...TYPE.body, color: colors.textSecondary, marginTop: SPACE.sm }, sectionTitle: { ...TYPE.sectionTitle, color: colors.textPrimary }, caption: { ...TYPE.caption, color: colors.textSecondary },
  message: { alignItems: 'center', padding: SPACE.xl }, emptyCard: { borderRadius: RADIUS.hero, padding: SPACE.section, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.lg }, emptyText: { ...TYPE.body, color: colors.textSecondary, textAlign: 'center', marginTop: SPACE.sm },
  primaryButton: { minHeight: 46, paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg, borderRadius: RADIUS.small, backgroundColor: colors.primary, marginTop: SPACE.lg, flexDirection: 'row', gap: SPACE.sm, alignItems: 'center', justifyContent: 'center' }, primaryButtonText: { ...TYPE.label, color: '#FFFFFF' },
  challengeCard: { padding: SPACE.page, borderRadius: RADIUS.hero, marginBottom: SPACE.section }, challengeMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, marginBottom: SPACE.md },
  eyebrow: { ...TYPE.eyebrow, color: colors.textSecondary }, statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderRadius: RADIUS.pill, paddingVertical: SPACE.xs, paddingHorizontal: SPACE.sm }, statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }, statusText: { ...TYPE.caption, color: colors.textPrimary, textTransform: 'capitalize' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md }, dateText: { ...TYPE.caption, color: colors.textSecondary },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.lg },
  leaderboard: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: RADIUS.card, overflow: 'hidden' }, tableHeader: { flexDirection: 'row', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', padding: SPACE.md, gap: SPACE.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight }, own: { backgroundColor: colors.primaryFaded }, rank: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' }, gold: { backgroundColor: colors.warningLight, borderRadius: 10 }, rankText: { ...TYPE.label, color: colors.textSecondary }, nameCopy: { flex: 1 }, name: { ...TYPE.label, color: colors.textPrimary }, xp: { ...TYPE.cardTitle, color: colors.primaryText, marginLeft: SPACE.xs }, standingsNote: { ...TYPE.caption, color: colors.textSecondary, marginTop: SPACE.md },
});
