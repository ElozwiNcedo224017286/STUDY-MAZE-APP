import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import ScreenHeader from '../components/ScreenHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthName(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export default function StreakScreen({ navigation }) {
  const { getUserStreak } = useAuth();

  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --------------------------------------------------
  // Animation values
  // --------------------------------------------------

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(25)).current;

  const fireScale = useRef(new Animated.Value(0.5)).current;
  const fireOpacity = useRef(new Animated.Value(0)).current;

  const calendarOpacity = useRef(new Animated.Value(0)).current;
  const calendarTranslateY = useRef(new Animated.Value(25)).current;

  const [animatedStreak, setAnimatedStreak] = useState(0);

  // --------------------------------------------------
  // Calendar animation values
  // --------------------------------------------------

  const calendarCellAnimations = useRef(
    Array.from({ length: 42 }, () => new Animated.Value(0))
  ).current;

  // --------------------------------------------------
  // Current month
  // --------------------------------------------------

  const currentMonth = useMemo(() => {
    const now = new Date();

    return {
      year: now.getFullYear(),
      month: now.getMonth(),
    };
  }, []);

  // --------------------------------------------------
  // Build calendar days
  // --------------------------------------------------

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      currentMonth.year,
      currentMonth.month,
      1
    );

    const daysInMonth = new Date(
      currentMonth.year,
      currentMonth.month + 1,
      0
    ).getDate();

    const startingDay = firstDay.getDay();

    const days = [];

    // Empty cells before the first day
    for (let i = 0; i < startingDay; i += 1) {
      days.push(null);
    }

    // Actual month days
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(
        currentMonth.year,
        currentMonth.month,
        day
      );

      days.push({
        day,
        date,
        dateKey: formatDateKey(date),
      });
    }

    // Complete final row
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [currentMonth]);

  // --------------------------------------------------
  // Today's date
  // --------------------------------------------------

  const todayKey = useMemo(() => {
    return formatDateKey(new Date());
  }, []);

  // --------------------------------------------------
  // Active streak dates
  // --------------------------------------------------
  // Only dates belonging to the CURRENT streak are
  // highlighted.
  //
  // Older claimed rewards may still exist in the
  // database but are intentionally not displayed as
  // part of the active streak.
  // --------------------------------------------------

  const activeStreakDateSet = useMemo(() => {
    const dates = new Set();

    const currentStreak = streak?.current_streak ?? 0;
    const lastRewardDate = streak?.last_reward_date;

    if (!lastRewardDate || currentStreak <= 0) {
      return dates;
    }

    const lastDate = new Date(`${lastRewardDate}T00:00:00`);

    for (let i = 0; i < currentStreak; i += 1) {
      const date = new Date(lastDate);

      date.setDate(date.getDate() - i);

      dates.add(formatDateKey(date));
    }

    return dates;
  }, [streak]);

  // --------------------------------------------------
  // Load streak
  // --------------------------------------------------

  const loadStreak = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const streakData = await getUserStreak();

      setStreak(streakData);
    } catch (e) {
      console.warn('Failed to load streak:', e.message);

      setError(e.message || 'Could not load streak.');
    } finally {
      setLoading(false);
    }
  }, [getUserStreak]);

  useFocusEffect(
    useCallback(() => {
      loadStreak();
    }, [loadStreak])
  );

  // --------------------------------------------------
  // Run animations after streak has loaded
  // --------------------------------------------------

  useEffect(() => {
    if (loading || error || !streak) return;

    const targetStreak = streak.current_streak ?? 0;

    // Reset main animations
    heroOpacity.setValue(0);
    heroTranslateY.setValue(25);

    fireScale.setValue(0.5);
    fireOpacity.setValue(0);

    calendarOpacity.setValue(0);
    calendarTranslateY.setValue(25);

    setAnimatedStreak(0);

    // Reset calendar cells
    calendarCellAnimations.forEach((animation) => {
      animation.setValue(0);
    });

    // --------------------------------------------------
    // Hero entrance
    // --------------------------------------------------

    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(heroTranslateY, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // --------------------------------------------------
    // Fire pop
    // --------------------------------------------------

    Animated.sequence([
      Animated.delay(250),

      Animated.parallel([
        Animated.timing(fireOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),

        Animated.spring(fireScale, {
          toValue: 1,
          friction: 5,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // --------------------------------------------------
    // Streak counter
    // --------------------------------------------------

    let interval = null;

    if (targetStreak === 0) {
      setAnimatedStreak(0);
    } else {
      const duration = 650;
      const steps = targetStreak;
      const intervalTime = Math.max(60, duration / steps);

      let current = 0;

      interval = setInterval(() => {
        current += 1;

        setAnimatedStreak(current);

        if (current >= targetStreak) {
          clearInterval(interval);
          interval = null;
        }
      }, intervalTime);
    }

    // --------------------------------------------------
    // Calendar entrance
    // --------------------------------------------------

    Animated.sequence([
      Animated.delay(500),

      Animated.parallel([
        Animated.timing(calendarOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(calendarTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // --------------------------------------------------
    // Cleanup
    // --------------------------------------------------

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [
    loading,
    error,
    streak,
    heroOpacity,
    heroTranslateY,
    fireScale,
    fireOpacity,
    calendarOpacity,
    calendarTranslateY,
    calendarCellAnimations,
  ]);

  // --------------------------------------------------
  // Calendar cell animation
  // --------------------------------------------------

  useEffect(() => {
    if (loading || error || !streak) return;

    const animation = Animated.stagger(
      35,
      calendarCellAnimations.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    );

    const timeout = setTimeout(() => {
      animation.start();
    }, 850);

    return () => clearTimeout(timeout);
  }, [
    loading,
    error,
    streak,
    calendarCellAnimations,
  ]);

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Loading your streak...
        </Text>
      </View>
    );
  }

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  if (error) {
    return (
      <View style={styles.screen}>
        <ScreenHeader
          title="Daily"
          titleHighlight="Rewards"
          subtitle="Keep your streak alive and earn rewards every day."
        />

        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={COLORS.error}
              />
            </View>

            <Text style={styles.errorTitle}>
              Something went wrong
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadStreak}
              activeOpacity={0.85}
            >
              <Text style={styles.retryButtonText}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={17}
              color={COLORS.primary}
            />

            <Text style={styles.backButtonText}>
              Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Daily"
        titleHighlight="Rewards"
        subtitle="Keep your streak alive and earn rewards every day."
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ------------------------------------------------
            HERO
        ------------------------------------------------ */}

        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: heroOpacity,
              transform: [
                {
                  translateY: heroTranslateY,
                },
              ],
            },
          ]}
        >
          <View style={styles.heroGlow} />

          <Animated.View
            style={[
              styles.fireCircle,
              {
                opacity: fireOpacity,
                transform: [
                  {
                    scale: fireScale,
                  },
                ],
              },
            ]}
          >
            <Text style={styles.fire}>
              🔥
            </Text>
          </Animated.View>

          <Text style={styles.streakNumber}>
            {animatedStreak}
          </Text>

          <Text style={styles.streakLabel}>
            DAY STREAK
          </Text>

          <Text style={styles.keepGoing}>
            Keep showing up every day!
          </Text>

          <View style={styles.heroBadge}>
            <Ionicons
              name="flame"
              size={14}
              color={COLORS.primary}
            />

            <Text style={styles.heroBadgeText}>
              Daily progress
            </Text>
          </View>
        </Animated.View>

        {/* ------------------------------------------------
            STATISTICS
        ------------------------------------------------ */}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons
                name="flame-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.statTextBlock}>
              <Text style={styles.statNumber}>
                {streak?.current_streak ?? 0}
              </Text>

              <Text style={styles.statLabel}>
                Current Streak
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons
                name="trophy-outline"
                size={19}
                color={COLORS.accentDark}
              />
            </View>

            <View style={styles.statTextBlock}>
              <Text style={styles.statNumber}>
                {streak?.longest_streak ?? 0}
              </Text>

              <Text style={styles.statLabel}>
                Best Streak
              </Text>
            </View>
          </View>
        </View>

        {/* ------------------------------------------------
            CALENDAR
        ------------------------------------------------ */}

        <Animated.View
          style={[
            styles.calendarCard,
            {
              opacity: calendarOpacity,
              transform: [
                {
                  translateY: calendarTranslateY,
                },
              ],
            },
          ]}
        >
          <View style={styles.calendarHeader}>
            <View style={styles.calendarHeaderText}>
              <Text style={styles.calendarEyebrow}>
                YOUR JOURNEY
              </Text>

              <Text style={styles.calendarTitle}>
                {getMonthName(
                  new Date(
                    currentMonth.year,
                    currentMonth.month,
                    1
                  )
                )}
              </Text>
            </View>

            <View style={styles.monthStreakPill}>
              <Ionicons
                name="flame"
                size={14}
                color={COLORS.primary}
              />

              <Text style={styles.monthStreakText}>
                {streak?.current_streak ?? 0}
              </Text>
            </View>
          </View>

          <Text style={styles.calendarSubtitle}>
            Every reward keeps your journey alive.
          </Text>

          {/* Weekday headings */}

          <View style={styles.weekRow}>
            {DAY_NAMES.map((day) => (
              <View
                key={day}
                style={styles.weekDay}
              >
                <Text style={styles.weekDayText}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}

          <View style={styles.calendarGrid}>
            {calendarDays.map((item, index) => {
              if (!item) {
                return (
                  <View
                    key={`empty-${index}`}
                    style={styles.dayCell}
                  />
                );
              }

              const claimed =
                activeStreakDateSet.has(item.dateKey);

              const isToday =
                item.dateKey === todayKey;

              const animatedStyle = {
                opacity:
                  calendarCellAnimations[index],
                transform: [
                  {
                    scale:
                      calendarCellAnimations[
                        index
                      ].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.75, 1],
                      }),
                  },
                ],
              };

              return (
                <Animated.View
                  key={item.dateKey}
                  style={[
                    styles.dayCell,
                    animatedStyle,
                  ]}
                >
                  <View
                    style={[
                      styles.dayInner,
                      claimed &&
                        styles.claimedDay,
                      isToday &&
                        styles.todayDay,
                      claimed &&
                        isToday &&
                        styles.claimedTodayDay,
                    ]}
                  >
                    {claimed ? (
                      <View style={styles.dayFireWrap}>
                        <Text style={styles.dayFire}>
                          🔥
                        </Text>
                      </View>
                    ) : null}

                    <Text
                      style={[
                        styles.dayNumber,
                        claimed &&
                          styles.claimedDayNumber,
                        isToday &&
                          styles.todayDayNumber,
                      ]}
                    >
                      {item.day}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* Legend */}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={styles.legendFireCircle}>
                <Ionicons
                  name="flame"
                  size={10}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.legendText}>
                Active streak
              </Text>
            </View>

            <View style={styles.legendItem}>
              <View style={styles.legendTodayCircle} />

              <Text style={styles.legendText}>
                Today
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ------------------------------------------------
            DAILY REWARD
        ------------------------------------------------ */}

        <View style={styles.rewardCard}>
          <View style={styles.rewardIconWrap}>
            <Ionicons
              name="gift-outline"
              size={23}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.rewardContent}>
            <Text style={styles.rewardTitle}>
              Daily Reward
            </Text>

            <Text style={styles.rewardText}>
              Claim your reward every day to keep
              your streak alive!
            </Text>
          </View>

          <View style={styles.rewardBadge}>
            <Text style={styles.rewardBadgeText}>
              DAILY
            </Text>
          </View>

          {streak?.last_reward_date && (
            <View style={styles.lastRewardRow}>
              <View>
                <Text style={styles.lastRewardLabel}>
                  LAST REWARD
                </Text>

                <Text style={styles.dateText}>
                  {streak.last_reward_date}
                </Text>
              </View>

              <Ionicons
                name="checkmark-circle"
                size={21}
                color={COLORS.success}
              />
            </View>
          )}
        </View>

        {/* Bottom spacing for the root stack screen */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // --------------------------------------------------
  // Screen
  // --------------------------------------------------

  screen: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },

  scrollView: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 12,
  },

  // --------------------------------------------------
  // Hero
  // --------------------------------------------------

  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },

  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.primaryFaded,
    top: -90,
    right: -60,
  },

  fireCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  fire: {
    fontSize: 38,
  },

  streakNumber: {
    color: COLORS.textPrimary,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -1,
  },

  streakLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: -2,
  },

  keepGoing: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },

  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryFaded,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 11,
    marginTop: 16,
  },

  heroBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 5,
  },

  // --------------------------------------------------
  // Statistics
  // --------------------------------------------------

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },

  statCard: {
    flex: 1,
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 13,
    ...SHADOWS.small,
  },

  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  statTextBlock: {
    flex: 1,
  },

  statNumber: {
    color: COLORS.textPrimary,
    fontSize: 23,
    fontWeight: '900',
  },

  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },

  // --------------------------------------------------
  // Calendar
  // --------------------------------------------------

  calendarCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    ...SHADOWS.small,
  },

  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  calendarHeaderText: {
    flex: 1,
  },

  calendarEyebrow: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  calendarTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },

  calendarSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 5,
    lineHeight: 16,
  },

  monthStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  monthStreakText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 4,
  },

  weekRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 8,
  },

  weekDay: {
    flex: 1,
    alignItems: 'center',
  },

  weekDayText: {
    color: COLORS.textTertiary,
    fontSize: 8,
    fontWeight: '900',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: '14.2857%',
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayInner: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  dayNumber: {
    color: COLORS.textTertiary,
    fontSize: 11,
    fontWeight: '700',
  },

  claimedDay: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },

  claimedDayNumber: {
    color: COLORS.primary,
    fontWeight: '900',
  },

  todayDay: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },

  todayDayNumber: {
    color: COLORS.textPrimary,
    fontWeight: '900',
  },

  claimedTodayDay: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  dayFireWrap: {
    position: 'absolute',
    top: -5,
    right: -4,
  },

  dayFire: {
    fontSize: 9,
  },

  // --------------------------------------------------
  // Calendar legend
  // --------------------------------------------------

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: 12,
    paddingTop: 12,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendFireCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },

  legendTodayCircle: {
    width: 13,
    height: 13,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginRight: 5,
  },

  legendText: {
    color: COLORS.textSecondary,
    fontSize: 9,
  },

  // --------------------------------------------------
  // Daily reward card
  // --------------------------------------------------

  rewardCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    ...SHADOWS.small,
  },

  rewardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  rewardContent: {
    paddingRight: 45,
  },

  rewardTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },

  rewardText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  rewardBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },

  rewardBadgeText: {
    color: COLORS.primary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  lastRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: 14,
    paddingTop: 12,
  },

  lastRewardLabel: {
    color: COLORS.textTertiary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  dateText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  errorContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'stretch',
  },

  errorCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    ...SHADOWS.small,
  },

  errorIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  errorTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },

  errorText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 18,
  },

  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  retryButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },

  backButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },

  bottomSpacer: {
    height: 20,
  },
});