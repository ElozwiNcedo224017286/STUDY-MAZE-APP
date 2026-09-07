import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export default function ImagePreviewScreen({
  visible,
  image,
  toolConfig,
  onConfirm,
  onRetake,
  onClose,
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.98)']} style={styles.backgroundGradient}>
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.headerButton} onPress={onClose} activeOpacity={0.8}>
              <View style={styles.headerButtonInner}>
                <Ionicons name="close" size={26} color="white" />
              </View>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Review question</Text>
              <Text style={styles.headerSubtitle}>Confirm before solving</Text>
            </View>
            <View style={{ width: 48 }} />
          </Animated.View>

          <Animated.View style={[styles.imageContainer, { transform: [{ scale: scaleAnim }], opacity: fadeAnim }]}>
            <View style={styles.imageCard}>
              <LinearGradient
                colors={[`${toolConfig.color}20`, `${toolConfig.color}10`]}
                style={styles.imageGradientBorder}
              >
                <Image source={{ uri: image }} style={styles.previewImage} resizeMode="contain" />
              </LinearGradient>
            </View>
            <View style={styles.qualityBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.qualityText}>Ready to solve</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.tipsCard, { opacity: fadeAnim }]}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={20} color="#FFD700" />
              <Text style={styles.tipsTitle}>Quick tips</Text>
            </View>
            {[
              'The full question should be readable',
              'Avoid glare and cut-off numbers',
              'If two questions appear, the clearest one is solved first',
            ].map((tip) => (
              <View key={tip} style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: toolConfig.color }]} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View style={[styles.actionButtons, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onRetake} activeOpacity={0.7}>
              <View style={styles.secondaryButtonInner}>
                <Ionicons name="camera-reverse" size={20} color="white" />
                <Text style={styles.secondaryButtonText}>Retake photo</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={onConfirm} activeOpacity={0.8}>
              <LinearGradient
                colors={toolConfig.gradient}
                style={styles.primaryButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="sparkles" size={20} color="white" />
                <Text style={styles.primaryButtonText}>{toolConfig.confirmLabel || 'Solve this'}</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backgroundGradient: { flex: 1, paddingTop: 50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: { width: 48, height: 48 },
  headerButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  imageCard: { width: '100%', maxWidth: 400, aspectRatio: 1, borderRadius: 24, overflow: 'hidden' },
  imageGradientBorder: { flex: 1, padding: 3 },
  previewImage: { flex: 1, backgroundColor: '#000', borderRadius: 21 },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
  },
  qualityText: { fontSize: 14, fontWeight: '700', color: COLORS.success },
  tipsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  tipsTitle: { fontSize: 16, fontWeight: '700', color: 'white' },
  tipItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3 },
  tipText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', flex: 1 },
  actionButtons: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  secondaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  primaryButton: { borderRadius: 16, overflow: 'hidden' },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: 'white' },
});
