import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export default function AudioPlayer({ uri, isUser }) {
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);
  const progress = useRef(new Animated.Value(0)).current;

  const position = (status?.currentTime || 0) * 1000;
  const duration = (status?.duration || 0) * 1000;
  const isPlaying = Boolean(status?.playing);

  useEffect(() => {
    const ratio = duration ? position / duration : 0;
    progress.setValue(Math.min(1, Math.max(0, ratio)));
  }, [position, duration, progress]);

  function toggle() {
    if (!player) return;
    if (isPlaying) {
      player.pause();
      return;
    }
    if (duration && position >= duration - 80) {
      player.seekTo(0);
    }
    player.play();
  }

  function format(ms) {
    const total = Math.floor((ms || 0) / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity style={[styles.play, isUser && styles.playUser]} onPress={toggle}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={isUser ? COLORS.white : COLORS.primary} />
      </TouchableOpacity>
      <View style={styles.info}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              {
                width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: isUser ? 'rgba(255,255,255,0.85)' : COLORS.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.time, isUser && styles.timeUser]}>
          {format(position)} / {format(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minWidth: 180, paddingVertical: 4 },
  play: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  playUser: { backgroundColor: 'rgba(255,255,255,0.2)' },
  info: { flex: 1 },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(148,163,184,0.35)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  time: { fontSize: 11, color: COLORS.textTertiary, marginTop: 6 },
  timeUser: { color: 'rgba(255,255,255,0.72)' },
});
