
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

import {
  SUBJECTS,
  DIFFICULTIES,
} from './mazeData';

export default function MazeLevelsScreen({ navigation }) {
  const { user } = useAuth();

  const [selectedSubject, setSelectedSubject] =
    useState(null);

  const unlockedLevel =
    user?.unlockedLevel || 1;

  function chooseSubject(subject) {
    setSelectedSubject(subject);
  }

  function chooseDifficulty(difficulty) {
    if (!selectedSubject) return;

    const difficultyIndex =
      DIFFICULTIES.findIndex(
        (item) => item.id === difficulty.id
      );

    // Difficulty unlocking.
    //
    // Easy = always available
    // Medium = level 2
    // Hard = level 3
    // Expert = level 4
    //
    const requiredLevel =
      difficultyIndex + 1;

    if (requiredLevel > unlockedLevel) {
      return;
    }

    navigation.navigate('MazeGame', {
      subject: selectedSubject.id,
      difficulty: difficulty.id,
    });
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
    >
      <View style={styles.topnav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (selectedSubject) {
              setSelectedSubject(null);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.backBtnText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>
            Study Maze
          </Text>

          <Text style={styles.subtitle}>
            {selectedSubject
              ? `${selectedSubject.icon} ${selectedSubject.name}`
              : 'Choose a subject'}
          </Text>
        </View>
      </View>

      {!selectedSubject ? (
        <>
          <Text style={styles.sectionTitle}>
            Choose a Subject
          </Text>

          <Text style={styles.sectionDescription}>
            Select what you want to study.
          </Text>

          {SUBJECTS.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              style={styles.subjectCard}
              onPress={() =>
                chooseSubject(subject)
              }
              activeOpacity={0.8}
            >
              <View style={styles.subjectIcon}>
                <Text style={styles.subjectIconText}>
                  {subject.icon}
                </Text>
              </View>

              <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>
                  {subject.name}
                </Text>

                <Text style={styles.subjectDescription}>
                  {subject.description}
                </Text>
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <View style={styles.selectedSubjectCard}>
            <Text style={styles.selectedIcon}>
              {selectedSubject.icon}
            </Text>

            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName}>
                {selectedSubject.name}
              </Text>

              <Text style={styles.selectedDescription}>
                {selectedSubject.description}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Choose Difficulty
          </Text>

          <Text style={styles.sectionDescription}>
            Higher difficulties create larger mazes,
            faster ghosts and harder questions.
          </Text>

          {Array.isArray(DIFFICULTIES) && DIFFICULTIES.map(
            (difficulty, index) => {
              const requiredLevel =
                index + 1;

              const locked =
                requiredLevel >
                unlockedLevel;

              return (
                <TouchableOpacity
                  key={difficulty.id}
                  style={[
                    styles.difficultyCard,
                    locked &&
                      styles.cardLocked,
                  ]}
                  disabled={locked}
                  onPress={() =>
                    chooseDifficulty(
                      difficulty
                    )
                  }
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.difficultyIcon,
                      locked &&
                        styles.difficultyIconLocked,
                    ]}
                  >
                    <Text style={styles.difficultyIconText}>
                      {locked
                        ? '🔒'
                        : difficulty.icon}
                    </Text>
                  </View>

                  <View style={styles.difficultyInfo}>
                    <Text style={styles.difficultyName}>
                      {difficulty.name}
                    </Text>

                    <Text style={styles.difficultyDescription}>
                      {locked
                        ? `Complete Level ${requiredLevel - 1} to unlock`
                        : difficulty.description}
                    </Text>
                  </View>

                  {!locked && (
                    <View style={styles.playButton}>
                      <Text style={styles.playButtonText}>
                        PLAY
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  container: {
    padding: 18,
    paddingTop: 50,
    paddingBottom: 40,
  },

  topnav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backBtnText: {
    color: colors.ink,
    fontSize: 22,
  },

  title: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 17,
  },

  subtitle: {
    color: colors.inkDim,
    fontSize: 11,
    marginTop: 2,
  },

  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 5,
  },

  sectionDescription: {
    color: colors.inkDim,
    fontSize: 11.5,
    lineHeight: 17,
    marginBottom: 15,
  },

  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
  },

  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.panelLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  subjectIconText: {
    fontSize: 25,
  },

  subjectInfo: {
    flex: 1,
  },

  subjectName: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 14,
  },

  subjectDescription: {
    color: colors.inkDim,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 3,
  },

  arrow: {
    color: colors.mint,
    fontSize: 27,
    fontWeight: '300',
    marginLeft: 8,
  },

  selectedSubjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panelLight,
    borderWidth: 2,
    borderColor: colors.mint,
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
  },

  selectedIcon: {
    fontSize: 34,
    marginRight: 13,
  },

  selectedName: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 16,
  },

  selectedDescription: {
    color: colors.inkDim,
    fontSize: 10.5,
    marginTop: 3,
    lineHeight: 15,
  },

  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 15,
    padding: 14,
    marginBottom: 10,
  },

  cardLocked: {
    opacity: 0.45,
  },

  difficultyIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: colors.panelLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  difficultyIconLocked: {
    backgroundColor: colors.panel,
  },

  difficultyIconText: {
    fontSize: 21,
  },

  difficultyInfo: {
    flex: 1,
  },

  difficultyName: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 14,
  },

  difficultyDescription: {
    color: colors.inkDim,
    fontSize: 10.5,
    marginTop: 3,
    lineHeight: 15,
  },

  playButton: {
    backgroundColor: colors.mint,
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  playButtonText: {
    color: '#062B1F',
    fontWeight: '900',
    fontSize: 10,
  },
});
