import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { LEVELS } from './mazeData';

export default function MazeLevelsScreen({ navigation }) {
  const { user } = useAuth();
  const unlocked = user?.unlockedLevel || 1;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Maze Runner</Text>
      </View>

      {LEVELS.map((lvl, i) => {
        const locked = lvl.id > unlocked;
        return (
          <View key={lvl.id} style={[styles.card, locked && styles.cardLocked]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{locked ? '🔒 ' : '🗝️ '}{lvl.name}</Text>
              <Text style={styles.desc}>{lvl.desc}</Text>
            </View>
            <TouchableOpacity
              style={[styles.playBtn, locked && styles.playBtnDisabled]}
              disabled={locked}
              onPress={() => navigation.navigate('MazeGame', { levelIndex: i })}
            >
              <Text style={styles.playBtnText}>Play</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 18, paddingTop: 50 },
  topnav: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: colors.ink, fontSize: 18 },
  title: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardLocked: { opacity: 0.5 },
  name: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  desc: { color: colors.inkDim, fontSize: 11, marginTop: 3 },
  playBtn: { backgroundColor: colors.mint, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  playBtnDisabled: { backgroundColor: '#4a4560' },
  playBtnText: { color: '#062B1F', fontWeight: '700', fontSize: 12 }
});
