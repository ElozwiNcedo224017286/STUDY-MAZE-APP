import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import FeatureCard from '../components/FeatureCard';
import InsightCard from '../components/InsightCard';
import { COLORS } from '../theme/colors';
import { api } from '../api/client';

const GAMES = [
  {
    key: 'MazeLevels',
    title: 'Maze Runner',
    description: 'Dodge ghosts, collect tokens, and answer quiz nodes across 3 levels.',
    icon: 'map-outline',
    colors: ['#6D28D9', '#7C3AED'],
    tag: 'Adventure',
  },
  {
    key: 'QuizRush',
    title: 'Quiz Rush',
    description: 'Beat the clock on rapid-fire questions. Three lives. One streak.',
    icon: 'flash-outline',
    colors: ['#7C3AED', '#A78BFA'],
    tag: 'Speed',
  },
  {
    key: 'MemoryFlip',
    title: 'Memory Flip',
    description: 'Match subject pairs before the 60-second timer runs out.',
    icon: 'grid-outline',
    colors: ['#5B21B6', '#8B5CF6'],
    tag: 'Focus',
  },
];

export default function PlayScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [quizMeta, setQuizMeta] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { meta } = await api.getQuizBank();
      setQuizMeta(meta);
    } catch { /* ignore */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />
      <ScreenHeader
        title="Play"
        titleHighlight="Zone"
        subtitle="Three games. One quiz bank. Earn coins as you learn."
      />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[COLORS.primary]} />
        }
      >
        {quizMeta ? (
          <InsightCard
            title={`Playing: ${quizMeta.topic}`}
            description="This is the live question set from your teacher."
            icon="sparkles"
            color={COLORS.primary}
          />
        ) : (
          <InsightCard
            title="Built-in questions ready"
            description="When your teacher publishes a quiz, every game here will use it."
            icon="information-circle"
            color={COLORS.info}
          />
        )}

        <Text style={styles.eyebrow}>GAMES</Text>
        <Text style={styles.sectionTitle}>Choose how you want to learn</Text>
        {GAMES.map((game) => (
          <FeatureCard
            key={game.key}
            {...game}
            onPress={() => navigation.getParent()?.navigate(game.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: COLORS.primary, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: COLORS.textPrimary, marginTop: 4, marginBottom: 14 },
});
