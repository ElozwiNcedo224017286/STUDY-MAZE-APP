import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import StackHeader from '../components/StackHeader';
import StudyHero from '../components/learn/StudyHero';
import QuestAction from '../components/learn/QuestAction';
import FeatureTabBar from '../components/history/FeatureTabBar';
import FeatureHistoryTab from '../components/history/FeatureHistoryTab';
import { chatStorage } from '../services/chatStorage';
import { STUDY_MATERIAL_TYPES, mimeFromFileName } from '../constants/studyFiles';
import { useTheme } from '../context/ThemeContext';
import { TYPE, SPACE, PAGE_CONTENT, RADIUS } from '../theme/layout';

const STARTERS = [
  { title: 'Explain a topic', description: 'Break a tricky idea into simple steps.', icon: 'bulb-outline', prompt: 'Explain this topic in simple steps: ' },
  { title: 'Quiz me', description: 'See what you remember with a quick check.', icon: 'flash-outline', prompt: 'Ask me one question at a time about ' },
  { title: 'Build a study plan', description: 'Turn a big goal into small, doable steps.', icon: 'map-outline', prompt: 'Help me make a study plan for ' },
];

export default function MentorHubScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(route?.params?.initialTab === 'history' ? 'history' : 'start');
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(false);
  useEffect(() => { if (route?.params?.initialTab) setTab(route.params.initialTab === 'history' ? 'history' : 'start'); }, [route?.params?.initialTab]);
  const loadHistory = useCallback(async () => {
    const items = await chatStorage.listConversations();
    setHistory(items.map(item => ({ id: item.id, title: item.title || 'Study conversation', subtitle: item.preview || 'Pick up where you left off', timestamp: item.updatedAt, badge: item.mode === 'guided' ? 'From a file' : 'Chat', icon: 'chatbubbles-outline', conversation: item })));
  }, []);
  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));
  function openChat(params = {}) { navigation.navigate('TutorChat', { mode: 'general', title: 'New conversation', ...params }); }
  async function studyFile() {
    if (picking) return;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: STUDY_MATERIAL_TYPES, copyToCacheDirectory: true, multiple: false });
      const file = result.assets?.[0];
      if (!result.canceled && file?.uri) openChat({ mode: 'guided', title: file.name || 'Study from a file', files: [{ uri: file.uri, name: file.name, mimeType: file.mimeType || mimeFromFileName(file.name) }] });
    } catch { Alert.alert('Could not open your files', 'Please try choosing a study file again.'); }
    finally { setPicking(false); }
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <StackHeader title="Maze Mentor" subtitle="A little guidance. A big breakthrough." onBack={() => navigation.goBack()} />
      <FeatureTabBar active={tab} onChange={setTab} color={colors.primaryText} />
      {tab === 'history' ? <FeatureHistoryTab items={history} search={search} onSearch={setSearch} color={colors.primaryText} emptyTitle="Your next conversation starts here" emptyText="Chats you save will be ready to revisit." onPress={item => openChat({ conversationId: item.id, mode: item.conversation?.mode, title: item.title })} onDelete={async item => { await chatStorage.deleteConversation(item.id); loadHistory(); }} /> :
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SPACE.section }]} showsVerticalScrollIndicator={false}>
          <StudyHero eyebrow="UNDERSTAND & DISCOVER" title="Find your next aha!" description="Bring a question. Work it out together." image={require('../../assets/Artwork/profile-avatar.png')} />
          <TouchableOpacity style={[styles.start, { backgroundColor: colors.primary }]} onPress={() => openChat()} accessibilityRole="button" accessibilityLabel="Start a conversation"><Text style={styles.startText}>Start a conversation</Text></TouchableOpacity>
          <Text style={[styles.section, { color: colors.textPrimary }]}>Try a mini quest</Text>
          {STARTERS.map(item => <QuestAction key={item.title} title={item.title} description={item.description} icon={item.icon} onPress={() => openChat({ title: item.title, starterPrompt: item.prompt })} />)}
          <QuestAction icon="folder-open-outline" title="Study from a file" description="Ask your mentor about your own study material." onPress={studyFile} disabled={picking} />
        </ScrollView>}
    </View>
  );
}
const styles = StyleSheet.create({
  body: { ...PAGE_CONTENT, paddingTop: SPACE.lg },
  start: { minHeight: 48, borderRadius: RADIUS.small, alignItems: 'center', justifyContent: 'center', padding: SPACE.md, marginBottom: SPACE.section },
  startText: { ...TYPE.label, color: '#FFFFFF' }, section: { ...TYPE.sectionTitle, marginBottom: SPACE.lg },
});
