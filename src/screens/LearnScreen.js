import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LearnToolCard from '../components/learn/LearnToolCard';
import { COLORS } from '../theme/colors';

const FEATURES = [
  {
    key: 'tutor',
    title: 'Maze Mentor',
    text: 'Free chat, or study from your notes and slides.',
    icon: 'sparkles',
    colors: ['#6D28D9', '#8B5CF6'],
    actionColor: '#6D28D9',
    actionText: 'Start chat',
    action: 'mentor',
  },
  {
    key: 'solver',
    title: 'Smart Solver',
    text: 'Scan a question and get taught steps back.',
    icon: 'scan',
    colors: ['#5B21B6', '#7C3AED'],
    actionColor: '#5B21B6',
    actionText: 'Scan now',
    route: 'SmartSolver',
  },
  {
    key: 'notes',
    title: 'Revision Notes',
    text: 'Teacher summaries, ready between games.',
    icon: 'document-text',
    colors: ['#4C1D95', '#6D28D9'],
    actionColor: '#4C1D95',
    actionText: 'Open notes',
    route: 'StudyNotes',
  },
  {
    key: 'speak',
    title: 'Voice Lab',
    text: 'Practise speaking answers out loud.',
    icon: 'mic',
    colors: ['#7C3AED', '#A78BFA'],
    actionColor: '#7C3AED',
    actionText: 'Coming soon',
    route: 'SpeakingPractice',
    soon: true,
  },
];

export default function LearnScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;

  const side = 20;
  const gap = 12;
  const cardWidth = (width - side * 2 - gap) / 2;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.96],
    extrapolate: 'clamp',
  });
  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.96],
    extrapolate: 'clamp',
  });

  useFocusEffect(
    useCallback(() => {
      if (route.params?.openMentor) {
        navigation.setParams({ openMentor: undefined });
        navigation.getParent()?.navigate('MentorHub');
      }
    }, [route.params?.openMentor, navigation])
  );

  function open(item) {
    if (item.soon) return;
    if (item.action === 'mentor') {
      navigation.getParent()?.navigate('MentorHub');
      return;
    }
    navigation.getParent()?.navigate(item.route);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <Animated.View style={[styles.headerBackground, { opacity: headerOpacity, transform: [{ scale: headerScale }] }]}>
        <LinearGradient
          colors={['rgba(109, 40, 217, 0.22)', 'rgba(139, 92, 246, 0.06)', 'transparent']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </Animated.View>

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Smart Learn</Text>
          <Text style={styles.headerSubtitle}>AI-powered study intelligence</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.85}
          onPress={() => navigation.getParent()?.navigate('MentorHub')}
        >
          <LinearGradient colors={COLORS.gradients.hero} style={styles.headerButtonGradient}>
            <Ionicons name="sparkles" size={20} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        <View style={styles.tipCard}>
          <LinearGradient
            colors={['rgba(109, 40, 217, 0.16)', 'rgba(139, 92, 246, 0.04)']}
            style={styles.tipGradient}
          >
            <View style={styles.tipHeader}>
              <View style={styles.tipIcon}>
                <Ionicons name="bulb" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.tipTitle}>Study tip</Text>
            </View>
            <Text style={styles.tipText}>
              Scan a homework photo in Smart Solver, then ask Maze Mentor to quiz you on the same topic before Quiz Rush.
            </Text>
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>AI study tools</Text>
        <View style={styles.grid}>
          {FEATURES.map((item, index) => (
            <LearnToolCard
              key={item.key}
              tool={item}
              width={cardWidth}
              index={index}
              onPress={() => open(item)}
            />
          ))}
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            Ready · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 210,
  },
  headerGradient: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  headerCopy: { flex: 1 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  headerButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  body: { paddingTop: 6 },
  tipCard: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  tipGradient: { padding: 18 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  tipTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  tipText: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary, fontWeight: '600' },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  grid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 8,
  },
  statusText: { fontSize: 12, color: COLORS.textTertiary, fontWeight: '600' },
});
