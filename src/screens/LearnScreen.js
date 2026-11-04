import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenHeader from '../components/ScreenHeader';
import LearnToolCard from '../components/learn/LearnToolCard';
import StudyActionRow from '../components/StudyActionRow';
import { STUDY_TOOLS } from '../constants/studyTools';
import { useTheme } from '../context/ThemeContext';
import { useSubject } from '../context/SubjectContext';
import { TYPE, SPACE, RADIUS, PAGE_CONTENT, studyToolWidth } from '../theme/layout';

export default function LearnScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const { activeSubject, status } = useSubject();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const cardWidth = studyToolWidth(width, fontScale);
  function open(screen, params) { (navigation.getParent() || navigation).navigate(screen, params); }

  useFocusEffect(useCallback(() => {
    if (route?.params?.openMentor) {
      navigation.setParams({ openMentor: undefined });
      (navigation.getParent() || navigation).navigate('MentorHub');
    }
  }, [route?.params?.openMentor, navigation]));

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScreenHeader title="Smart Learn" subtitle="The right tool for your next study session."
        right={
          <TouchableOpacity style={[styles.historyButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => open('MentorHub', { initialTab: 'history' })} accessibilityRole="button" accessibilityLabel="Open mentor chat history">
            <Ionicons name="time-outline" size={21} color={colors.primaryText} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SPACE.section }]} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={isDark ? ['#251C43', '#1B2135'] : ['#EDE5FC', '#F5F0FF']} style={styles.tipCard}>
          <View style={styles.tipHeading}>
            <View style={[styles.tipIcon, { backgroundColor: colors.surface }]}><Ionicons name="bulb-outline" size={19} color={colors.primaryText} /></View>
            <Text style={[styles.tipTitle, { color: colors.textPrimary }]}>A little practice goes a long way</Text>
          </View>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>Scan a question, work through it with your mentor, then explain it in your own words.</Text>
        </LinearGradient>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your study toolkit</Text>
        <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>Choose how you want to learn today.</Text>
        <View style={styles.grid}>
          {STUDY_TOOLS.map((tool, index) => <LearnToolCard key={tool.key} tool={tool} width={cardWidth} index={index} onPress={() => open(tool.route, tool.route === 'MentorHub' ? { initialTab: 'start' } : undefined)} />)}
        </View>
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your study materials</Text>
          <TouchableOpacity onPress={() => open('MySubjects')} accessibilityRole="button" accessibilityLabel="Choose your current subject">
            <Text style={[styles.subjectLink, { color: colors.primaryText }]}>{status === 'ready' && activeSubject ? activeSubject.subject_name : 'Choose subject'}</Text>
          </TouchableOpacity>
        </View>
        <StudyActionRow icon="school-outline" title="Teacher notes" description="Notes shared for your current subject." onPress={() => open('NotesWorkspace', { section: 'teacher-notes' })} />
        <StudyActionRow icon="cloud-upload-outline" title="Own notes" description="Turn your PDFs into clear, saved study notes." onPress={() => open('NotesWorkspace', { section: 'own-notes' })} />
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 }, body: { ...PAGE_CONTENT, paddingTop: SPACE.sm },
  historyButton: { width: 44, height: 44, borderRadius: RADIUS.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tipCard: { padding: SPACE.lg, borderRadius: RADIUS.card, marginBottom: SPACE.section },
  tipHeading: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md },
  tipIcon: { width: 36, height: 36, borderRadius: RADIUS.small, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { ...TYPE.cardTitle, flex: 1 }, tipText: { ...TYPE.body },
  sectionTitle: { ...TYPE.sectionTitle }, sectionDescription: { ...TYPE.body, marginTop: SPACE.xs, marginBottom: SPACE.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginBottom: SPACE.section },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, marginBottom: SPACE.lg },
  subjectLink: { ...TYPE.label, paddingVertical: SPACE.xs },
});
