import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const GAMES = [
  { key: 'MazeLevels', emoji: '🧩', name: 'Maze Runner', desc: 'Dodge ghosts, collect tokens, answer quiz nodes. 3 levels.' },
  { key: 'QuizRush', emoji: '⚡', name: 'Quiz Rush', desc: 'Beat the clock on rapid-fire questions. 3 lives.' },
  { key: 'MemoryFlip', emoji: '🧠', name: 'Memory Flip', desc: 'Match subject pairs before the 60s timer runs out.' }
];

export default function HubScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [quizMeta, setQuizMeta] = useState(null);

  const loadMeta = useCallback(async () => {
    try {
      const { meta } = await api.getQuizBank();
      setQuizMeta(meta);
    } catch (e) { /* backend may be offline in dev — fail quietly here */ }
  }, []);

  useFocusEffect(useCallback(() => { loadMeta(); }, [loadMeta]));

  async function handleLogout() {
    await logout();
    navigation.replace('Auth');
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Hey, <Text style={styles.username}>{user?.username}</Text></Text>
        <View style={styles.headerActions}>
          <View style={styles.coinPill}><Text style={styles.coinText}>🪙 {user?.coins ?? 0}</Text></View>
          <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}><Text style={styles.iconBtnText}>⏻</Text></TouchableOpacity>
        </View>
      </View>

      {quizMeta && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>📚 Custom quiz active: {quizMeta.topic} (by {quizMeta.teacher})</Text>
        </View>
      )}

      {user?.role === 'teacher' && (
        <TouchableOpacity style={styles.teacherBtn} onPress={() => navigation.navigate('TeacherDashboard')}>
          <Text style={styles.teacherBtnText}>🧑‍🏫 Teacher Dashboard</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Choose a Game</Text>
      {GAMES.map((g) => (
        <View key={g.key} style={styles.gameCard}>
          <Text style={styles.gameEmoji}>{g.emoji}</Text>
          <View style={styles.gameInfo}>
            <Text style={styles.gameName}>{g.name}</Text>
            <Text style={styles.gameDesc}>{g.desc}</Text>
          </View>
          <TouchableOpacity style={styles.playBtn} onPress={() => navigation.navigate(g.key)}>
            <Text style={styles.playBtnText}>Play</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Shop')}>
        <Text style={styles.shopBtnText}>Rewards Shop</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 18, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  welcome: { color: colors.inkDim, fontSize: 13 },
  username: { color: colors.gold, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  coinPill: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  coinText: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: colors.ink, fontSize: 14 },
  badge: { backgroundColor: 'rgba(6,255,165,0.1)', borderWidth: 2, borderColor: colors.mint, borderRadius: 10, padding: 10, marginBottom: 14 },
  badgeText: { color: colors.mint, fontSize: 12 },
  teacherBtn: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 16 },
  teacherBtnText: { color: '#062B1F', fontWeight: '800', fontSize: 14 },
  sectionTitle: { color: colors.gold, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  gameCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 14, padding: 14, marginBottom: 12 },
  gameEmoji: { fontSize: 28, width: 40, textAlign: 'center' },
  gameInfo: { flex: 1 },
  gameName: { color: colors.ink, fontWeight: '700', fontSize: 14.5 },
  gameDesc: { color: colors.inkDim, fontSize: 11.5, marginTop: 3, lineHeight: 15 },
  playBtn: { backgroundColor: colors.mint, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  playBtnText: { color: '#062B1F', fontWeight: '700', fontSize: 12 },
  shopBtn: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 6, marginBottom: 30 },
  shopBtnText: { color: '#062B1F', fontWeight: '800', fontSize: 14 }
});
