import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, RefreshControl, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
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
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementStatus, setAnnouncementStatus] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

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

  async function sendAnnouncement() {
    setAnnouncementStatus('');
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      setAnnouncementStatus('Add a title and message first.');
      return;
    }
    setSendingAnnouncement(true);
    try {
      await api.createAnnouncement({ title: announcementTitle, message: announcementMessage });
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementStatus('Announcement sent. Signed-in students can read it in Profile → Notifications.');
    } catch (error) {
      setAnnouncementStatus(error.message || 'Could not send the announcement.');
    } finally {
      setSendingAnnouncement(false);
    }
  }

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
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.announcementCard}>
          <Text style={styles.announcementTitle}>Send an announcement</Text>
          <Text style={styles.announcementHint}>This appears in the in-app notifications for signed-in users, including students.</Text>
          <TextInput
            style={styles.announcementInput}
            value={announcementTitle}
            onChangeText={setAnnouncementTitle}
            placeholder="Title, e.g. Friday test reminder"
            placeholderTextColor={COLORS.textTertiary}
            maxLength={120}
          />
          <TextInput
            style={[styles.announcementInput, styles.announcementMessage]}
            value={announcementMessage}
            onChangeText={setAnnouncementMessage}
            placeholder="Write your message to students..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />
          <TouchableOpacity style={[styles.sendButton, sendingAnnouncement && styles.sendButtonDisabled]} disabled={sendingAnnouncement} onPress={sendAnnouncement}>
            <Text style={styles.sendButtonText}>{sendingAnnouncement ? 'Sending...' : 'Send announcement'}</Text>
          </TouchableOpacity>
          {!!announcementStatus && <Text style={styles.announcementStatus}>{announcementStatus}</Text>}
        </View>

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
  announcementCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 18, ...SHADOWS.small },
  announcementTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
  announcementHint: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 5, marginBottom: 10 },
  announcementInput: { backgroundColor: COLORS.backgroundSecondary, borderColor: COLORS.borderLight, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, color: COLORS.textPrimary, fontSize: 14, marginTop: 8 },
  announcementMessage: { minHeight: 92, textAlignVertical: 'top' },
  sendButton: { backgroundColor: COLORS.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 11 },
  sendButtonDisabled: { opacity: 0.55 },
  sendButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
  announcementStatus: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 8, textAlign: 'center' },
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
