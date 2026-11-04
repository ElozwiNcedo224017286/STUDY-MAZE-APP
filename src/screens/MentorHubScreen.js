import StackHeader from '../components/StackHeader';
import { TYPE, SPACE, RADIUS, PAGE_CONTENT } from '../theme/layout';
import React, {useCallback, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FeatureTabBar from '../components/history/FeatureTabBar';
import FeatureHistoryTab from '../components/history/FeatureHistoryTab';
import { chatStorage } from '../services/chatStorage';
import { COLORS, SHADOWS } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

const TOOL = {
  title: 'Maze Mentor',
  description: 'Your AI study companion.',
  color: COLORS.primary,
  lightGradient: ['rgba(109, 40, 217, 0.16)', 'rgba(139, 92, 246, 0.05)'],
};

export default function MentorHubScreen({ navigation, route }) {
  const { colors: designColors, isDark: designDark } = useTheme();
  const COLORS = designColors;
  const styles = useMemo(() => createStyles(designColors), [designColors]);

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(route?.params?.initialTab === 'history' ? 'history' : 'start');
  useEffect(() => { if (route?.params?.initialTab) setTab(route.params.initialTab === 'history' ? 'history' : 'start'); }, [route?.params?.initialTab]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');

  const loadHistory = useCallback(async () => {
    const items = await chatStorage.listConversations();

    setHistory(
      items.map((item) => ({
        id: item.id,
        title: item.title || 'Open session',
        subtitle: item.preview || 'No messages yet',
        timestamp: item.updatedAt,
        badge: item.mode === 'guided' ? 'Notes' : 'Chat',
        icon: 'chatbubbles',
        conversation: item,
      }))
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  function openChat(params) {
    navigation.navigate('TutorChat', params);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar
        barStyle={designDark ? 'light-content' : 'dark-content'}
      />

      <StackHeader title={TOOL.title} subtitle={TOOL.description} onBack={() => navigation.goBack()} />

      <FeatureTabBar
        active={tab}
        onChange={setTab}
        color={TOOL.color}
      />

      {tab === 'history' ? (
        <FeatureHistoryTab
          items={history}
          search={search}
          onSearch={setSearch}
          color={TOOL.color}
          emptyTitle="No mentor history"
          emptyText="Start a chat and your past conversations will appear here."
          onPress={(item) =>
            openChat({
              conversationId: item.id,
              mode: item.conversation?.mode,
              title: item.title,
            })
          }
          onDelete={async (item) => {
            await chatStorage.deleteConversation(item.id);
            loadHistory();
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <Ionicons
              name="sparkles"
              size={20}
              color={TOOL.color}
            />

            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Meet Maze Mentor</Text>

              <Text style={styles.infoText}>
                Ask questions, get explanations, work through problems,
                or just chat when you need help with your studies.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Ready to learn?
          </Text>

          <TouchableOpacity
            style={[
              styles.optionCard,
              styles.optionRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() =>
              openChat({
                mode: 'general',
                title: 'Open session',
              })
            }
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Start chatting"
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="chatbubbles" size={24} color={colors.primaryText} />
            </View>

            <View style={styles.infoCopy}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Start a chat</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Ask questions, get help, and learn with your AI mentor.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.primaryText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, styles.optionRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('StudyNotes')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open Revision Notes"
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="document-text-outline" size={24} color={colors.primaryText} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Revision Notes</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Review teacher notes and revision topics, or save a PDF or Word pack.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primaryText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              styles.optionRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => navigation.navigate('SpeakingPractice')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open Voice Lab"
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="mic-outline" size={24} color={colors.primaryText} />
            </View>

            <View style={styles.infoCopy}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Voice Lab</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Practice explaining ideas out loud and hear AI responses.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.primaryText} />
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary
  },
  header: {
    paddingBottom: 16,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16
  },
  backButton: {
    marginRight: 12
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerText: {
    flex: 1
  },
  headerTitle: {
    ...TYPE.pageTitle,
    color: COLORS.textPrimary
  },
  headerDescription: {
    ...TYPE.body,
    color: COLORS.textSecondary,
    marginTop: 3
  },
  body: {
    ...PAGE_CONTENT,
    padding: 20
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(109,40,217,0.15)',
    padding: 14,
    marginBottom: 24,
    gap: 10,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  infoCopy: {
    flex: 1
  },
  infoTitle: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  infoText: {
    ...TYPE.body,
    color: COLORS.textSecondary
  },
  sectionTitle: {
    ...TYPE.sectionTitle,
    color: COLORS.textPrimary,
    marginBottom: 12
  },
  optionCard: {
    overflow: 'hidden',
    ...SHADOWS.small,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
