import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Easing, ScrollView, } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import NavigationDock from '../components/NavigationDock';

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
  const {
    getUserStreak,
  } = useAuth();

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

    // Complete the final row
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
// Only dates belonging to the CURRENT streak are highlighted.
// Older claimed rewards remain in daily_login_rewards but are
// intentionally not displayed as part of the active streak.

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
  // Load streak + reward history
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

  // -----------------------------------------------
  // Hero entrance
  // -----------------------------------------------

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

  // -----------------------------------------------
  // Fire pop
  // -----------------------------------------------

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

  // -----------------------------------------------
  // Streak counter
  // -----------------------------------------------

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

  // -----------------------------------------------
  // Calendar entrance
  // -----------------------------------------------

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

  // -----------------------------------------------
  // Cleanup
  // -----------------------------------------------

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
          color={colors.mint}
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
      <View style={styles.container}>
        <Text style={styles.title}>
          Daily Streak
        </Text>

        <View style={styles.card}>
          <Text style={styles.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={loadStreak}
          >
            <Text style={styles.buttonText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>
            ← Back to Hub
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <View style={styles.screen}>
    <ScrollView
    style={styles.scrollView}
    contentContainerStyle={styles.container}
    showsVerticalScrollIndicator={false}
    scrollIndicatorInsets={{ bottom: 120 }}
    >
      <Text style={styles.title}>
        Daily Streak
      </Text>

      {/* ------------------------------------------------
          HERO
      ------------------------------------------------ */}

      <Animated.View
        style={[
          styles.mainCard,
          {
            opacity: heroOpacity,
            transform: [
              { translateY: heroTranslateY },
            ],
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.fire,
            {
              opacity: fireOpacity,
              transform: [
                { scale: fireScale },
              ],
            },
          ]}
        >
          🔥
        </Animated.Text>

        <Text style={styles.streakNumber}>
          {animatedStreak}
        </Text>

        <Text style={styles.streakLabel}>
          DAY STREAK
        </Text>

        <Text style={styles.keepGoing}>
          Keep showing up every day!
        </Text>
      </Animated.View>

      {/* ------------------------------------------------
          STATISTICS
      ------------------------------------------------ */}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {streak?.current_streak ?? 0}
          </Text>

          <Text style={styles.statLabel}>
            Current Streak
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {streak?.longest_streak ?? 0}
          </Text>

          <Text style={styles.statLabel}>
            Best Streak
          </Text>
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
              { translateY: calendarTranslateY },
            ],
          },
        ]}
      >
        <View style={styles.calendarHeader}>
          <View>
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
            <Text style={styles.monthStreakIcon}>
              🔥
            </Text>

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

            const claimed = activeStreakDateSet.has(
              item.dateKey
            );

            const isToday =
              item.dateKey === todayKey;

            const animatedStyle = {
              opacity: calendarCellAnimations[index],
              transform: [
                {
                  scale: calendarCellAnimations[index].interpolate({
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
                    claimed && styles.claimedDay,
                    isToday && styles.todayDay,
                    claimed &&
                      isToday &&
                      styles.claimedTodayDay,
                  ]}
                >
                  {claimed ? (
                    <Text style={styles.dayFire}>
                      🔥
                    </Text>
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
              <Text style={styles.legendFire}>
                🔥
              </Text>
            </View>

            <Text style={styles.legendText}>
              Reward claimed
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

      <View style={styles.infoCard}>
        <View style={styles.rewardHeader}>
          <Text style={styles.rewardIcon}>
            🎁
          </Text>

          <View style={styles.rewardHeaderText}>
            <Text style={styles.infoTitle}>
              Daily Reward
            </Text>

            <Text style={styles.infoText}>
              Claim your reward every day to keep
              your streak alive!
            </Text>
          </View>
        </View>

        {streak?.last_reward_date && (
          <View style={styles.lastRewardRow}>
            <Text style={styles.lastRewardLabel}>
              LAST REWARD
            </Text>

            <Text style={styles.dateText}>
              {streak.last_reward_date}
            </Text>
          </View>
        )}
      </View>
      
    </ScrollView>
    <NavigationDock navigation={navigation} activeRoute="Streak"/>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, 
    backgroundColor: colors.bg 
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 150,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: colors.inkDim,
    fontSize: 12,
    marginTop: 12,
  },

  title: {
    color: colors.mint,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 25,
  },

  // -----------------------------------------------
  // Hero
  // -----------------------------------------------

  mainCard: {
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 30,
  },

  fire: {
    fontSize: 48,
    marginBottom: 8,
  },

  streakNumber: {
    color: colors.mint,
    fontSize: 52,
    fontWeight: '900',
  },

  streakLabel: {
    color: colors.inkDim,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },

  keepGoing: {
    color: colors.inkDim,
    fontSize: 10,
    marginTop: 8,
  },

  // -----------------------------------------------
  // Statistics
  // -----------------------------------------------

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },

  statCard: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 18,
  },

  statNumber: {
    color: colors.mint,
    fontSize: 26,
    fontWeight: '900',
  },

  statLabel: {
    color: colors.inkDim,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  // -----------------------------------------------
  // Calendar
  // -----------------------------------------------

  calendarCard: {
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
  },

  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  calendarEyebrow: {
    color: colors.mint,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  calendarTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },

  calendarSubtitle: {
    color: colors.inkDim,
    fontSize: 10,
    marginTop: 5,
  },

  monthStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6,255,165,0.08)',
    borderWidth: 1,
    borderColor: colors.mint,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },

  monthStreakIcon: {
    fontSize: 12,
    marginRight: 4,
  },

  monthStreakText: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: '900',
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
    color: colors.inkDim,
    fontSize: 8,
    fontWeight: '900',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: '14.2857%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  dayNumber: {
    color: colors.inkDim,
    fontSize: 10,
    fontWeight: '700',
  },

  claimedDay: {
    backgroundColor: 'rgba(6,255,165,0.12)',
    borderWidth: 1,
    borderColor: colors.mint,
  },

  claimedDayNumber: {
    color: colors.mint,
    fontWeight: '900',
  },

  todayDay: {
    borderWidth: 1,
    borderColor: colors.teal,
  },

  todayDayNumber: {
    color: colors.ink,
    fontWeight: '900',
  },

  claimedTodayDay: {
    borderWidth: 2,
    borderColor: colors.mint,
  },

  dayFire: {
    position: 'absolute',
    top: -5,
    right: -4,
    fontSize: 9,
  },

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: colors.wallEdge,
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
    backgroundColor: 'rgba(6,255,165,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },

  legendFire: {
    fontSize: 8,
  },

  legendTodayCircle: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.teal,
    marginRight: 5,
  },

  legendText: {
    color: colors.inkDim,
    fontSize: 9,
  },

  // -----------------------------------------------
  // Daily Reward
  // -----------------------------------------------

  infoCard: {
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  },

  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rewardIcon: {
    fontSize: 24,
    marginRight: 10,
  },

  rewardHeaderText: {
    flex: 1,
  },

  infoTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },

  infoText: {
    color: colors.inkDim,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 17,
  },

  lastRewardRow: {
    borderTopWidth: 1,
    borderTopColor: colors.wallEdge,
    marginTop: 12,
    paddingTop: 10,
  },

  lastRewardLabel: {
    color: colors.inkDim,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  dateText: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },

  // -----------------------------------------------
  // Error
  // -----------------------------------------------

  card: {
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },

  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 15,
  },

  button: {
    backgroundColor: colors.mint,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  buttonText: {
    color: '#062B1F',
    fontWeight: '800',
  },

  // -----------------------------------------------
  // Back
  // -----------------------------------------------

  backButton: {
    backgroundColor: colors.teal,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 20,
  },

  backButtonText: {
    color: '#062B1F',
    fontWeight: '800',
  },
});