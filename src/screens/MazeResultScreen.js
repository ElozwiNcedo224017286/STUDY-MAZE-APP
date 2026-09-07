import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SHADOWS } from '../theme/colors';
import { LEVELS } from './mazeData';

export default function MazeResultScreen({ route, navigation }) {
  const { outcome, coins, score, levelIndex } = route.params;
  const isWin = outcome === 'win';
  const isLast = levelIndex >= LEVELS.length - 1;

  return (
    <View style={styles.flex}>
      <View style={styles.card}>
        <Text style={styles.icon}>{isWin ? '🏆' : '💀'}</Text>
        <Text style={[styles.title, !isWin && styles.titleLose]}>{isWin ? 'Level complete!' : 'Game over'}</Text>
        <Text style={styles.sub}>
          {isWin
            ? `Total coins: ${coins} · Score: ${score}`
            : `The ghosts got you. Coins kept: ${coins}`}
        </Text>

        {isWin ? (
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.replace('MazeGame', { levelIndex: isLast ? 0 : levelIndex + 1 })}
          >
            <Text style={styles.btnPrimaryText}>{isLast ? 'Play again from Level 1' : 'Continue'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnRetry} onPress={() => navigation.replace('MazeGame', { levelIndex })}>
            <Text style={styles.btnRetryText}>Retry level</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('Main')}>
          <Text style={styles.btnGhostText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.backgroundSecondary, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 22, padding: 26, ...SHADOWS.medium },
  icon: { fontSize: 44, textAlign: 'center', marginBottom: 8 },
  title: { color: COLORS.textPrimary, fontWeight: '900', fontSize: 20, textAlign: 'center', marginBottom: 10 },
  titleLose: { color: COLORS.error },
  sub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  btnPrimary: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', ...SHADOWS.small },
  btnPrimaryText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  btnRetry: { backgroundColor: COLORS.error, borderRadius: 14, paddingVertical: 15, alignItems: 'center', ...SHADOWS.small },
  btnRetryText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  btnGhost: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  btnGhostText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
});
