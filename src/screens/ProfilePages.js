import React from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import ProfileMenuItem from '../components/ProfileMenuItem';
import { supabase } from '../api/supabase';

function Page({ navigation, title, subtitle, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.back} onPress={() => navigation.goBack()}>‹</Text>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={18} color={COLORS.primary} /></View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );
}

export function ProfileDetailsScreen({ navigation }) {
  const { user } = useAuth();
  const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available';
  return (
    <Page navigation={navigation} title="Personal details" subtitle="Your Study Maze account information.">
      <View style={styles.card}>
        <InfoRow label="Display name" value={user?.username} icon="person-outline" />
        <InfoRow label="Email address" value={user?.email} icon="mail-outline" />
        <InfoRow label="Account type" value={user?.role === 'teacher' ? 'Teacher' : 'Student'} icon="school-outline" />
        <InfoRow label="Grade" value={user?.grade} icon="book-outline" />
        <InfoRow label="Member since" value={joined} icon="calendar-outline" />
      </View>
      <Text style={styles.hint}>To change your display name or photo, use Edit profile on your Profile page.</Text>
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
  return (
    <Page navigation={navigation} title="Help & support" subtitle="Quick answers for using Study Maze.">
      {HELP_TOPICS.map((item, index) => (
        <View key={item.title} style={styles.helpCard}>
          <View style={styles.helpHeading}>
            <View style={styles.helpNumber}><Text style={styles.helpNumberText}>{index + 1}</Text></View>
            <Text style={styles.helpTitle}>{item.title}</Text>
          </View>
          <Text style={styles.helpBody}>{item.body}</Text>
        </View>
      ))}
    </Page>
  );
}

export function ProfileSettingsScreen({ navigation }) {
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [savingPassword, setSavingPassword] = React.useState(false);

  async function changePassword() {
    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters for your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same new password in both fields.');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordVisible(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', 'Your password has been changed.');
    } catch (error) {
      Alert.alert('Could not update password', error.message || 'Please try again.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <Page navigation={navigation} title="Settings" subtitle="Manage your account and find help.">
      <View style={styles.menuCard}>
        <ProfileMenuItem icon="person-outline" title="Personal details" description="View your account information" onPress={() => navigation.navigate('ProfileDetails')} />
        <ProfileMenuItem icon="lock-closed-outline" title="Change password" description="Set a new password for your account" onPress={() => setPasswordVisible(true)} />
        <ProfileMenuItem icon="help-circle-outline" title="Help & support" description="Answers to common questions" onPress={() => navigation.navigate('HelpSupport')} />
      </View>
      <View style={styles.aboutCard}>
        <Ionicons name="school-outline" size={22} color={COLORS.primary} />
        <View style={styles.infoCopy}>
          <Text style={styles.aboutTitle}>Study Maze</Text>
          <Text style={styles.infoLabel}>Learn, play, and track your progress.</Text>
        </View>
      </View>
      <Modal visible={passwordVisible} transparent animationType="fade" onRequestClose={() => setPasswordVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.passwordCard}>
            <Text style={styles.passwordTitle}>Change password</Text>
            <Text style={styles.infoLabel}>Choose a new password with at least 8 characters.</Text>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="New password"
              placeholderTextColor={COLORS.textTertiary}
            />
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textTertiary}
            />
            <View style={styles.passwordActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setPasswordVisible(false)} disabled={savingPassword}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, savingPassword && styles.disabledButton]} onPress={changePassword} disabled={savingPassword}>
                <Text style={styles.saveText}>{savingPassword ? 'Saving...' : 'Update password'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

export function AchievementsScreen({ navigation }) {
  const { user } = useAuth();
  const cleared = Math.max(0, Math.min(user?.unlockedLevel || 1, 3) - 1);
  const achievements = [
    { title: 'Maze Master', detail: 'Clear all 3 maze levels.', icon: 'map-outline', unlocked: cleared >= 3 },
    { title: 'Quiz Star', detail: 'Earn coins by completing a game.', icon: 'star-outline', unlocked: (user?.coins || 0) > 0 },
    { title: '7 Day Streak', detail: 'Play on 7 consecutive days.', icon: 'flame-outline', unlocked: (user?.streakDays || 0) >= 7 },
  ];
  return (
    <Page navigation={navigation} title="Achievements" subtitle="Milestones from your learning journey.">
      {achievements.map((item) => (
        <View key={item.title} style={[styles.achievementCard, !item.unlocked && styles.achievementLocked]}>
          <View style={[styles.achievementIcon, item.unlocked && styles.achievementIconOn]}>
            <Ionicons name={item.icon} size={24} color={item.unlocked ? COLORS.primary : COLORS.textTertiary} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.aboutTitle}>{item.title}</Text>
            <Text style={styles.infoLabel}>{item.detail}</Text>
            <Text style={[styles.achievementState, item.unlocked && styles.achievementStateOn]}>{item.unlocked ? 'Unlocked' : 'Keep learning'}</Text>
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
  menuCard: { backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', ...SHADOWS.small },
  aboutCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginTop: 16, ...SHADOWS.small },
  aboutTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  achievementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, ...SHADOWS.small },
  achievementLocked: { opacity: 0.72 },
  achievementIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.backgroundTertiary, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  achievementIconOn: { backgroundColor: COLORS.primarySoft },
  achievementState: { color: COLORS.textTertiary, fontSize: 11, fontWeight: '700', marginTop: 6 },
  achievementStateOn: { color: COLORS.primary },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(26,16,48,0.48)', padding: 22 },
  passwordCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 20, padding: 22, ...SHADOWS.large },
  passwordTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  passwordInput: { height: 48, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.backgroundSecondary, borderRadius: 12, paddingHorizontal: 14, color: COLORS.textPrimary, marginTop: 14 },
  passwordActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 12 },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12 },
  saveText: { color: COLORS.white, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
});
