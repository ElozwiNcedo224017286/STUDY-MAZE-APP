import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

const LAST_UPDATED = 'September 28, 2026';

const PRIVACY_SECTIONS = [
  {
    title: 'Information used by Study Maze',
    paragraphs: [
      'When an account is created, the app may store account details such as your email address, display name, grade, account role, and profile image.',
      'The app also stores learning information needed for its features, such as game scores, coins, streaks, achievements, teacher announcements, uploaded study files, and notes created from those files.',
    ],
  },
  {
    title: 'How information is used',
    paragraphs: [
      'Study Maze uses this information to sign you in, show your profile and learning progress, deliver class materials and announcements, and provide study features.',
      'If you use an AI study feature, the text or document content needed to answer your request or create notes is sent to the AI service configured for that feature. The app currently uses Google Gemini for PDF study notes and OpenAI for some AI learning features.',
    ],
  },
  {
    title: 'Storage and service providers',
    paragraphs: [
      'Account and learning data is stored using the Study Maze project’s Supabase services. AI requests are processed by the relevant model provider. These services receive the information needed to provide the feature you choose.',
      'Your school or teacher may provide account access, class materials, or announcements. Use the app’s class features only for content intended for you.',
    ],
  },
  {
    title: 'Files and profile images',
    paragraphs: [
      'When you select a PDF or image, the app can upload that selected file to provide the feature you requested. Do not upload information you are not allowed to share or material containing sensitive personal information.',
    ],
  },
  {
    title: 'Retention and deletion',
    paragraphs: [
      'Information is kept in the app’s connected services while it is needed to operate your account and learning features. The app does not currently delete your account directly from Settings. To request help with account or data deletion, contact your teacher or school administrator.',
    ],
  },
  {
    title: 'Your choices and questions',
    paragraphs: [
      'You can choose whether to use optional AI and file-upload features. For questions about information associated with a school account, contact your teacher or school administrator.',
      'This page describes the app’s current behavior and is not a substitute for any privacy notice provided by your school or organization.',
    ],
  },
];

const TERMS_SECTIONS = [
  {
    title: 'Using the app',
    paragraphs: [
      'Study Maze provides learning tools, games, study notes, class materials, and teacher announcements. Use the app for lawful learning activities and follow instructions from your school or teacher.',
      'Keep your sign-in details private. You are responsible for activity performed through your account. Tell your teacher or school administrator if you think someone else has accessed it.',
    ],
  },
  {
    title: 'Your content',
    paragraphs: [
      'Only upload or share files and messages that you have permission to use. You keep any rights you already have in content you provide. You allow Study Maze and the services it uses to process that content only as needed to provide the feature you request.',
      'Teachers and schools are responsible for ensuring that materials and announcements they share are appropriate for their students and that they have permission to share them.',
    ],
  },
  {
    title: 'AI-generated content',
    paragraphs: [
      'AI-generated explanations, notes, and answers can be incomplete or inaccurate. Check important information against your class materials and your teacher’s guidance. Do not rely on AI output as professional advice or as a replacement for instruction.',
    ],
  },
  {
    title: 'Fair use',
    paragraphs: [
      'Do not misuse the app, interfere with its operation, attempt to access another person’s account or data, or upload harmful, unlawful, or unauthorized material. Access may be restricted if an account is used in a way that threatens the service or other users.',
    ],
  },
  {
    title: 'Availability and changes',
    paragraphs: [
      'Features may change, be temporarily unavailable, or depend on internet access and third-party services. We may update these terms as the app changes. The current version is shown on this page.',
    ],
  },
  {
    title: 'Questions',
    paragraphs: [
      'For help with these terms or your account, contact your teacher or school administrator through your school’s usual support channel.',
    ],
  },
];

function LegalPage({ navigation, title, subtitle, sections }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        <Text style={[styles.updated, { color: colors.textTertiary }]}>Last updated {LAST_UPDATED}</Text>
        {sections.map((section) => (
          <View key={section.title} style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={[styles.paragraph, { color: colors.textSecondary }]}>{paragraph}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function PrivacyPolicyScreen({ navigation }) {
  return (
    <LegalPage
      navigation={navigation}
      title="Privacy Policy"
      subtitle="How Study Maze uses information to provide its learning features."
      sections={PRIVACY_SECTIONS}
    />
  );
}

export function TermsOfServiceScreen({ navigation }) {
  return (
    <LegalPage
      navigation={navigation}
      title="Terms of Service"
      subtitle="Guidelines for using Study Maze."
      sections={TERMS_SECTIONS}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  header: {
    minHeight: 58,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingTop: 10 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21 },
  updated: { color: COLORS.textTertiary, fontSize: 12, marginTop: 8, marginBottom: 8 },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    ...SHADOWS.small,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 8 },
  paragraph: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 7 },
});
