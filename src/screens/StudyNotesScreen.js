import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StackHeader from '../components/StackHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { api } from '../api/client';

export default function StudyNotesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { materials: rows } = await api.getPublishedNotes();
      setMaterials(rows || []);
    } catch {
      setMaterials([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <StackHeader
        title="Revision Notes"
        subtitle="Teacher summaries for quick recap"
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            colors={[COLORS.primary]}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
        ) : materials.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptyText}>When your teacher posts a summary, it will appear here for revision between games.</Text>
          </View>
        ) : (
          materials.map((m) => (
            <View key={m.id} style={styles.noteCard}>
              {(m.subject || m.grade) ? (
                <Text style={styles.meta}>{[m.subject, m.grade && `Grade ${m.grade}`].filter(Boolean).join(' · ')}</Text>
              ) : null}
              <Text style={styles.title}>{m.title}</Text>
              <Text style={styles.bodyText}>{m.content}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    ...SHADOWS.small,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  noteCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  meta: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginBottom: 6 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  bodyText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
});
