import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, FlatList, KeyboardAvoidingView,
  Platform, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StackHeader from '../components/StackHeader';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';
import { useTheme } from '../context/ThemeContext';
import { aiApi, removeResponseAudio } from '../api/ai';
import { chatStorage } from '../services/chatStorage';

const PROMPTS = [
  'Help me practise explaining a topic for an oral presentation.',
  'Ask me a study question, then help me explain my answer clearly.',
  'Help me rehearse a short introduction to my favourite subject.',
];

export default function SpeakingPracticeScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [conversationId] = useState(() => `voice_${chatStorage.createId()}`);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const cachedAudio = useRef(new Set());
  const listRef = useRef(null);

  useEffect(() => {
    mounted.current = true;
    const audio = cachedAudio.current;
    return () => {
      mounted.current = false;
      audio.forEach((uri) => { void removeResponseAudio(uri); });
      audio.clear();
    };
  }, []);

  async function handleSend(payload) {
    // Ref guard also blocks taps before React has rendered the disabled controls.
    if (!mounted.current || inFlight.current) return;
    if (!payload?.text?.trim() && !payload?.audioUri) return;
    inFlight.current = true;
    setSending(true);
    setError('');
    setMessages((current) => [...current, {
      ...payload, id: chatStorage.createId(), sender: 'user', timestamp: new Date().toISOString(),
    }]);

    try {
      const result = await aiApi.sendChatMessage(payload, conversationId, {
        mode: 'tutor', sessionMode: 'speaking', responseAudio: true,
      });
      const audioUri = result.data?.response_audio_uri;
      if (!mounted.current) {
        if (audioUri) await removeResponseAudio(audioUri);
        return;
      }
      if (!result.success) throw new Error(result.message || 'Voice Lab is unavailable. Please try again.');
      if (audioUri) cachedAudio.current.add(audioUri);
      setMessages((current) => [...current, {
        id: chatStorage.createId(), sender: 'ai', timestamp: new Date().toISOString(),
        text: result.data.response, audioUri, autoPlay: Boolean(audioUri),
      }]);
    } catch (failure) {
      if (mounted.current) setError(failure.message || 'Could not reach Voice Lab. Please try again.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setSending(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      <StackHeader title="Voice Lab" subtitle="Conversational speaking practice" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              themeColors={colors}
              isFirstInGroup={index === 0 || messages[index - 1]?.sender !== item.sender}
            />
          )}
          ListHeaderComponent={
            <View style={[styles.intro, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="mic-outline" size={28} color={colors.primaryText} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>Practise out loud</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Record or type an answer and hear an AI reply. The transcript stays here to read.
                If speech is unavailable, you can keep practising with text. This conversation lasts while this screen is open.
              </Text>
              {messages.length === 0 && PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={[styles.prompt, { borderColor: colors.border }]}
                  disabled={sending}
                  onPress={() => handleSend({ type: 'text', text: prompt })}
                >
                  <Text style={[styles.promptText, { color: colors.primaryText }]}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          }
          ListFooterComponent={
            <>
              {sending && (
                <View style={styles.progress}>
                  <ActivityIndicator color={colors.primaryText} />
                  <Text style={{ color: colors.textSecondary }}>Preparing your reply...</Text>
                </View>
              )}
              {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.textPrimary }]}>{error}</Text> : null}
            </>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        <ChatInput
          onSend={handleSend}
          disabled={sending}
          allowMedia={false}
          themeColors={colors}
          placeholder="Type or tap the microphone..."
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, flexGrow: 1 },
  intro: { padding: 18, borderRadius: 18, borderWidth: 1, marginBottom: 18 },
  title: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  description: { fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 12 },
  prompt: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  promptText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  progress: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 14 },
  error: { fontSize: 14, lineHeight: 21, paddingVertical: 14 },
});
