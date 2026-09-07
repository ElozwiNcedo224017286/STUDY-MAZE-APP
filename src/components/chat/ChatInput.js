import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  Image,
  ScrollView,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../../theme/colors';
import { STUDY_MATERIAL_TYPES, mimeFromFileName } from '../../constants/studyFiles';

function VoiceRecorder(props) {
  const AudioRecorder = require('./AudioRecorder').default;
  return <AudioRecorder {...props} />;
}

export default function ChatInput({ onSend, disabled, placeholder = 'Ask Maze Mentor…' }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [recording, setRecording] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [document, setDocument] = useState(null);
  const [showMedia, setShowMedia] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  function buildPayload() {
    const payload = { text: text.trim() };
    if (audioUri && images.length) return { type: 'multimodal', ...payload, audioUri, images };
    if (audioUri) return { type: 'audio', ...payload, audioUri };
    if (images.length) return { type: 'image', ...payload, images };
    if (document) {
      return {
        type: 'document',
        ...payload,
        documentUri: document.uri,
        documentName: document.name,
        documentMimeType: document.mimeType,
      };
    }
    return { type: 'text', ...payload };
  }

  function reset() {
    setText('');
    setImages([]);
    setAudioUri(null);
    setDocument(null);
    setShowMedia(false);
    Animated.spring(rotate, { toValue: 0, useNativeDriver: true, tension: 50, friction: 5 }).start();
    Keyboard.dismiss();
  }

  async function send() {
    if (disabled || (!text.trim() && !images.length && !audioUri && !document)) return;
    const payload = buildPayload();
    reset();
    await onSend(payload);
  }

  function closeMedia() {
    setShowMedia(false);
    Animated.spring(rotate, { toValue: 0, useNativeDriver: true, tension: 50, friction: 5 }).start();
  }

  function toggleMedia() {
    const next = showMedia ? 0 : 1;
    Animated.spring(rotate, { toValue: next, useNativeDriver: true, tension: 50, friction: 5 }).start();
    setShowMedia(!showMedia);
  }

  async function pickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages((current) => [...current, ...result.assets].slice(0, 4));
      closeMedia();
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to photograph a question.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setImages((current) => [...current, ...result.assets].slice(0, 4));
      closeMedia();
    }
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: STUDY_MATERIAL_TYPES,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const file = result.assets[0];
      setDocument({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType || mimeFromFileName(file.name),
      });
      closeMedia();
    }
  }

  function stopRecording(uri) {
    setRecording(false);
    if (!text.trim() && images.length === 0) {
      onSend({ type: 'audio', audioUri: uri, text: '' });
      return;
    }
    setAudioUri(uri);
  }

  const canSend = !disabled && (text.trim() || images.length || audioUri || document);
  const showMic = !recording && !text.trim() && !audioUri;

  return (
    <>
      {images.length > 0 && (
        <ScrollView horizontal style={styles.previewStrip} showsHorizontalScrollIndicator={false}>
          {images.map((image, index) => (
            <View key={`${image.uri}-${index}`} style={styles.previewItem}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <TouchableOpacity style={styles.remove} onPress={() => setImages(images.filter((_, i) => i !== index))}>
                <Ionicons name="close-circle" size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {audioUri && !recording ? (
        <View style={styles.attachStrip}>
          <Ionicons name="mic-circle" size={20} color={COLORS.primary} />
          <Text style={styles.attachText}>Voice note ready</Text>
          <TouchableOpacity onPress={() => setAudioUri(null)}>
            <Ionicons name="close-circle" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      ) : null}

      {document ? (
        <View style={styles.attachStrip}>
          <Ionicons name="document-text" size={18} color={COLORS.primary} />
          <Text style={styles.attachText} numberOfLines={1}>{document.name}</Text>
          <TouchableOpacity onPress={() => setDocument(null)}>
            <Ionicons name="close-circle" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      ) : null}

      {recording ? (
        <VoiceRecorder onStopRecording={stopRecording} onCancel={() => setRecording(false)} />
      ) : null}

      <View style={[styles.bar, { paddingBottom: (keyboardOpen ? 10 : insets.bottom + 8) }]}>
        <View style={styles.field}>
          {!recording ? (
            <Animated.View style={{ transform: [{ rotate: rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
              <TouchableOpacity style={styles.iconBtn} onPress={toggleMedia} disabled={disabled}>
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </Animated.View>
          ) : null}

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
            multiline
            maxLength={1200}
            editable={!disabled && !recording}
          />

          {canSend && !recording ? (
            <TouchableOpacity style={styles.send} onPress={send} disabled={!canSend}>
              <Ionicons name="send" size={16} color={COLORS.white} />
            </TouchableOpacity>
          ) : null}

          {showMic ? (
            <TouchableOpacity style={styles.iconBtn} onPress={() => setRecording(true)} disabled={disabled}>
              <Ionicons name="mic" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {showMedia ? (
          <View style={styles.mediaRow}>
            <TouchableOpacity style={styles.mediaItem} onPress={pickImages}>
              <View style={[styles.mediaIcon, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="image" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.mediaLabel}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaItem} onPress={takePhoto}>
              <View style={[styles.mediaIcon, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="camera" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.mediaLabel}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaItem} onPress={pickDocument}>
              <View style={[styles.mediaIcon, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="document-text" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.mediaLabel}>Document</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 48,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    marginBottom: 1,
    ...SHADOWS.small,
  },
  mediaRow: { flexDirection: 'row', gap: 18, paddingTop: 12, paddingBottom: 4, paddingLeft: 8 },
  mediaItem: { alignItems: 'center' },
  mediaIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mediaLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  previewStrip: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 96,
  },
  previewItem: { marginRight: 8, position: 'relative' },
  previewImage: { width: 72, height: 72, borderRadius: 10 },
  remove: { position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.white, borderRadius: 10 },
  attachStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryFaded,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  attachText: { flex: 1, color: COLORS.primary, fontWeight: '700', fontSize: 13 },
});
