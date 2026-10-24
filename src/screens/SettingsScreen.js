import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { COLORS, SHADOWS } from '../theme/colors';
import { supabase } from '../api/supabase';
import ProfileMenuItem from '../components/ProfileMenuItem';
import { useTheme } from '../context/ThemeContext';

const APP_VERSION =
  Constants?.expoConfig?.version || Constants?.manifest?.version || '1.0.0';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme, colors: themeColors } = useTheme();

  // Change password modal
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Toggle preferences
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [signingOut, setSigningOut] = useState(false);

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

  function confirmSignOut() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);
  }

  async function signOut() {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      Alert.alert('Could not log out', error.message || 'Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and all your progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Are you absolutely sure?',
              'Type your request to support to finish account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Contact support', onPress: () => navigation.navigate('HelpSupport') },
              ]
            ),
        },
      ]
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundSecondary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={themeColors.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>Manage your account, preferences, and find help.</Text>

        <SectionLabel text="Account" />
        <View style={[styles.menuCard, { backgroundColor: themeColors.surface }]}>
          <ProfileMenuItem
            icon="person-outline"
            title="Personal details"
            description="View your account information"
            onPress={() => navigation.navigate('ProfileDetails')}
          />
          <Divider />
          <ProfileMenuItem
            icon="lock-closed-outline"
            title="Change password"
            description="Set a new password for your account"
            onPress={() => setPasswordVisible(true)}
          />
          <Divider />
          <ProfileMenuItem
            icon="log-out-outline"
            title={signingOut ? 'Logging out...' : 'Log out'}
            description="Sign out of Study Maze"
            onPress={confirmSignOut}
            disabled={signingOut}
          />
        </View>

        <SectionLabel text="Appearance" />
        <View style={[styles.menuCard, { backgroundColor: themeColors.surface }]}>
          <SwitchRow
            icon={isDark ? 'moon' : 'moon-outline'}
            title="Dark mode"
            description="Switch between light and dark theme"
            value={isDark}
            onValueChange={toggleTheme}
          />
        </View>

        <SectionLabel text="Notifications" />
        <View style={[styles.menuCard, { backgroundColor: themeColors.surface }]}>
          <SwitchRow
            icon="notifications-outline"
            title="Push notifications"
            description="Reminders and progress alerts"
            value={pushEnabled}
            onValueChange={setPushEnabled}
          />
          <Divider />
          <SwitchRow
            icon="mail-outline"
            title="Email updates"
            description="Weekly summaries and news"
            value={emailEnabled}
            onValueChange={setEmailEnabled}
          />
          <Divider />
          <SwitchRow
            icon="volume-high-outline"
            title="Sound effects"
            description="Play sounds during quizzes"
            value={soundEnabled}
            onValueChange={setSoundEnabled}
          />
        </View>

        <SectionLabel text="Support" />
        <View style={[styles.menuCard, { backgroundColor: themeColors.surface }]}>
          <ProfileMenuItem
            icon="help-circle-outline"
            title="Help & support"
            description="Answers to common questions"
            onPress={() => navigation.navigate('HelpSupport')}
          />
          <Divider />
          <ProfileMenuItem
            icon="chatbubble-ellipses-outline"
            title="Contact us"
            description="Get in touch with our team"
            onPress={() => Linking.openURL('mailto:support@studymaze.app')}
          />
          <Divider />
          <ProfileMenuItem
            icon="star-outline"
            title="Rate the app"
            description="Enjoying Study Maze? Let us know"
            onPress={() => {}}
          />
        </View>

        <SectionLabel text="Legal" />
        <View style={[styles.menuCard, { backgroundColor: themeColors.surface }]}>
          <ProfileMenuItem
            icon="document-text-outline"
            title="Privacy policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <Divider />
          <ProfileMenuItem
            icon="reader-outline"
            title="Terms of service"
            onPress={() => navigation.navigate('TermsOfService')}
          />
        </View>

        <SectionLabel text="Danger zone" />
        <View style={[styles.menuCard, { backgroundColor: themeColors.surface }]}>
          <ProfileMenuItem
            icon="trash-outline"
            title="Delete account"
            description="Permanently delete your account and data"
            onPress={confirmDeleteAccount}
            titleStyle={{ color: COLORS.danger || '#D64545' }}
          />
        </View>

        <View style={[styles.aboutCard, { backgroundColor: themeColors.surface }]}>
          <Ionicons name="school-outline" size={22} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.aboutTitle, { color: themeColors.textPrimary }]}>Study Maze</Text>
            <Text style={[styles.aboutText, { color: themeColors.textSecondary }]}>Learn, play, and track your progress.</Text>
          </View>
          <Text style={[styles.versionText, { color: themeColors.textTertiary }]}>v{APP_VERSION}</Text>
        </View>
      </ScrollView>

      <Modal visible={passwordVisible} transparent animationType="fade" onRequestClose={() => setPasswordVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.passwordCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.passwordTitle, { color: themeColors.textPrimary }]}>Change password</Text>
            <Text style={[styles.passwordHint, { color: themeColors.textSecondary }]}>Choose a new password with at least 8 characters.</Text>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                placeholder="New password"
                placeholderTextColor={themeColors.textTertiary}
                selectionColor={themeColors.primaryText}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword((v) => !v)}>
                <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                placeholder="Confirm new password"
                placeholderTextColor={themeColors.textTertiary}
                selectionColor={themeColors.primaryText}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword((v) => !v)}>
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

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
    </View>
  );
}

function SectionLabel({ text }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{text}</Text>;
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.divider }]} />;
}

function SwitchRow({ icon, title, description, value, onValueChange }) {
  const { colors } = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={[styles.switchIconWrap, { backgroundColor: colors.backgroundTertiary }]}>
        <Ionicons name={icon} size={20} color={colors.primaryText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>{title}</Text>
        {!!description && <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: COLORS.primary }}
        thumbColor={COLORS.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  header: { minHeight: 58, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingTop: 10 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 18 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 20 },
  menuCard: { backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', ...SHADOWS.small },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.borderLight, marginLeft: 56 },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  switchIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  switchTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  switchDescription: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },

  aboutCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginTop: 20, ...SHADOWS.small },
  aboutTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  aboutText: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  versionText: { color: COLORS.textTertiary, fontSize: 12, fontWeight: '600' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(26,16,48,0.48)', padding: 22 },
  passwordCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 20, padding: 22, ...SHADOWS.large },
  passwordTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  passwordHint: { color: COLORS.textSecondary, fontSize: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  passwordInput: { flex: 1, height: 48, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.backgroundSecondary, borderRadius: 12, paddingHorizontal: 14, color: COLORS.textPrimary },
  eyeButton: { position: 'absolute', right: 12, height: 48, justifyContent: 'center' },
  passwordActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 12 },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12 },
  saveText: { color: COLORS.white, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
});
