
import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { colors } from '../theme/colors';

import {
  SUBJECTS,
  DIFFICULTIES,
} from './mazeData';

export default function MazeResultScreen({
  route,
  navigation,
}) {
  const {
    outcome,
    coins = 0,
    score = 0,
    subject = 'science',
    difficulty = 'easy',
  } = route.params || {};

  const isWin =
    outcome === 'win';

  const subjectInfo =
    SUBJECTS.find(
      (item) => item.id === subject
    ) || SUBJECTS[0];

  const difficultyInfo =
    DIFFICULTIES.find(
      (item) => item.id === difficulty
    ) || DIFFICULTIES[0];

  const difficultyIndex =
    DIFFICULTIES.findIndex(
      (item) =>
        item.id === difficulty
    );

  const nextDifficulty =
    DIFFICULTIES[
      difficultyIndex + 1
    ];

  function playAgain() {
    navigation.replace(
      'MazeGame',
      {
        subject,
        difficulty,
      }
    );
  }

  function continueGame() {
    if (!nextDifficulty) {
      playAgain();
      return;
    }

    navigation.replace(
      'MazeGame',
      {
        subject,
        difficulty:
          nextDifficulty.id,
      }
    );
  }

  return (
    <View style={styles.flex}>

      <View style={styles.card}>

        <Text style={styles.icon}>
          {isWin ? '🏆' : '💀'}
        </Text>

        <Text
          style={[
            styles.title,
            !isWin &&
              styles.titleLose,
          ]}
        >
          {isWin
            ? 'MAZE COMPLETE'
            : 'GAME OVER'}
        </Text>


        <View style={styles.subjectBadge}>
          <Text style={styles.subjectBadgeText}>
            {subjectInfo.icon}{' '}
            {subjectInfo.name}
          </Text>
        </View>


        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyBadgeText}>
            {difficultyInfo.icon}{' '}
            {difficultyInfo.name}
          </Text>
        </View>


        <View style={styles.stats}>

          <View style={styles.stat}>
            <Text style={styles.statLabel}>
              SCORE
            </Text>

            <Text style={styles.statValue}>
              {score}
            </Text>
          </View>


          <View style={styles.stat}>
            <Text style={styles.statLabel}>
              COINS
            </Text>

            <Text style={styles.statValue}>
              🪙 {coins}
            </Text>
          </View>

        </View>


        <Text style={styles.sub}>
          {isWin
            ? `Excellent work! You completed the ${subjectInfo.name} ${difficultyInfo.name} maze.`
            : `The ghosts caught you. Your earned coins have been kept.`}
        </Text>


        {isWin ? (
          <>
            {nextDifficulty ? (
              <TouchableOpacity
                style={
                  styles.btnPrimary
                }
                onPress={
                  continueGame
                }
              >
                <Text
                  style={
                    styles.btnPrimaryText
                  }
                >
                  CONTINUE TO{' '}
                  {nextDifficulty.name.toUpperCase()}
                  {' →'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={
                  styles.btnPrimary
                }
                onPress={
                  playAgain
                }
              >
                <Text
                  style={
                    styles.btnPrimaryText
                  }
                >
                  PLAY AGAIN
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={
              styles.btnCoral
            }
            onPress={
              playAgain
            }
          >
            <Text
              style={
                styles.btnCoralText
              }
            >
              ↻ RETRY LEVEL
            </Text>
          </TouchableOpacity>
        )}


        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() =>
            navigation.replace(
              'MazeLevels'
            )
          }
        >
          <Text
            style={
              styles.btnSecondaryText
            }
          >
            CHANGE SUBJECT
          </Text>
        </TouchableOpacity>


        <TouchableOpacity
          style={styles.btnGhost}
          onPress={() =>
            navigation.navigate(
              'Hub'
            )
          }
        >
          <Text
            style={
              styles.btnGhostText
            }
          >
            BACK TO HUB
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: 20,
  },

  card: {
    backgroundColor:
      colors.panelLight,
    borderWidth: 2,
    borderColor:
      colors.wallEdge,
    borderRadius: 18,
    padding: 23,
  },

  icon: {
    fontSize: 45,
    textAlign: 'center',
    marginBottom: 7,
  },

  title: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
  },

  titleLose: {
    color: colors.coral,
  },

  subjectBadge: {
    alignSelf: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.wallEdge,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },

  subjectBadgeText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
  },

  difficultyBadge: {
    alignSelf: 'center',
    marginTop: 7,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.wallEdge,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  difficultyBadgeText: {
    color: colors.inkDim,
    fontSize: 10,
    fontWeight: '800',
  },

  stats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    marginBottom: 15,
  },

  stat: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: 'center',
  },

  statLabel: {
    color: colors.inkDim,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  statValue: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },

  sub: {
    color: colors.inkDim,
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 19,
  },

  btnPrimary: {
    backgroundColor: colors.mint,
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: 'center',
  },

  btnPrimaryText: {
    color: '#062B1F',
    fontWeight: '900',
    fontSize: 12.5,
  },

  btnCoral: {
    backgroundColor: colors.coral,
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: 'center',
  },

  btnCoralText: {
    color: '#3a0410',
    fontWeight: '900',
    fontSize: 13,
  },

  btnSecondary: {
    backgroundColor: colors.teal,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },

  btnSecondaryText: {
    color: '#062B1F',
    fontWeight: '900',
    fontSize: 12,
  },

  btnGhost: {
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  btnGhostText: {
    color: colors.inkDim,
    fontWeight: '800',
    fontSize: 12,
  },
});
