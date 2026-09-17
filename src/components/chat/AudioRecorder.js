import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../theme/colors';

export default function AudioRecorder({ onStopRecording, onCancel }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [duration, setDuration] = useState(0);
  const waves = useRef([...Array(16)].map(() => new Animated.Value(0.3))).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let interval;
    let cancelled = false;

    (async () => {
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          onCancel();
          return;
        }
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await recorder.prepareToRecordAsync();
        if (cancelled) return;
        recorder.record();
        interval = setInterval(() => setDuration((value) => value + 1), 1000);
      } catch {
        onCancel();
      }
    })();

    waves.forEach((wave, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(wave, { toValue: 0.9, duration: 280 + index * 30, useNativeDriver: true }),
          Animated.timing(wave, { toValue: 0.3, duration: 280 + index * 30, useNativeDriver: true }),
        ])
      ).start();
    });
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  async function stop() {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        onCancel();
        return;
      }
      onStopRecording(uri);
    } catch {
      onCancel();
    }
  }

  const mins = Math.floor(duration / 60);
  const secs = String(duration % 60).padStart(2, '0');

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['rgba(109,40,217,0.12)', 'rgba(139,92,246,0.06)']} style={styles.card}>
        <View style={styles.waves}>
          {waves.map((wave, index) => (
            <Animated.View
              key={index}
              style={[styles.bar, { transform: [{ scaleY: wave }], backgroundColor: index % 2 ? COLORS.primaryDark : COLORS.primary }]}
            />
          ))}
        </View>
        <Text style={styles.label}>Recording…</Text>
        <Text style={styles.time}>{mins}:{secs}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.cancel} onPress={onCancel}>
            <Ionicons name="close" size={22} color={COLORS.error} />
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <TouchableOpacity style={styles.stop} onPress={stop}>
              <View style={styles.stopIcon} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 14,
  },
  card: { borderRadius: 16, padding: 16 },
  waves: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 36, gap: 3, marginBottom: 12 },
  bar: { width: 3, height: 18, borderRadius: 2 },
  label: { textAlign: 'center', fontWeight: '800', color: COLORS.primary, fontSize: 15 },
  time: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 4, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 36 },
  cancel: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stop: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: { width: 20, height: 20, borderRadius: 4, backgroundColor: COLORS.white },
});
