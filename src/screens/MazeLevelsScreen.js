import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import useTrustedCoinBalance from '../hooks/useTrustedCoinBalance';
import { LEVELS } from './mazeData';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { useSubject } from '../context/SubjectContext';
import SubjectPrompt from '../components/SubjectPrompt';
import useStudentStudyNotes from '../hooks/useStudentStudyNotes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_IMAGE_SIZE = Math.min(SCREEN_WIDTH * 0.62, 230);

// Each accepted level win awards 100 trusted coins.
function levelReward() {
  return 100;
}

function getMazeQuestions(notes, subject) {
  const items = [];
  notes.forEach((note) => {
    const concepts = Array.isArray(note.key_concepts) ? note.key_concepts : [];
    const examples = Array.isArray(note.examples) ? note.examples : [];
    concepts.forEach((item) => {
      if (typeof item?.concept === 'string' && typeof item?.explanation === 'string') {
        items.push({ label: item.concept.trim(), explanation: item.explanation.trim() });
      }
    });
    examples.forEach((item) => {
      if (typeof item?.title === 'string' && typeof item?.explanation === 'string') {
        items.push({ label: item.title.trim(), explanation: item.explanation.trim() });
      }
    });
  });

  const uniqueItems = items.filter((item, index) => item.label && item.explanation &&
    items.findIndex((candidate) =>
      candidate.label.toLowerCase() === item.label.toLowerCase() &&
      candidate.explanation.toLowerCase() === item.explanation.toLowerCase()) === index);

  return uniqueItems.flatMap((item) => {
    const distractors = uniqueItems
      .filter((candidate) => candidate !== item)
      .map((candidate) => candidate.explanation)
      .filter((explanation, index, all) =>
        explanation.toLowerCase() !== item.explanation.toLowerCase() &&
        all.findIndex((candidate) => candidate.toLowerCase() === explanation.toLowerCase()) === index)
      .slice(0, 3);
    if (distractors.length === 0) return [];
    const options = [item.explanation, ...distractors];
    for (let index = options.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
    }
    return [{
      subject,
      q: `Which explanation best matches "${item.label}"?`,
      opts: options,
      correct: options.indexOf(item.explanation),
    }];
  });
}

export default function MazeLevelsScreen({ navigation }) {
  const { balanceLabel } = useTrustedCoinBalance();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const unlocked = user?.unlockedLevel || 1;
  const levelsCleared = Math.min(unlocked - 1, LEVELS.length);
  const totalReward = LEVELS.reduce((sum, lvl) => sum + levelReward(lvl), 0);
  const { activeSubject, status: subjectStatus } = useSubject();
  const { notes, loading: notesLoading, error: notesError, refresh: refreshNotes } = useStudentStudyNotes();
  const contextKey = subjectStatus === 'ready' && activeSubject ? `${user?.id}:${activeSubject.class_subject_id}` : null;
  const noteQuestions = useMemo(
    () => getMazeQuestions(notes, activeSubject?.subject_name || 'STUDY NOTES'),
    [notes, activeSubject?.subject_name],
  );
  const [sourceMode, setSourceMode] = useState('notes');
  const [modulesState, setModulesState] = useState({ key: null, rows: [], loading: false, error: '' });
  const [selectedModule, setSelectedModule] = useState('');
  const liveKey = useRef(contextKey);
  liveKey.current = contextKey;
  const moduleKey = selectedModule.trim().toLowerCase();
  const chapterKey = contextKey && moduleKey ? `${contextKey}:${moduleKey}` : null;
  const [chapterState, setChapterState] = useState({ key: null, rows: [], loading: false, error: '' });
  const [chapterChoice, setChapterChoice] = useState(null);
  const selectedChapter = chapterKey && chapterChoice?.contextKey === contextKey &&
    chapterChoice?.moduleKey === moduleKey ? chapterChoice : null;
  const current = chapterKey && chapterState.key === chapterKey;
  const chapters = current ? chapterState.rows : [];
  const loading = !!chapterKey && (!current || chapterState.loading);
  const error = current ? chapterState.error : '';
  const sourceReady = sourceMode === 'notes' ? noteQuestions.length >= 2 : !!selectedChapter;
  const currentModules = modulesState.key === contextKey ? modulesState.rows : [];
  const requestVersion = useRef(0);
  const moduleRequestVersion = useRef(0);

  const loadModules = useCallback(async () => {
    const version = ++moduleRequestVersion.current;
    if (!contextKey || !activeSubject?.class_subject_id) return;
    setModulesState({ key: contextKey, rows: [], loading: true, error: '' });
    try {
      const rows = await api.getSubjectModules(activeSubject.class_subject_id);
      if (version === moduleRequestVersion.current && liveKey.current === contextKey) {
        setModulesState({ key: contextKey, rows, loading: false, error: '' });
        setSelectedModule((previous) =>
          rows.find((row) => row.module_name.toLowerCase() === previous.toLowerCase())?.module_name ||
          rows[0]?.module_name || '');
      }
    } catch (failure) {
      if (version === moduleRequestVersion.current && liveKey.current === contextKey) {
        setModulesState({ key: contextKey, rows: [], loading: false, error: failure.message || 'Could not load your modules.' });
        setSelectedModule('');
      }
    }
  }, [contextKey, activeSubject?.class_subject_id]);

  const loadChapters = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!contextKey || !chapterKey || !activeSubject?.class_subject_id) return;
    setChapterState({ key: chapterKey, rows: [], loading: true, error: '' });
    try {
      const rows = await api.getSubjectChapters(activeSubject.class_subject_id, selectedModule);
      if (version === requestVersion.current && liveKey.current === contextKey) {
        setChapterState({ key: chapterKey, rows, loading: false, error: '' });
        setChapterChoice((previous) => previous?.contextKey === contextKey &&
          previous?.moduleKey === moduleKey && rows.some((row) => row.test_id === previous.test_id) ? previous : null);
      }
    } catch (failure) {
      if (version === requestVersion.current && liveKey.current === contextKey) {
        setChapterChoice(null);
        setChapterState({ key: chapterKey, rows: [], loading: false, error: failure.message || 'Could not load these chapters.' });
      }
    }
  }, [contextKey, chapterKey, activeSubject?.class_subject_id, selectedModule, moduleKey]);

  useFocusEffect(useCallback(() => {
    loadModules();
    return () => {
      requestVersion.current += 1;
      moduleRequestVersion.current += 1;
    };
  }, [loadModules]));

  useEffect(() => {
    if (sourceMode === 'teacher' && chapterKey) loadChapters();
  }, [sourceMode, chapterKey, loadChapters]);


  return (
    <ScrollView style={styles.flex} contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Maze Runner</Text>
      </View>

      <LinearGradient colors={COLORS.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Image source={require('../../assets/Artwork/maze-hero-portal.png')} style={styles.heroImage} resizeMode="contain" />
        <View style={styles.heroBadge}>
          <Ionicons name="trophy" size={16} color={COLORS.accent} />
          <Text style={styles.heroBadgeText}>{levelsCleared} of {LEVELS.length}{'\n'}levels completed</Text>
        </View>
        <View style={styles.heroCoinPill}>
          <Text style={styles.heroCoin}>🪙</Text>
          <Text style={styles.heroCoinText}>{balanceLabel}</Text>
        </View>
      </LinearGradient>

      {!contextKey ? <SubjectPrompt /> : selectedChapter && !loading ? (
        sourceMode === 'teacher' ? <View style={styles.selection}>
          <Text style={styles.name}>{activeSubject.subject_name}: {selectedChapter.chapter_title}</Text>
          <TouchableOpacity style={styles.playBtn} onPress={() => setChapterChoice(null)} accessibilityRole="button">
            <Text style={styles.playBtnText}>Change chapter</Text>
          </TouchableOpacity>
        </View> : null
      ) : null}

      {contextKey && (
        <View style={styles.selection}>
          <Text style={styles.title}>{activeSubject.subject_name}: Study source</Text>
          <View style={styles.sourceTabs}>
            <TouchableOpacity
              style={[styles.sourceTab, sourceMode === 'notes' && styles.sourceTabActive]}
              onPress={() => { setSourceMode('notes'); setChapterChoice(null); }}
            ><Text style={[styles.sourceTabText, sourceMode === 'notes' && styles.sourceTabTextActive]}>My Notes</Text></TouchableOpacity>
            <TouchableOpacity
              style={[styles.sourceTab, sourceMode === 'teacher' && styles.sourceTabActive]}
              onPress={() => { setSourceMode('teacher'); setChapterChoice(null); }}
            ><Text style={[styles.sourceTabText, sourceMode === 'teacher' && styles.sourceTabTextActive]}>Teacher Chapters</Text></TouchableOpacity>
          </View>
          {sourceMode === 'notes' ? (
            notesLoading ? <ActivityIndicator color={COLORS.primary} accessibilityLabel="Loading your notes" /> : notesError ? (
              <>
                <Text style={styles.selectionText} accessibilityRole="alert">{notesError}</Text>
                <TouchableOpacity style={styles.playBtn} onPress={refreshNotes} accessibilityRole="button">
                  <Text style={styles.playBtnText}>Retry notes</Text>
                </TouchableOpacity>
              </>
            ) : noteQuestions.length < 2 ? (
              <Text style={styles.selectionText}>
                Add at least two explained concepts or examples to your saved notes to play Maze from your notes.
              </Text>
            ) : (
              <Text style={styles.selectionText}>
                Maze questions will be made from {noteQuestions.length} explained concepts and examples in your saved notes.
              </Text>
            )
          ) : (
            <>
              <Text style={styles.selectionText}>Choose a module your teacher has published for this subject.</Text>
              {modulesState.key !== contextKey || modulesState.loading ? (
                <ActivityIndicator color={COLORS.primary} accessibilityLabel="Loading teacher modules" />
              ) : modulesState.error ? (
                <>
                  <Text style={styles.selectionText} accessibilityRole="alert">{modulesState.error}</Text>
                  <TouchableOpacity style={styles.playBtn} onPress={loadModules} accessibilityRole="button"><Text style={styles.playBtnText}>Retry modules</Text></TouchableOpacity>
                </>
              ) : currentModules.length === 0 ? (
                <Text style={styles.selectionText}>No teacher modules are available for this subject yet.</Text>
              ) : (
                <>
                  {currentModules.map((item) => (
                    <TouchableOpacity
                      key={item.module_name.toLowerCase()}
                      style={[styles.card, selectedModule.toLowerCase() === item.module_name.toLowerCase() && styles.cardCurrent]}
                      onPress={() => { setSelectedModule(item.module_name); setChapterChoice(null); }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedModule.toLowerCase() === item.module_name.toLowerCase() }}
                    >
                      <Text style={styles.name}>{item.module_name}</Text>
                    </TouchableOpacity>
                  ))}
                  {loading ? <ActivityIndicator color={COLORS.primary} accessibilityLabel={`Loading ${selectedModule} chapters`} /> : error ? (
                    <>
                      <Text style={styles.selectionText} accessibilityRole="alert">{error}</Text>
                      <TouchableOpacity style={styles.playBtn} onPress={loadChapters} accessibilityRole="button"><Text style={styles.playBtnText}>Retry chapters</Text></TouchableOpacity>
                    </>
                  ) : chapters.length === 0 ? (
                    <Text style={styles.selectionText}>No published chapters for this module yet.</Text>
                  ) : chapters.map((chapter) => (
                    <TouchableOpacity
                      key={chapter.test_id}
                      style={styles.card}
                      onPress={() => setChapterChoice({ ...chapter, contextKey, moduleKey })}
                      accessibilityRole="button"
                    >
                      <View style={styles.selectionCopy}>
                        <Text style={styles.name}>{chapter.chapter_title}</Text>
                        <Text style={styles.selectionText}>Teacher: {chapter.teacher_name || 'Teacher'}</Text>
                        <Text style={styles.selectionText}>{chapter.question_count} question{chapter.question_count === 1 ? '' : 's'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      )}

      {sourceReady && (sourceMode === 'notes' || !loading) && LEVELS.map((lvl, i) => {
        const locked = lvl.id > unlocked;
        const cleared = lvl.id < unlocked;
        const current = lvl.id === unlocked;
        const reward = levelReward(lvl);

        return (
          <View key={lvl.id} style={[styles.card, current && styles.cardCurrent]}>
            <View style={styles.nodeWrap}>
              {locked ? (
                <Image
                  source={lvl.id === 3
                    ? require('../../assets/Artwork/maze-node-locked-3.png')
                    : require('../../assets/Artwork/maze-node-locked.png')}
                  style={styles.nodeImage}
                  resizeMode="contain"
                />
              ) : lvl.id === 1 ? (
                <Image source={require('../../assets/Artwork/maze-node-unlocked.png')} style={styles.nodeImage} resizeMode="contain" />
              ) : (
                <View style={[styles.nodeCircle, cleared && styles.nodeCircleCleared]}>
                  <Ionicons name={cleared ? 'checkmark' : 'key'} size={20} color={COLORS.white} />
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{lvl.name}</Text>
              <Text style={styles.desc}>{lvl.desc}</Text>
              <View style={styles.rewardPill}>
                <Text style={styles.rewardCoin}>🪙</Text>
                <Text style={styles.rewardText}>+{reward}</Text>
              </View>
            </View>

            {locked ? (
              <View style={styles.lockedBtn}>
                <Ionicons name="lock-closed" size={14} color={COLORS.textTertiary} />
                <Text style={styles.lockedBtnText}>Complete{'\n'}Level {lvl.id - 1}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.playBtn} onPress={() => navigation.navigate('MazeGame', {
                levelIndex: i,
                classSubjectId: activeSubject.class_subject_id,
                sourceKind: sourceMode === 'notes' ? 'student_notes' : 'teacher_test',
                ...(sourceMode === 'notes'
                  ? { questionBank: noteQuestions, chapterTitle: `${activeSubject.subject_name} — My Notes` }
                  : { testId: selectedChapter.test_id, chapterTitle: selectedChapter.chapter_title }),
                subjectName: activeSubject.subject_name,
              })}>
                <Text style={styles.playBtnText}>Play</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {sourceReady && <View style={styles.rewardBanner}>
        <Image source={require('../../assets/Artwork/maze-reward-chest.png')} style={styles.rewardBannerImage} resizeMode="contain" />
        <Text style={styles.rewardBannerText}>Complete all levels to earn up to{'\n'}<Text style={styles.rewardBannerCoins}>+{totalReward} coins</Text></Text>
      </View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sourceTabs: { flexDirection: 'row', backgroundColor: COLORS.backgroundSecondary, padding: 4, borderRadius: 12, marginBottom: 12 },
  sourceTab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  sourceTabActive: { backgroundColor: COLORS.white, ...SHADOWS.small },
  sourceTabText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  sourceTabTextActive: { color: COLORS.primary, fontWeight: '800' },
  selection: { marginBottom: 18 },
  selectionCopy: { flex: 1 },
  selectionText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginVertical: 5 },
  flex: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  container: { padding: 20, paddingBottom: 40 },
  topnav: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  title: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 18 },

  hero: {
    borderRadius: 22,
    minHeight: HERO_IMAGE_SIZE * 0.88,
    marginBottom: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    ...SHADOWS.medium,
  },
  heroImage: {
    position: 'absolute',
    right: -16,
    bottom: -16,
    width: HERO_IMAGE_SIZE,
    height: HERO_IMAGE_SIZE,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(26,16,48,0.55)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 14,
    alignSelf: 'flex-start',
  },
  heroBadgeText: { color: COLORS.white, fontWeight: '700', fontSize: 12, lineHeight: 15 },
  heroCoinPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26,16,48,0.55)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroCoin: { fontSize: 13 },
  heroCoinText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  cardCurrent: { borderWidth: 2, borderColor: COLORS.primary },
  nodeWrap: { width: 52, height: 52, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  nodeImage: { width: 52, height: 52 },
  nodeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircleCleared: { backgroundColor: COLORS.success },
  name: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 15 },
  desc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3, marginBottom: 8 },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  rewardCoin: { fontSize: 11 },
  rewardText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  playBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16, marginLeft: 10 },
  playBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  lockedBtn: { alignItems: 'center', marginLeft: 10, width: 68 },
  lockedBtnText: { color: COLORS.textTertiary, fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2, lineHeight: 13 },

  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inkDark,
    borderRadius: 18,
    padding: 14,
    marginTop: 6,
    gap: 12,
  },
  rewardBannerImage: { width: 56, height: 56 },
  rewardBannerText: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
  rewardBannerCoins: { color: COLORS.accent, fontWeight: '800', fontSize: 14 },
});
