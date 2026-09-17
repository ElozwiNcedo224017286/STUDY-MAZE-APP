import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../../theme/colors';
import MarkdownText from '../chat/MarkdownText';

function difficultyColor(value) {
  const key = String(value || '').toLowerCase();
  if (key.includes('hard')) return COLORS.error;
  if (key.includes('easy')) return COLORS.success;
  return COLORS.warning;
}

export default function SolverResultScreen({
  visible,
  result,
  image,
  toolConfig,
  onClose,
  onNewAnalysis,
}) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && result) {
      fadeAnim.setValue(0);
      progressAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
      Animated.timing(progressAnim, {
        toValue: Number(result.confidence) || 0,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, result]);

  if (!result || !visible) return null;

  const confidence = Math.min(100, Math.max(0, Math.round(Number(result.confidence) || 0)));
  const steps = Array.isArray(result.steps) ? result.steps : [];
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />
        <LinearGradient
          colors={toolConfig.lightGradient}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.roundBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Solution</Text>
            <TouchableOpacity
              style={styles.roundBtn}
              onPress={() => {
                onClose();
                onNewAnalysis?.();
              }}
            >
              <Ionicons name="camera" size={20} color={toolConfig.color} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.scoreCard, { opacity: fadeAnim }]}>
            <LinearGradient colors={[`${toolConfig.color}18`, `${toolConfig.color}08`]} style={styles.scoreGradient}>
              <View style={[styles.scoreCircle, { borderColor: toolConfig.color }]}>
                <Text style={[styles.scoreNumber, { color: toolConfig.color }]}>{confidence}</Text>
                <Text style={styles.scoreLabel}>Confidence</Text>
              </View>
              <Text style={styles.scoreTitle}>{result.subject || 'Question solved'}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: `${difficultyColor(result.difficulty)}18` }]}>
                  <Text style={[styles.badgeText, { color: difficultyColor(result.difficulty) }]}>
                    {result.difficulty || 'Medium'}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: toolConfig.color }]} />
              </View>
            </LinearGradient>
          </Animated.View>

          {image ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="image" size={18} color={toolConfig.color} />
                <Text style={styles.sectionTitle}>Your photo</Text>
              </View>
              <View style={styles.card}>
                <Image source={{ uri: image }} style={styles.photo} resizeMode="cover" />
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="help-circle" size={18} color={toolConfig.color} />
              <Text style={styles.sectionTitle}>The question</Text>
            </View>
            <View style={styles.card}>
              <MarkdownText text={result.question} />
            </View>
          </View>

          {steps.length ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={18} color={toolConfig.color} />
                <Text style={styles.sectionTitle}>Taught steps</Text>
              </View>
              <View style={styles.card}>
                {steps.map((step, index) => (
                  <View key={`${index}-${step}`} style={styles.stepRow}>
                    <View style={[styles.stepNum, { backgroundColor: toolConfig.color }]}>
                      <Text style={styles.stepNumText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stepBody}>
                      <MarkdownText text={String(step)} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.sectionTitle}>Final answer</Text>
            </View>
            <LinearGradient colors={toolConfig.gradient} style={styles.answerCard}>
              <MarkdownText text={String(result.final_answer || '')} isUser />
            </LinearGradient>
          </View>

          {result.check ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="shield-checkmark" size={18} color={toolConfig.color} />
                <Text style={styles.sectionTitle}>Quick check</Text>
              </View>
              <View style={styles.card}>
                <MarkdownText text={String(result.check)} />
              </View>
            </View>
          ) : null}

          {result.tip ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb" size={18} color={COLORS.warning} />
                <Text style={styles.sectionTitle}>Memory tip</Text>
              </View>
              <View style={styles.card}>
                <MarkdownText text={String(result.tip)} />
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondary}
              onPress={() => {
                onClose();
                onNewAnalysis?.();
              }}
            >
              <Ionicons name="scan" size={18} color={toolConfig.color} />
              <Text style={[styles.secondaryText, { color: toolConfig.color }]}>New scan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primary} onPress={onClose}>
              <LinearGradient colors={toolConfig.gradient} style={styles.primaryGradient}>
                <Text style={styles.primaryText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  header: { paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  body: { padding: 20 },
  scoreCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 20, ...SHADOWS.small },
  scoreGradient: { padding: 22, alignItems: 'center' },
  scoreCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  scoreNumber: { fontSize: 36, fontWeight: '800' },
  scoreLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginTop: 2 },
  scoreTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  badgeRow: { flexDirection: 'row', marginTop: 10 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 16,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, ...SHADOWS.small },
  photo: { width: '100%', height: 180, borderRadius: 12 },
  question: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: COLORS.textPrimary },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { color: COLORS.white, fontWeight: '800', fontSize: 12 },
  stepBody: { flex: 1 },
  answerCard: { borderRadius: 16, padding: 18, ...SHADOWS.small },
  answerText: { color: COLORS.white, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  bodyText: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  secondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  secondaryText: { fontWeight: '800', fontSize: 14 },
  primary: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  primaryGradient: { paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
});
