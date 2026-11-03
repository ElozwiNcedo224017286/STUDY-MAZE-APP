import React, { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StackHeader from '../components/StackHeader';

function Page({ navigation, title, subtitle, children }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.backgroundSecondary }]}>
      <StackHeader title={title} onBack={() => navigation.goBack()} />
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

const SUPPORT_EMAIL = 'support.studymaze2026@gmail.com';
const APP_VERSION = Constants?.expoConfig?.version || Constants?.manifest?.version || '1.0.0';

export function HelpSupportScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const isTeacher = user?.role === 'teacher';
  const faqs = useMemo(() => [
    {
      category: 'Account',
      question: 'I cannot log in. What should I do?',
      answer: isTeacher
        ? 'Check that you are using the email address registered to your teacher account. If your school manages accounts, contact your school administrator. You can also email Study Maze support for help.'
        : 'Check that you are using the email address registered to your student account. If your school manages accounts, ask your teacher or school administrator to check your access. You can also email Study Maze support for help.',
    },
    {
      category: 'Study materials',
      question: isTeacher ? 'How do I share study material with my class?' : 'How do I upload my study material?',
      answer: isTeacher
        ? 'Use Notes to publish material under one of your assigned class subjects. Students see it in Smart Learn under Teacher Notes for their current subject.'
        : 'Choose your current subject in Profile → My Subjects, then open Smart Learn → Own Notes to upload a personal PDF and generate notes for that subject. Teacher Notes shows material shared for your current subject.',
    },
    {
      category: 'Games and learning',
      question: 'How do I choose material for a game?',
      answer: isTeacher
        ? 'Publish a chapter question bank in Studio under the correct assigned class subject. Students use their current subject and choose a published chapter in Maze or Quiz Rush.'
        : 'Choose your current subject in Profile → My Subjects. In Play, Maze uses that subject, then lets you choose a chapter and level. Quiz Rush uses that subject, then lets you choose a chapter and start a run. Memory Match keeps its existing matching game; it does not use your Own Notes.',
    },
    {
      category: 'Games and learning',
      question: 'Where can I find my notes and learning progress?',
      answer: isTeacher
        ? 'Use Notes to review summaries you have posted and Profile to see your account details. Students can open your shared summaries in Learn.'
        : 'In Smart Learn, Teacher Notes shows shared material and Own Notes shows your personal PDF-generated notes for your current subject. Your coins, streak, achievements, and learning progress are shown on Profile.',
    },
    {
      category: 'Troubleshooting',
      question: 'An upload or screen is not working. What can I try?',
      answer: 'Check your internet connection, confirm the file type and size are supported, and try again. If the issue continues, use Report a problem below and include what you were doing, what you expected, and what happened. Do not attach private study material unless support asks for it.',
    },
    {
      category: 'Account',
      question: 'How do I contact support?',
      answer: `Email ${SUPPORT_EMAIL}. Include the email on your Study Maze account and a short description of the issue. Never send your password or verification codes.`,
    },
  ], [isTeacher]);
  const filteredFaqs = faqs.filter((item) => `${item.category} ${item.question} ${item.answer}`.toLowerCase().includes(search.trim().toLowerCase()));

  async function emailSupport(subject, body) {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open email', `Please email ${SUPPORT_EMAIL} from your mail app.`);
    }
  }

  function contactSupport() {
    emailSupport('Study Maze support request', `Hello Study Maze Support,\n\nAccount email: ${user?.email || 'Not provided'}\nRole: ${isTeacher ? 'Teacher' : 'Student'}\nApp version: ${APP_VERSION}\n\nHow can we help?\n`);
  }

  function reportProblem() {
    emailSupport('Study Maze problem report', `Hello Study Maze Support,\n\nAccount email: ${user?.email || 'Not provided'}\nRole: ${isTeacher ? 'Teacher' : 'Student'}\nApp version: ${APP_VERSION}\nScreen: Help & Support\n\nWhat happened?\nWhat did you expect to happen?\nSteps to reproduce (if known):\n`);
  }

  return (
    <Page navigation={navigation} title="Help & support" subtitle="Find quick answers or get in touch with the Study Maze team.">
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={19} color={colors.textTertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search help topics"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Search help topics"
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={19} color={colors.textTertiary} /></TouchableOpacity> : null}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Common questions</Text>
      {filteredFaqs.length ? filteredFaqs.map((item) => {
        const expanded = expandedQuestion === item.question;
        return (
          <TouchableOpacity
            key={item.question}
            style={[styles.faqCard, { backgroundColor: colors.surface }]}
            onPress={() => setExpandedQuestion(expanded ? null : item.question)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
          >
            <View style={styles.faqHeading}>
              <View style={styles.faqIcon}><Ionicons name="help-circle-outline" size={19} color={colors.primaryText} /></View>
              <View style={styles.faqCopy}>
                <Text style={[styles.faqCategory, { color: colors.primaryText }]}>{item.category}</Text>
                <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>{item.question}</Text>
              </View>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={19} color={colors.textTertiary} />
            </View>
            {expanded ? <Text style={[styles.helpBody, { color: colors.textSecondary }]}>{item.answer}</Text> : null}
          </TouchableOpacity>
        );
      }) : (
        <View style={[styles.emptyHelp, { backgroundColor: colors.surface }]}>
          <Text style={[styles.helpBody, { color: colors.textSecondary, marginLeft: 0, marginTop: 0 }]}>No matching help topics. Try another search or contact support.</Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, styles.contactHeading, { color: colors.textPrimary }]}>Still need help?</Text>
      <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>We’re here to help</Text>
        <Text style={[styles.contactCopy, { color: colors.textSecondary }]}>Email us at {SUPPORT_EMAIL}. Never include your password or verification codes.</Text>
        <TouchableOpacity style={[styles.primaryHelpButton, { backgroundColor: colors.primary }]} onPress={contactSupport} accessibilityRole="button">
          <Ionicons name="mail-outline" size={18} color={colors.primaryText} />
          <Text style={[styles.primaryHelpButtonText, { color: colors.primaryText }]}>Contact support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryHelpButton, { borderColor: colors.border }]} onPress={reportProblem} accessibilityRole="button">
          <Ionicons name="bug-outline" size={18} color={colors.primaryText} />
          <Text style={[styles.secondaryHelpButtonText, { color: colors.textPrimary }]}>Report a problem</Text>
        </TouchableOpacity>
        <Text style={[styles.versionLabel, { color: colors.textTertiary }]}>Study Maze · v{APP_VERSION}</Text>
      </View>
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
  content: { paddingHorizontal: 20, paddingTop: 10 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 18 },
  card: { backgroundColor: COLORS.white, borderRadius: 18, paddingHorizontal: 16, ...SHADOWS.small },
  infoRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  infoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft, marginRight: 12 },
  infoCopy: { flex: 1 },
  infoLabel: { color: COLORS.textTertiary, fontSize: 12, fontWeight: '600' },
  infoValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 3 },
  hint: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 14, paddingHorizontal: 4 },
  searchBox: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 11, marginLeft: 9 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  faqCard: { borderRadius: 16, padding: 14, marginBottom: 10, ...SHADOWS.small },
  faqHeading: { flexDirection: 'row', alignItems: 'center' },
  faqIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft, marginRight: 11 },
  faqCopy: { flex: 1, marginRight: 8 },
  faqCategory: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  helpTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  helpBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 11, marginLeft: 45 },
  emptyHelp: { borderRadius: 16, padding: 16, marginBottom: 12, ...SHADOWS.small },
  contactHeading: { marginTop: 14 },
  contactCard: { borderRadius: 18, padding: 18, marginBottom: 12, ...SHADOWS.small },
  contactTitle: { fontSize: 17, fontWeight: '800' },
  contactCopy: { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 14 },
  primaryHelpButton: { minHeight: 46, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 9, paddingHorizontal: 14 },
  primaryHelpButtonText: { fontWeight: '800', fontSize: 14, marginLeft: 8 },
  secondaryHelpButton: { minHeight: 44, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  secondaryHelpButtonText: { fontWeight: '700', fontSize: 14, marginLeft: 8 },
  versionLabel: { textAlign: 'center', fontSize: 11, marginTop: 14 },
  aboutTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  achievementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, ...SHADOWS.small },
  achievementLocked: { opacity: 0.72 },
  achievementIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.backgroundTertiary, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  achievementIconOn: { backgroundColor: COLORS.primarySoft },
  achievementState: { color: COLORS.textTertiary, fontSize: 11, fontWeight: '700', marginTop: 6 },
  achievementStateOn: { color: COLORS.primary },
});
