import { TYPE, SPACE, RADIUS, PAGE_CONTENT } from '../theme/layout';
import React, {useCallback, useState, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StackHeader from '../components/StackHeader';
import { useSubject } from '../context/SubjectContext';
import { useTheme } from '../context/ThemeContext';

export default function MySubjectsScreen({ navigation }) {
  const { colors: designColors } = useTheme();
  const COLORS = designColors;
  const styles = useMemo(() => createStyles(designColors), [designColors]);

  const { subjects, activeSubject, status, error, setActiveSubject, refreshActiveSubject } = useSubject();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selecting, setSelecting] = useState(null);
  const [selectionError, setSelectionError] = useState('');
  useFocusEffect(useCallback(() => { refreshActiveSubject(); }, [refreshActiveSubject]));

  async function choose(id) {
    if (selecting || status !== 'ready') return;
    setSelecting(id);
    setSelectionError('');
    try { await setActiveSubject(id); }
    catch (failure) { setSelectionError(failure.message); }
    finally { setSelecting(null); }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <StackHeader title="My Subjects" subtitle="Choose your current study subject" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={status === 'loading'} onRefresh={refreshActiveSubject} tintColor={colors.primaryText} colors={[colors.primaryText]} />}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>Switch your current study subject here. Your school manages which subjects you are enrolled in.</Text>
        {!!(error || selectionError) && <View>
          <Text style={[styles.message, { color: colors.textSecondary }]} accessibilityRole="alert">{selectionError || error}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={refreshActiveSubject}><Text style={{ color: colors.primaryText }}>Retry subjects</Text></TouchableOpacity>
        </View>}
        {status === 'loading' ? <ActivityIndicator color={colors.primaryText} accessibilityLabel="Loading subjects" /> : subjects.length === 0 ? (
          <Text style={[styles.message, { color: colors.textSecondary }]}>{status === 'error' ? 'Your enrolled subjects could not be verified.' : 'No enrolled subjects yet.'}</Text>
        ) : subjects.map((subject) => {
          const current = subject.class_subject_id === activeSubject?.class_subject_id;
          return <View key={subject.class_subject_id} style={[styles.card, { backgroundColor: colors.surface, borderColor: current ? colors.primaryText : colors.border }]}>
            <View style={styles.titleRow}>
              <Ionicons name="book-outline" size={22} color={colors.primaryText} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>{subject.subject_name}</Text>
            </View>
            <Text style={[styles.detail, { color: colors.textSecondary }]}>Class: {subject.class_name}</Text>
            <Text style={[styles.detail, { color: colors.textSecondary }]}>Teacher: {subject.teacher_name || 'Teacher'}</Text>
            {current ? <Text style={[styles.detail, { color: colors.primaryText, fontWeight: '700' }]}>Current subject</Text> : (
              <TouchableOpacity accessibilityRole="button" disabled={!!selecting || status !== 'ready'} style={styles.retry} onPress={() => choose(subject.class_subject_id)}>
                <Text style={{ color: colors.primaryText }}>{selecting === subject.class_subject_id ? 'Saving...' : 'Set as current'}</Text>
              </TouchableOpacity>
            )}
          </View>;
        })}
        <Text style={[styles.note, { color: colors.textSecondary }]}>Need to change your enrollment? Ask your teacher or school administrator.</Text>
      </ScrollView>
    </View>
  );
}

const createStyles = COLORS => StyleSheet.create({
  screen: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    padding: 20,
    gap: 14
  },
  card: {
    padding: 18,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  title: {
    ...TYPE.cardTitle,
    flex: 1
  },
  detail: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  message: {
    fontSize: 15,
    lineHeight: 23
  },
  note: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8
  },
  retry: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700'
  }
});
