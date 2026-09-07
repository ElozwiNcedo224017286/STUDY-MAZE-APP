import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function AnalysisLoadingScreen({ visible, progress = 0, toolConfig, onCancel }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();
    Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  function stage() {
    if (progress < 20) return 'Reading the question…';
    if (progress < 40) return 'Identifying the topic…';
    if (progress < 60) return 'Working through the steps…';
    if (progress < 80) return 'Checking the answer…';
    if (progress < 95) return 'Writing a memory tip…';
    return 'Preparing your solution…';
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <LinearGradient colors={['rgba(26,16,48,0.88)', 'rgba(26,16,48,0.96)']} style={styles.gradientOverlay}>
          <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.contentCard}>
              <LinearGradient colors={[`${toolConfig.color}18`, `${toolConfig.color}08`]} style={styles.cardGradient}>
                <Animated.View
                  style={[styles.outerRing, { borderColor: toolConfig.color, transform: [{ rotate }] }]}
                />
                <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
                  <LinearGradient colors={toolConfig.gradient} style={styles.iconGradient}>
                    <Ionicons name="sparkles" size={40} color="white" />
                  </LinearGradient>
                </Animated.View>

                <Text style={styles.title}>Solving in progress</Text>
                <Text style={styles.stageText}>{stage()}</Text>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBackground}>
                    <LinearGradient
                      colors={[toolConfig.gradient[0], toolConfig.gradient[1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBarFill, { width: `${progress}%` }]}
                    />
                  </View>
                  <View style={styles.progressInfo}>
                    <Text style={styles.progressText}>{progress}%</Text>
                    <Text style={styles.progressSubtext}>Gemini</Text>
                  </View>
                </View>

                <View style={styles.infoContainer}>
                  {['Reading the photo', 'Teaching the method', 'Checking the final answer'].map((item) => (
                    <View key={item} style={styles.infoItem}>
                      <View style={[styles.infoDot, { backgroundColor: toolConfig.color }]} />
                      <Text style={styles.infoText}>{item}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
                  <View style={styles.cancelButtonInner}>
                    <Ionicons name="close-circle-outline" size={20} color="#F44336" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </View>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <View style={styles.tipContainer}>
              <Ionicons name="bulb-outline" size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.tipText}>This usually takes 10–20 seconds, depending on the photo.</Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  gradientOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  container: { width: '100%', maxWidth: 400, alignItems: 'center' },
  contentCard: { width: '100%', borderRadius: 24, overflow: 'hidden' },
  cardGradient: { padding: 32, alignItems: 'center', position: 'relative' },
  outerRing: {
    position: 'absolute',
    top: 32,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderStyle: 'dashed',
    opacity: 0.3,
  },
  iconContainer: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', marginBottom: 24 },
  iconGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: 'white', marginBottom: 8, textAlign: 'center' },
  stageText: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginBottom: 32, textAlign: 'center' },
  progressContainer: { width: '100%', marginBottom: 28 },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: { height: '100%', borderRadius: 6 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: 28, fontWeight: '700', color: 'white' },
  progressSubtext: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  infoContainer: { width: '100%', marginBottom: 24 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  infoText: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  cancelButton: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(244,67,54,0.3)',
    backgroundColor: 'rgba(244,67,54,0.1)',
  },
  cancelButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#F44336' },
  tipContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 8, paddingHorizontal: 16 },
  tipText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', flex: 1 },
});
