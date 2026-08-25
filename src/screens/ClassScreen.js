import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { api } from '../api/client';

export default function ClassScreen() {
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { rows: data } = await api.getLeaderboard(50);
      setRows(data || []);
      setStatus('');
    } catch (e) {
      setStatus(e.message);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />
      <ScreenHeader
        title="Class"
        titleHighlight="Board"
        subtitle="Coins earned across every game — who is showing up to learn."
      />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            colors={[COLORS.primary]}
          />
        }
      >
        {!!status && <Text style={styles.status}>{status}</Text>}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
        ) : rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyText}>Once students play Maze, Quiz Rush, or Memory Flip, they will appear here.</Text>
          </View>
        ) : (
          rows.map((r, i) => (
            <View key={r.user_id} style={styles.row}>
              <View style={[styles.rank, i < 3 && styles.rankTop]}>
                <Text style={[styles.rankText, i < 3 && styles.rankTextTop]}>{i + 1}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{r.display_name || 'Player'}</Text>
                <Text style={styles.meta}>{r.games_played} game{r.games_played === 1 ? '' : 's'}</Text>
              </View>
              <Text style={styles.coins}>{r.total_coins} 🪙</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  status: { color: COLORS.error, marginBottom: 10, fontSize: 13 },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, ...SHADOWS.small },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  rank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankTop: { backgroundColor: COLORS.primarySoft },
  rankText: { fontWeight: '800', color: COLORS.textSecondary },
  rankTextTop: { color: COLORS.primary },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  coins: { fontWeight: '800', color: COLORS.primary, fontSize: 14 },
});
