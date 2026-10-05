import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatInput from '../components/chat/ChatInput';
import MessageBubble from '../components/chat/MessageBubble';
import { aiApi } from '../api/ai';
import { chatStorage } from '../services/chatStorage';
import { COLORS, SHADOWS } from '../theme/colors';

const PROMPTS = [
  'Listen to my answer and give me speaking feedback.',
  'Ask me one oral question to answer out loud.',
  'Help me make my explanation clearer.',
];

export default function SpeakingPracticeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [conversationId] = useState(() => `voice_${Date.now()}`);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const listRef = useRef(null);

  const scrollEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    scrollEnd();
  }, [messages.length, scrollEnd]);

  async function handleSend(payload) {
    const nextPayload = { ...payload };
    const userMessage = {
      id: chatStorage.createId(),
      ...nextPayload,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    const thread = [...messages, userMessage];
    setMessages(thread);
    scrollEnd();

    setTyping(true);
    const result = await aiApi.sendChatMessage(nextPayload, conversationId, {
      mode: 'tutor',
      sessionMode: 'speaking',
      responseAudio: true,
    });
    const responseAudioUri = result.success ? result.data.response_audio_uri : null;
    const aiMessage = {
      id: chatStorage.createId(),
      type: responseAudioUri ? 'audio' : 'text',
      audioUri: responseAudioUri,
      autoPlay: Boolean(responseAudioUri),
      text: responseAudioUri
        ? ''
        : result.message || 'Voice Lab could not create an audio reply. Please try again.',
      sender: 'ai',
      timestamp: new Date().toISOString(),
      isError: !responseAudioUri,
    };
    setMessages([...thread, aiMessage]);
    setTyping(false);
    scrollEnd();
  }

  function renderEmpty() {
    return (
      <View style={styles.empty}>
        <LinearGradient colors={COLORS.gradients.hero} style={styles.emptyIcon}>
          <Ionicons name="mic" size={30} color={COLORS.white} />
        </LinearGradient>
        <Text style={styles.emptyTitle}>Voice Lab</Text>
        <Text style={styles.emptyText}>
          Record an answer or upload an audio or video clip to get feedback on clarity, structure, and confidence.
        </Text>
        <View style={styles.chips}>
          {PROMPTS.map((prompt) => (
            <TouchableOpacity key={prompt} style={styles.chip} onPress={() => handleSend({ type: 'text', text: prompt })}>
              <Text style={styles.chipText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <LinearGradient colors={COLORS.gradients.hero} style={styles.logo}>
          <Ionicons name="mic" size={20} color={COLORS.white} />
        </LinearGradient>
        <View style={styles.brand}>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>Voice Lab</Text>
            <View style={styles.aiChip}>
              <Text style={styles.aiChipText}>AI</Text>
            </View>
          </View>
          <Text style={styles.session} numberOfLines={1}>Speaking practice</Text>
        </View>
        <View style={styles.statusPill}>
          <View style={[styles.dot, typing && styles.dotBusy]} />
          <Text style={[styles.status, typing && styles.statusBusy]}>{typing ? 'Listening' : 'Online'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              isFirstInGroup={index === 0 || messages[index - 1]?.sender !== item.sender}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            typing ? (
              <View style={styles.typing}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.typingText}>Voice Lab is listening...</Text>
              </View>
            ) : null
          }
        />
        <ChatInput
          onSend={handleSend}
          disabled={typing}
          placeholder="Record, upload, or type an answer..."
          allowMedia
          mediaOptions={['audio', 'video']}
          allowAudio
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    ...SHADOWS.small,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brand: { flex: 1, marginRight: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  aiChip: {
    marginLeft: 6,
    backgroundColor: COLORS.primaryVeryLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiChipText: { fontSize: 10, fontWeight: '900', color: COLORS.primary },
  session: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  dotBusy: { backgroundColor: COLORS.warning },
  status: { fontSize: 11, fontWeight: '800', color: COLORS.success },
  statusBusy: { color: COLORS.warning },
  list: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    ...SHADOWS.medium,
  },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 8 },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 18,
  },
  chips: { width: '100%', gap: 10 },
  chip: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  chipText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  typing: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 6,
    ...SHADOWS.small,
  },
  typingText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
});
