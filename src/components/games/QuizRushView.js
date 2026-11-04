import React from 'react';
import { View, Text, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StackHeader from '../StackHeader';
import SubjectPrompt from '../SubjectPrompt';
import StudyHero from '../learn/StudyHero';
import QuestAction from '../learn/QuestAction';
import { useTheme } from '../../context/ThemeContext';
import { TYPE, SPACE, RADIUS, PAGE_CONTENT } from '../../theme/layout';

export default function QuizRushView({ navigation, phase, contextReady, selectedChapter, selectedSubject, activeSubject, chapters, browseLoading, browseError, busy, error, result, lives, correct, question, timeLeft, answeredId, feedback, onSelectChapter, onRefresh, onStart, onChangeChapter, onReplay, onAnswer, onRetry }) {
  const { colors } = useTheme();
  const browse = phase === 'start' && !selectedChapter;
  const button = (label, action, secondary = false) => <TouchableOpacity onPress={action} disabled={busy} accessibilityRole="button" accessibilityLabel={label} style={[styles.button, { backgroundColor: secondary ? colors.surface : colors.primary, borderColor: secondary ? colors.border : colors.primary, opacity: busy ? 0.6 : 1 }]}><Text style={{ ...TYPE.label, color: secondary ? colors.primaryText : '#FFFFFF' }}>{label}</Text></TouchableOpacity>;
  const pct = Math.min(100, Math.max(0, timeLeft / 10 * 100));
  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <StackHeader title="Quiz Rush" subtitle={phase === 'playing' ? 'Think fast. Trust what you know.' : 'Make every question a small win.'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {phase === 'start' ? <>
          <StudyHero eyebrow="QUICK THINKING QUEST" title="Ready, set, know!" description="Ten correct answers. Three lives. Your next challenge starts here." image={require('../../../assets/Artwork/game-quiz-rush.png')} />
          {browse ? <>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Pick a chapter</Text>
            {!contextReady ? <SubjectPrompt /> : browseLoading ? <ActivityIndicator color={colors.primaryText} style={{ padding: 24 }} /> : browseError ? <View style={styles.notice}><Text accessibilityRole="alert" style={{ ...TYPE.body, color: colors.textPrimary }}>{browseError}</Text>{button('Retry chapters', onRefresh, true)}</View> : chapters.length === 0 ? <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="book-outline" size={30} color={colors.primaryText} /><Text style={[styles.heading, { color: colors.textPrimary, marginTop: 12 }]}>A new quest is on its way</Text><Text style={{ ...TYPE.body, color: colors.textSecondary }}>Your teacher's published chapters for {activeSubject?.subject_name || 'this subject'} will appear here.</Text></View> : chapters.map(chapter => <QuestAction key={chapter.test_id} icon="layers-outline" title={chapter.chapter_title} description={`${chapter.teacher_name || 'Your teacher'} · ${chapter.question_count} questions`} onPress={() => onSelectChapter(chapter)} />)}
          </> : <>
            <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ ...TYPE.eyebrow, color: colors.primaryText }}>{selectedSubject?.subject_name}</Text><Text style={[styles.heading, { color: colors.textPrimary, marginTop: 8 }]}>{selectedChapter.chapter_title}</Text>
              <View style={styles.rules}>{[['timer-outline', '10 seconds', 'Per question'], ['heart-outline', '3 lives', 'Keep your run going'], ['flag-outline', '10 correct', 'Complete the quest']].map(([icon, title, caption]) => <View key={title} style={styles.rule}><Ionicons name={icon} size={23} color={colors.primaryText} /><View><Text style={{ ...TYPE.cardTitle, color: colors.textPrimary }}>{title}</Text><Text style={{ ...TYPE.caption, color: colors.textSecondary }}>{caption}</Text></View></View>)}</View>
            </View>
            {!!error && <Text accessibilityRole="alert" style={{ ...TYPE.body, color: colors.error, marginTop: 12 }}>{error}</Text>}
            {button(busy ? 'Starting your quest…' : 'Start Quiz Rush', onStart)}{button('Change chapter', onChangeChapter, true)}
          </>}
        </> : phase === 'result' && result ? <>
          <StudyHero eyebrow="QUEST COMPLETE" title={result.won ? 'You beat the rush!' : 'Every try makes you stronger'} description={`${result.streak} correct answers. Take what you learned into the next round.`} image={require('../../../assets/Artwork/badge-trophy.png')} />
          <View style={styles.results}>{[[result.coins ?? 0, 'Coins earned'], [result.xp ?? 0, 'Challenge XP']].map(([value, label]) => <View key={label} style={[styles.result, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ ...TYPE.pageTitle, color: colors.primaryText }}>{value}</Text><Text style={{ ...TYPE.caption, color: colors.textSecondary }}>{label}</Text></View>)}</View>
          {button('Play again', onReplay)}{button('Choose another chapter', onChangeChapter, true)}{button('Back to games', () => navigation.navigate('Main', { screen: 'Play' }), true)}
        </> : <>
          <View style={styles.hud}><View style={styles.hearts}>{[0, 1, 2].map(index => <Ionicons key={index} name={index < lives ? 'heart' : 'heart-outline'} size={23} color={index < lives ? colors.error : colors.textTertiary} accessible={false} />)}</View><Text style={{ ...TYPE.label, color: colors.primaryText }}>{correct} / 10 correct</Text></View>
          <View style={styles.hud}><Text style={{ ...TYPE.caption, color: colors.textSecondary }}>{question?.subject}</Text><Text style={{ ...TYPE.cardTitle, color: timeLeft <= 3 ? colors.error : colors.primaryText }}>{Math.ceil(timeLeft)}s</Text></View>
          <View style={[styles.track, { backgroundColor: colors.backgroundTertiary }]}><View style={{ height: '100%', width: `${pct}%`, backgroundColor: pct < 35 ? colors.error : colors.primary, borderRadius: 4 }} /></View>
          {!!error && <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text accessibilityRole="alert" style={{ ...TYPE.body, color: colors.textPrimary }}>{error}</Text>{button('Retry submission', onRetry, true)}</View>}
          {busy && !feedback && <ActivityIndicator color={colors.primaryText} style={{ marginBottom: 12 }} />}
          {feedback && <View style={[styles.feedback, { backgroundColor: feedback === 'correct' ? colors.successLight : colors.warningLight }]}><Ionicons name={feedback === 'correct' ? 'checkmark-circle' : 'bulb-outline'} size={22} color={feedback === 'correct' ? colors.successText : colors.warningText} /><Text style={{ ...TYPE.label, color: colors.textPrimary }}>{feedback === 'correct' ? 'You got it! Keep going.' : feedback === 'timeout' ? 'Time is up. A fresh question is next.' : 'Keep learning. You have another chance.'}</Text></View>}
          {question && <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.question, { color: colors.textPrimary }]}>{question.prompt}</Text>
            {question.options.map((option, index) => {
              const correctChoice = answeredId === option.id && feedback === 'correct';
              const wrongChoice = answeredId === option.id && feedback === 'incorrect';
              return <Pressable key={option.id} disabled={busy || !!error || !!feedback} onPress={() => onAnswer(option.id)} accessibilityRole="button" accessibilityLabel={`${String.fromCharCode(65 + index)}. ${option.text}`} style={({ pressed }) => [styles.option, { backgroundColor: correctChoice ? colors.successLight : wrongChoice ? colors.errorLight : pressed ? colors.primarySoft : colors.backgroundSecondary, borderColor: correctChoice ? colors.success : wrongChoice ? colors.error : pressed ? colors.primaryText : colors.border, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
                <View style={[styles.letter, { backgroundColor: colors.surface }]}><Text style={{ ...TYPE.label, color: colors.primaryText }}>{String.fromCharCode(65 + index)}</Text></View><Text style={{ ...TYPE.body, color: colors.textPrimary, flex: 1 }}>{option.text}</Text>
              </Pressable>;
            })}
          </View>}
        </>}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  content: { ...PAGE_CONTENT, maxWidth: 720, paddingTop: SPACE.lg, paddingBottom: 32, flexGrow: 1 },
  heading: { ...TYPE.sectionTitle, marginBottom: SPACE.lg }, panel: { borderWidth: 1, borderRadius: RADIUS.hero, padding: SPACE.page, marginBottom: SPACE.lg },
  button: { borderWidth: 1, borderRadius: RADIUS.small, minHeight: 48, padding: SPACE.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACE.md }, notice: { marginBottom: SPACE.md },
  rules: { gap: SPACE.lg }, rule: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  results: { flexDirection: 'row', gap: SPACE.md, marginBottom: SPACE.md }, result: { flex: 1, padding: SPACE.lg, borderWidth: 1, borderRadius: RADIUS.card, alignItems: 'center', gap: SPACE.xs },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md }, hearts: { flexDirection: 'row', gap: 6 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: SPACE.lg },
  question: { ...TYPE.sectionTitle, marginBottom: SPACE.section }, option: { borderWidth: 1, borderRadius: 15, minHeight: 58, padding: SPACE.md, marginBottom: SPACE.md, flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  letter: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, feedback: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, padding: SPACE.md, borderRadius: RADIUS.small, marginBottom: SPACE.lg },
});
