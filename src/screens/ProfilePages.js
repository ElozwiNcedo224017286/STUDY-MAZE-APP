import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function Page({ navigation, title, subtitle, children }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.back, { color: colors.primaryText }]} onPress={() => navigation.goBack()}>‹</Text>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, icon }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={18} color={colors.primaryText} /></View>
      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );
}

export function ProfileDetailsScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available';
  return (
    <Page navigation={navigation} title="Personal details" subtitle="Your Study Maze account information.">
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <InfoRow label="Display name" value={user?.username} icon="person-outline" />
        <InfoRow label="Email address" value={user?.email} icon="mail-outline" />
        <InfoRow label="Account type" value={user?.role === 'teacher' ? 'Teacher' : 'Student'} icon="school-outline" />
        <InfoRow label="Grade" value={user?.grade} icon="book-outline" />
        <InfoRow label="Member since" value={joined} icon="calendar-outline" />
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>To change your display name or photo, use Edit profile on your Profile page.</Text>
    </Page>
  );
}

const HELP_TOPICS = [
  { title: 'I need help with my account', body: 'Check that you are using the email address you registered with. Ask your teacher or school administrator for help with account access.' },
  { title: 'How do I study my notes?', body: 'Open Smart Learn to create notes from your own PDF, or open Notes to view material shared by your teacher.' },
  { title: 'Where are my rewards and progress?', body: 'Your coins, streak, achievements, and learning progress are shown on your Profile page.' },
  { title: 'Something is not working', body: 'Check your internet connection, then try again. If the problem continues, share what happened with your teacher or school administrator.' },
];

export function HelpSupportScreen({ navigation }) {
  const { colors } = useTheme();
  return (
    <Page navigation={navigation} title="Help & support" subtitle="Quick answers for using Study Maze.">
      {HELP_TOPICS.map((item, index) => (
        <View key={item.title} style={[styles.helpCard, { backgroundColor: colors.surface }]}>
          <View style={styles.helpHeading}>
            <View style={styles.helpNumber}><Text style={[styles.helpNumberText, { color: colors.primaryText }]}>{index + 1}</Text></View>
            <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>{item.title}</Text>
          </View>
          <Text style={[styles.helpBody, { color: colors.textSecondary }]}>{item.body}</Text>
        </View>
      ))}
    </Page>
  );
}

export function AchievementsScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const cleared = Math.max(0, Math.min(user?.unlockedLevel || 1, 3) - 1);
  const achievements = [
    { title: 'Maze Master', detail: 'Clear all 3 maze levels.', icon: 'map-outline', unlocked: cleared >= 3 },
    { title: 'Quiz Star', detail: 'Earn coins by completing a game.', icon: 'star-outline', unlocked: (user?.coins || 0) > 0 },
    { title: '7 Day Streak', detail: 'Play on 7 consecutive days.', icon: 'flame-outline', unlocked: (user?.streakDays || 0) >= 7 },
  ];
  return (
    <Page navigation={navigation} title="Achievements" subtitle="Milestones from your learning journey.">
      {achievements.map((item) => (
        <View key={item.title} style={[styles.achievementCard, { backgroundColor: colors.surface }, !item.unlocked && styles.achievementLocked]}>
          <View style={[styles.achievementIcon, item.unlocked && styles.achievementIconOn]}>
            <Ionicons name={item.icon} size={24} color={item.unlocked ? colors.primaryText : colors.textTertiary} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={[styles.aboutTitle, { color: colors.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.detail}</Text>
            <Text style={[styles.achievementState, { color: item.unlocked ? colors.primaryText : colors.textTertiary }]}>{item.unlocked ? 'Unlocked' : 'Keep learning'}</Text>
          </View>
        </View>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  header: { minHeight: 58, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: COLORS.primary, fontSize: 34, lineHeight: 36, width: 38 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 38 },
  content: { paddingHorizontal: 20, paddingTop: 10 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 18 },
  card: { backgroundColor: COLORS.white, borderRadius: 18, paddingHorizontal: 16, ...SHADOWS.small },
  infoRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  infoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft, marginRight: 12 },
  infoCopy: { flex: 1 },
  infoLabel: { color: COLORS.textTertiary, fontSize: 12, fontWeight: '600' },
  infoValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 3 },
  hint: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 14, paddingHorizontal: 4 },
  helpCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, ...SHADOWS.small },
  helpHeading: { flexDirection: 'row', alignItems: 'center' },
  helpNumber: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft, marginRight: 10 },
  helpNumberText: { color: COLORS.primary, fontWeight: '800' },
  helpTitle: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  helpBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 11, marginLeft: 38 },
  aboutTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  achievementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, ...SHADOWS.small },
  achievementLocked: { opacity: 0.72 },
  achievementIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.backgroundTertiary, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  achievementIconOn: { backgroundColor: COLORS.primarySoft },
  achievementState: { color: COLORS.textTertiary, fontSize: 11, fontWeight: '700', marginTop: 6 },
  achievementStateOn: { color: COLORS.primary },
});
