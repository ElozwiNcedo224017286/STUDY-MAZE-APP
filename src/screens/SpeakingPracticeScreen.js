import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StackHeader from '../components/StackHeader';
import { COLORS, SHADOWS } from '../theme/colors';

export default function SpeakingPracticeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <StackHeader
        title="Voice Lab"
        subtitle="Speaking practice"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.body}>
        <View style={styles.card}>
          <LinearGradient colors={COLORS.gradients.hero} style={styles.icon}>
            <Ionicons name="mic" size={28} color={COLORS.white} />
          </LinearGradient>
          <View style={styles.soon}>
            <Text style={styles.soonText}>Coming soon</Text>
          </View>
          <Text style={styles.title}>Practise out loud</Text>
          <Text style={styles.text}>
            Voice Lab will let you speak answers, get calm feedback, and rehearse for oral work — without leaving Smart Learn.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  body: { flex: 1, padding: 20, justifyContent: 'center' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  soon: {
    backgroundColor: COLORS.warningLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  soonText: { color: COLORS.warning, fontWeight: '800', fontSize: 11 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  text: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '600' },
});
