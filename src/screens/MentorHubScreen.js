import React, { useCallback, useState } from 'react';
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

const TOOL = {
  title: 'Maze Mentor',
  description: 'Your AI study companion.',
  color: COLORS.primary,
  lightGradient: ['rgba(109, 40, 217, 0.16)', 'rgba(139, 92, 246, 0.05)'],
};

export default function MentorHubScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('start');
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
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <LinearGradient
        colors={TOOL.lightGradient}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonInner}>
              <Ionicons
                name="arrow-back"
                size={22}
                color={COLORS.textPrimary}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{TOOL.title}</Text>
            <Text style={styles.headerDescription}>
              {TOOL.description}
            </Text>
          </View>

          <Ionicons
            name="sparkles"
            size={32}
            color={TOOL.color}
          />
        </View>
      </LinearGradient>

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
            style={styles.optionCard}
            onPress={() =>
              openChat({
                mode: 'general',
                title: 'Open session',
              })
            }
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[
                'rgba(109,40,217,0.14)',
                'rgba(109,40,217,0.05)',
              ]}
              style={styles.optionGradient}
            >
              <View
                style={[
                  styles.optionIcon,
                  {
                    backgroundColor: 'rgba(109,40,217,0.16)',
                  },
                ]}
              >
                <Ionicons
                  name="chatbubbles"
                  size={30}
                  color={TOOL.color}
                />
              </View>

              <Text style={styles.optionTitle}>
                Start a chat
              </Text>

              <Text style={styles.optionText}>
                Ask questions, get help, and learn with your AI mentor.
              </Text>

              <View style={styles.startButton}>
                <Text style={styles.startButtonText}>
                  Start chatting
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#FFFFFF"
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  header: {
    paddingBottom: 16,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  backButton: {
    marginRight: 12,
  },

  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  headerDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontWeight: '600',
  },

  body: {
    padding: 20,
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(109,40,217,0.15)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },

  infoCopy: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },

  optionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.small,
  },

  optionGradient: {
    padding: 24,
    alignItems: 'center',
    minHeight: 240,
  },

  optionIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  optionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },

  optionText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    maxWidth: 280,
  },

  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: TOOL.color,
  },

  startButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
