import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme/colors';
import MarkdownText from './MarkdownText';
import AudioPlayer from './AudioPlayer';

export default function MessageBubble({ message, isFirstInGroup }) {
  const isUser = message.sender === 'user';
  const time = new Date(message.timestamp || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const images = message.images || (message.image ? [message.image] : []);

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.aiRow, isFirstInGroup && styles.groupGap]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={16} color={COLORS.primary} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {images.map((image, index) => (
          <Image
            key={`${image.uri || image}-${index}`}
            source={{ uri: image.uri || image }}
            style={styles.photo}
          />
        ))}
        {message.documentName ? (
          <View style={styles.docRow}>
            <Ionicons name="document-text" size={16} color={isUser ? COLORS.white : COLORS.primary} />
            <Text style={[styles.docName, isUser && styles.userMeta]} numberOfLines={1}>
              {message.documentName}
            </Text>
          </View>
        ) : null}
        {message.audioUri ? <AudioPlayer uri={message.audioUri} isUser={isUser} /> : null}
        {message.text ? <MarkdownText text={message.text} isUser={isUser} /> : null}
        {message.isError ? (
          <View style={styles.errorRow}>
            <Ionicons name="warning" size={13} color={COLORS.error} />
            <Text style={styles.errorText}>Could not send. Try again.</Text>
          </View>
        ) : null}
        <Text style={[styles.time, isUser ? styles.userMeta : styles.aiTime]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 8, maxWidth: '100%' },
  groupGap: { marginTop: 8 },
  userRow: { justifyContent: 'flex-end', paddingLeft: 48 },
  aiRow: { justifyContent: 'flex-start', paddingRight: 28 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  bubble: {
    maxWidth: '86%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 6,
    ...SHADOWS.small,
  },
  photo: { width: 188, height: 140, borderRadius: 12, marginBottom: 8 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  docName: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.primary },
  time: { fontSize: 11, marginTop: 6 },
  userMeta: { color: 'rgba(255,255,255,0.72)' },
  aiTime: { color: COLORS.textTertiary },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  errorText: { fontSize: 12, color: COLORS.error, fontWeight: '600' },
});
