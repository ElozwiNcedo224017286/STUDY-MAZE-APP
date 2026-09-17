import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../theme/colors';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';
import { chatStorage } from '../services/chatStorage';
import { aiApi } from '../api/ai';

const GENERAL_PROMPTS = [
  'Explain this week’s weakest topic in simple steps.',
  'Quiz me with 3 short questions I can use in Quiz Rush.',
  'How should I revise before Maze Runner?',
];

const GUIDED_PROMPTS = [
  'Summarise the uploaded material in 5 bullets.',
  'Make 3 practice questions from this file.',
  'What should I memorise first?',
];

export default function TutorChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const mode = route.params?.mode || 'general';
  const setupFiles = route.params?.files || [];
  const initialTitle = route.params?.title || (mode === 'guided' ? 'Guided session' : 'Open session');
  const resumedId = route.params?.conversationId;
  const initialImage = route.params?.initialImage;
  const initialPrompt = route.params?.initialPrompt || 'Help me understand this.';

  const [conversationId] = useState(() => resumedId || `conv_${Date.now()}`);
  const [messages, setMessages] = useState([]);
  const [title, setTitle] = useState(initialTitle);
  const [typing, setTyping] = useState(false);
  const [setupUsed, setSetupUsed] = useState(false);
  const autoSent = useRef(false);
  const listRef = useRef(null);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!typing) {
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [typing, pulse]);

  const scrollEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    if (!resumedId) return;
    chatStorage.getMessages(resumedId).then((saved) => {
      if (saved.length) setMessages(saved);
    });
  }, [resumedId]);

  async function handleSend(payload) {
    const nextPayload = { ...payload };
    if (!setupUsed && setupFiles[0]) {
      nextPayload.documentUri = nextPayload.documentUri || setupFiles[0].uri;
      nextPayload.documentName = nextPayload.documentName || setupFiles[0].name;
      nextPayload.documentMimeType = nextPayload.documentMimeType || setupFiles[0].mimeType;
      if (nextPayload.type === 'text') nextPayload.type = 'document';
      setSetupUsed(true);
    }

    const userMessage = {
      id: chatStorage.createId(),
      ...nextPayload,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    const thread = [...messages, userMessage];
    setMessages(thread);
    await chatStorage.saveMessages(conversationId, thread);
    scrollEnd();

    setTyping(true);
    const result = await aiApi.sendChatMessage(nextPayload, conversationId, {
      mode: 'tutor',
      sessionMode: mode,
    });
    const aiMessage = {
      id: chatStorage.createId(),
      type: 'text',
      text: result.success
        ? result.data.response
        : result.message || 'Maze Mentor is unavailable. Start the Flask backend and try again.',
      sender: 'ai',
      timestamp: new Date().toISOString(),
      isError: !result.success,
    };
    const updated = [...thread, aiMessage];
    setMessages(updated);
    await chatStorage.saveMessages(conversationId, updated);
    const nextTitle = (result.success && result.data.conversation_title) || title;
    if (result.success && result.data.conversation_title) {
      setTitle(result.data.conversation_title);
    }
    const preview = nextPayload.text || (nextPayload.images?.length ? 'Photo question' : nextPayload.audioUri ? 'Voice note' : 'Session');
    await chatStorage.upsertConversation({
      id: conversationId,
      title: nextTitle,
      preview,
      mode,
      updatedAt: Date.now(),
    });
    setTyping(false);
    scrollEnd();
  }

  useEffect(() => {
    if (autoSent.current || resumedId) return;
    if (initialImage?.uri) {
      autoSent.current = true;
      handleSend({
        type: 'image',
        text: initialPrompt,
        images: [initialImage],
      });
      return;
    }
    if (mode === 'guided' && setupFiles[0]) {
      autoSent.current = true;
      handleSend({
        type: 'document',
        text: 'Help me study this material. Summarise the key ideas and ask one check question.',
        documentUri: setupFiles[0].uri,
        documentName: setupFiles[0].name,
        documentMimeType: setupFiles[0].mimeType,
      });
    }
  }, [initialImage, initialPrompt, resumedId, mode, setupFiles]);

  const prompts = mode === 'guided' ? GUIDED_PROMPTS : GENERAL_PROMPTS;

  function renderEmpty() {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="sparkles" size={28} color={COLORS.primary} />
        </View>
        <Text style={styles.emptyTitle}>
          {mode === 'guided' ? 'Material is ready' : 'Ask Maze Mentor'}
        </Text>
        <Text style={styles.emptyText}>
          {mode === 'guided'
            ? 'Your file is attached. Ask about it, or wait for Mentor to summarise the key ideas.'
            : 'Type or speak anytime. You can also attach extra study files from the chat bar.'}
        </Text>
        <View style={styles.chips}>
          {prompts.map((prompt) => (
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
        <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}>
          <LinearGradient colors={COLORS.gradients.hero} style={styles.logo}>
            <Ionicons name="sparkles" size={20} color={COLORS.white} />
          </LinearGradient>
        </Animated.View>
        <View style={styles.brand}>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>Maze Mentor</Text>
            <View style={styles.aiChip}>
              <Text style={styles.aiChipText}>AI</Text>
            </View>
          </View>
          <Text style={styles.session} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.statusPill}>
          <View style={[styles.dot, typing && styles.dotBusy]} />
          <Text style={[styles.status, typing && styles.statusBusy]}>{typing ? 'Thinking' : 'Online'}</Text>
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
                <Text style={styles.typingText}>Maze Mentor is thinking…</Text>
              </View>
            ) : null
          }
          onContentSizeChange={() => {
            if (messages.length) listRef.current?.scrollToEnd({ animated: false });
          }}
        />
        <ChatInput onSend={handleSend} disabled={typing} />
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
  logoWrap: { marginRight: 10 },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
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
  aiChipText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  session: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 5 },
  dotBusy: { backgroundColor: COLORS.warning },
  status: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  statusBusy: { color: COLORS.warning },
  list: { paddingHorizontal: 16, paddingVertical: 16, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 36, paddingHorizontal: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
    fontWeight: '600',
  },
  chips: { width: '100%', gap: 8 },
  chip: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  chipText: { color: COLORS.primary, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8 },
  typingText: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic' },
});
