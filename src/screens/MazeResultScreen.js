import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { LEVELS } from './mazeData';

export default function MazeResultScreen({ route, navigation }) {
  const { outcome, coins, score, levelIndex } = route.params;
  const isWin = outcome === 'win';
  const isLast = levelIndex >= LEVELS.length - 1;

  return (
    <View style={styles.flex}>
      <View style={styles.card}>
        <Text style={styles.icon}>{isWin ? '🏆' : '💀'}</Text>
        <Text style={[styles.title, !isWin && styles.titleLose]}>{isWin ? 'LEVEL COMPLETE' : 'GAME OVER'}</Text>
        <Text style={styles.sub}>
          {isWin
            ? `Total coins: ${coins} · Score: ${score}`
            : `The ghosts got you. Coins kept: ${coins}`}
        </Text>

        {isWin ? (
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => navigation.replace('MazeGame', { levelIndex: isLast ? 0 : levelIndex + 1 })}
          >
            <Text style={styles.btnSecondaryText}>{isLast ? 'Play Again from Level 1 →' : 'Continue →'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnCoral} onPress={() => navigation.replace('MazeGame', { levelIndex })}>
            <Text style={styles.btnCoralText}>Retry Level</Text>
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
  flex: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.panelLight, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 16, padding: 24 },
  icon: { fontSize: 40, textAlign: 'center', marginBottom: 6 },
  title: { color: colors.gold, fontWeight: '900', fontSize: 17, textAlign: 'center', marginBottom: 10 },
  titleLose: { color: colors.coral },
  sub: { color: colors.inkDim, fontSize: 13.5, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  btnSecondary: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnSecondaryText: { color: '#062B1F', fontWeight: '800', fontSize: 14.5 },
  btnCoral: { backgroundColor: colors.coral, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnCoralText: { color: '#3a0410', fontWeight: '800', fontSize: 14.5 },
  btnGhost: { borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnGhostText: { color: colors.inkDim, fontWeight: '700', fontSize: 13.5 }
});
