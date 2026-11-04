import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StackHeader from '../StackHeader';
import StudyHero from '../learn/StudyHero';
import MemoryCard from './MemoryCard';
import { useTheme } from '../../context/ThemeContext';
import { TYPE, SPACE, RADIUS, PAGE_CONTENT } from '../../theme/layout';

export default function MemoryGameView({ navigation, phase, board, timeLeft, result, busy, error, onStart, onFlip, onReplay, onRetry, onRecover, canRecover }) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const gridWidth = Math.min(width - 40, 560, Math.max(260, height - 330));
  const size = Math.floor((gridWidth - 24) / 4);
  const pairs = board?.matched_pairs || 0;
  const checkingPair = (board?.cards || []).filter(card => card.face_up && !card.matched).length >= 2;
  const status = error ? <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text accessibilityRole="alert" style={{ ...TYPE.body, color: colors.textPrimary }}>{error}</Text><TouchableOpacity onPress={onRetry} disabled={busy} accessibilityRole="button" style={styles.retry}><Text style={{ ...TYPE.label, color: colors.primaryText }}>Retry request</Text></TouchableOpacity>{canRecover && <TouchableOpacity onPress={onRecover} disabled={busy} accessibilityRole="button"><Text style={{ ...TYPE.label, color: colors.primaryText }}>Recover board</Text></TouchableOpacity>}</View> : busy ? <View style={styles.busy}><ActivityIndicator color={colors.primaryText} /><Text style={{ ...TYPE.caption, color: colors.textSecondary }}>Updating your game…</Text></View> : null;
  const button = (title, onPress, secondary = false) => <TouchableOpacity onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={title} style={[styles.button, { backgroundColor: secondary ? colors.surface : colors.primary, borderColor: secondary ? colors.border : colors.primary, opacity: busy ? 0.6 : 1 }]}><Text style={{ ...TYPE.label, color: secondary ? colors.primaryText : '#FFFFFF' }}>{title}</Text></TouchableOpacity>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <StackHeader title="Memory Flip" subtitle={phase === 'playing' ? 'Find a pair. Build your focus.' : 'A little focus goes a long way.'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 28 }]} showsVerticalScrollIndicator={false}>
        {phase === 'start' ? <>
          <StudyHero eyebrow="FOCUS QUEST" title="Made for your memory" description="Find all eight pairs before the clock runs out." image={require('../../../assets/Artwork/game-memory-flip.png')} />
          <View style={styles.stats}>{[['copy-outline', '8 pairs'], ['timer-outline', '60 seconds'], ['sparkles-outline', '16 cards']].map(([icon, label]) => <View key={label} style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name={icon} size={22} color={colors.primaryText} /><Text style={[styles.statLabel, { color: colors.textPrimary }]}>{label}</Text></View>)}</View>
          <View style={[styles.instructions, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ ...TYPE.cardTitle, color: colors.textPrimary }}>One pair at a time</Text><Text style={{ ...TYPE.body, color: colors.textSecondary, marginTop: 8 }}>Flip two cards, remember what you see, and match the subjects. Finish faster to earn more coins.</Text></View>
          {status}{button(busy ? 'Getting your cards…' : 'Start memory quest', onStart)}
        </> : phase === 'result' && result ? <>
          <StudyHero eyebrow="QUEST COMPLETE" title={result.won ? 'All pairs found!' : 'Ready for a rematch?'} description={result.won ? `You finished in ${result.moves} moves. Nice focus!` : `You found ${result.matched || 0} of 8 pairs. Every try builds your memory.`} image={require('../../../assets/Artwork/badge-trophy.png')} />
          <View style={styles.stats}>{[[result.coins ?? 0, 'Coins earned'], [result.xp ?? 0, 'Challenge XP']].map(([value, label]) => <View key={label} style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ ...TYPE.pageTitle, color: colors.primaryText }}>{value}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text></View>)}</View>
          {button('Play again', onReplay)}{button('Back to games', () => navigation.navigate('Main', { screen: 'Play' }), true)}
        </> : <>
          <View style={styles.hud}>
            <View><Text style={{ ...TYPE.eyebrow, color: colors.textSecondary }}>PAIRS FOUND</Text><Text style={{ ...TYPE.sectionTitle, color: colors.textPrimary }}>{pairs} <Text style={{ color: colors.textTertiary }}>/ 8</Text></Text></View>
            <View style={[styles.timer, { backgroundColor: timeLeft <= 10 ? colors.errorLight : colors.primarySoft }]}><Ionicons name="timer-outline" size={19} color={timeLeft <= 10 ? colors.error : colors.primaryText} /><Text style={{ ...TYPE.cardTitle, color: timeLeft <= 10 ? colors.error : colors.primaryText }}>{timeLeft}s</Text></View>
          </View>
          <View style={[styles.track, { backgroundColor: colors.backgroundTertiary }]}><View style={{ width: `${pairs / 8 * 100}%`, backgroundColor: colors.success, height: '100%', borderRadius: 4 }} /></View>
          <Text style={{ ...TYPE.caption, color: colors.textSecondary, marginBottom: 14 }}>{board?.moves ?? 0} moves · Match all pairs to complete your quest</Text>
          <View style={[styles.grid, { width: gridWidth }]}>{(board?.cards || []).map((card, index) => <MemoryCard key={card.card_id} card={card} index={index} size={size} disabled={busy || !!error || checkingPair || card.matched || card.face_up} onPress={() => onFlip(card.card_id)} />)}</View>
          {status}
        </>}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  content: { ...PAGE_CONTENT, maxWidth: 640, paddingTop: SPACE.lg, flexGrow: 1 }, stats: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.section },
  stat: { flex: 1, borderWidth: 1, borderRadius: RADIUS.card, paddingVertical: SPACE.lg, paddingHorizontal: 4, alignItems: 'center', gap: SPACE.sm }, statLabel: { ...TYPE.caption, textAlign: 'center' },
  instructions: { borderWidth: 1, borderRadius: RADIUS.card, padding: SPACE.page, marginBottom: SPACE.lg },
  button: { minHeight: 48, borderWidth: 1, borderRadius: RADIUS.small, padding: SPACE.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACE.md },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md }, timer: { flexDirection: 'row', gap: 6, alignItems: 'center', padding: SPACE.md, borderRadius: RADIUS.small },
  track: { height: 7, borderRadius: 4, overflow: 'hidden', marginBottom: SPACE.sm }, grid: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center', gap: 8 },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: SPACE.lg }, notice: { borderWidth: 1, borderRadius: RADIUS.card, padding: SPACE.lg, marginTop: SPACE.lg }, retry: { minHeight: 44, justifyContent: 'center' },
});
