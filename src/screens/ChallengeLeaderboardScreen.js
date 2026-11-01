import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, RefreshControl, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

function Avatar({ uri }) {
  const [failed, setFailed] = useState(false);
  return uri && !failed ? <Image source={{ uri }} style={styles.avatar} onError={() => setFailed(true)} /> :
    <Ionicons name="person-circle-outline" size={36} color={COLORS.textTertiary} style={styles.avatar} />;
}

export default function ChallengeLeaderboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const requestRef = useRef(0);
  const [state, setState] = useState({ ownerId: null, challenge: null, rows: [], loading: true, error: '' });
  const [refreshing, setRefreshing] = useState(false);
  const current = state.ownerId === user?.id;
  const challenge = current ? state.challenge : null;
  const rows = current ? state.rows : [];
  const loading = !current || state.loading;
  const error = current ? state.error : '';

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    const ownerId = user?.id;
    setState({ ownerId, challenge: null, rows: [], loading: true, error: '' });
    try {
      // Revalidate current assignment/status on focus and refresh; route metadata is not authority.
      const active = ownerId && user?.role === 'student' ? await api.getActiveChallenge() : null;
      const leaderboard = active ? (await api.getChallengeLeaderboard(active.id)).rows : [];
      if (request === requestRef.current) {
        setState({ ownerId, challenge: active, rows: leaderboard, loading: false, error: '' });
      }
    } catch (err) {
      if (request === requestRef.current) {
        setState({ ownerId, challenge: null, rows: [], loading: false, error: err.message || 'Could not load standings.' });
      }
    } finally {
      if (request === requestRef.current) setRefreshing(false);
    }
  }, [user?.id, user?.role]);

  useFocusEffect(useCallback(() => {
    load();
    return () => { requestRef.current += 1; };
  }, [load]));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScreenHeader title="Challenge" titleHighlight="Leaderboard" subtitle="Trusted XP from your games"
        right={<TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back" style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={styles.message} /> : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retry}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : !challenge ? (
          <View style={styles.card}><Text style={styles.title}>No active challenge</Text>
            <Text style={styles.description}>Your class's next challenge will appear here.</Text></View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>{challenge.title}</Text>
              {!!challenge.description && <Text style={styles.description}>{challenge.description}</Text>}
              <Text style={styles.badge}>{challenge.status}</Text>
              <Text style={styles.dates}>{new Date(challenge.starts_at).toLocaleDateString()} - {new Date(challenge.ends_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.card}>
              {rows.length === 0 ? <Text style={styles.description}>No standings yet. Pull down to refresh.</Text> : rows.map((row) => {
                const mine = row.user_id === user?.id;
                return (
                  <View key={row.user_id} style={[styles.row, mine && styles.own]}>
                    <View style={[styles.rank, Number(row.rank) === 1 && styles.gold, Number(row.rank) === 2 && styles.silver, Number(row.rank) === 3 && styles.bronze]}>
                      <Text style={styles.rankText}>{row.rank}</Text>
                    </View>
                    <Avatar key={row.user_id + (row.avatar_url || '')} uri={row.avatar_url} />
                    <Text style={styles.name} numberOfLines={2}>{row.display_name || 'Player'}{mine ? ' (You)' : ''}</Text>
                    <Text style={styles.xp}>{row.total_xp} XP</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  back: { padding: 10, backgroundColor: COLORS.white, borderRadius: 12 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 14, marginBottom: 16, ...SHADOWS.small },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  description: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  badge: { color: COLORS.primary, fontWeight: '700', textTransform: 'capitalize', marginTop: 12 },
  dates: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  own: { backgroundColor: COLORS.primaryFaded, borderRadius: 10 },
  rank: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.backgroundTertiary, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  rankText: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 12 },
  gold: { backgroundColor: COLORS.accent },
  silver: { backgroundColor: '#C7D0DC' },
  bronze: { backgroundColor: '#E0A878' },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  name: { flex: 1, color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  xp: { color: COLORS.primary, fontSize: 13, fontWeight: '800', marginLeft: 8 },
  message: { paddingVertical: 32 },
  error: { color: COLORS.error, fontSize: 14 },
  retry: { paddingVertical: 12 },
  retryText: { color: COLORS.primary, fontWeight: '700' },
});
