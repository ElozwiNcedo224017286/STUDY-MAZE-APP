import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import BrandRow, { STUDENT_TAGLINE } from '../components/BrandRow';

export default function AuthScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login, register, user, booting } = useAuth();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('student');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!booting && user) navigation.replace('Main');
  }, [booting, user, navigation]);

  async function submit() {
    setMsg('');
    if (!email.trim() || !password) { setMsg('Enter an email and password.'); return; }
    setBusy(true);
    try {
      if (mode === 'register') {
        if (password !== confirm) { setMsg('Passwords do not match.'); setBusy(false); return; }
        const { user: u, needsConfirmation } = await register(email, password, displayName, role, teacherCode.trim());
        if (needsConfirmation) {
          setMsg('Account created. Check your email to confirm, then log in.');
          setMode('login');
          setBusy(false);
          return;
        }
        navigation.replace('Main');
      } else {
        await login(email, password);
        navigation.replace('Main');
      }
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <BrandRow tagline={STUDENT_TAGLINE} style={{ marginBottom: 28 }} />

        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => setMode('login')}>
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, mode === 'register' && styles.tabActive]} onPress={() => setMode('register')}>
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Register</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="e.g. thabo@example.com" placeholderTextColor={COLORS.textTertiary} />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={COLORS.textTertiary} />

          {mode === 'register' && (
            <>
              <Text style={styles.label}>Display name</Text>
              <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="e.g. Thabo M" placeholderTextColor={COLORS.textTertiary} />

              <Text style={styles.label}>Confirm password</Text>
              <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••••" placeholderTextColor={COLORS.textTertiary} />

              <Text style={styles.label}>I am a</Text>
              <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, role === 'student' && styles.tabActive]} onPress={() => setRole('student')}>
                  <Text style={[styles.tabText, role === 'student' && styles.tabTextActive]}>Student</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, role === 'teacher' && styles.tabActive]} onPress={() => setRole('teacher')}>
                  <Text style={[styles.tabText, role === 'teacher' && styles.tabTextActive]}>Teacher</Text>
                </TouchableOpacity>
              </View>

              {role === 'teacher' && (
                <>
                  <Text style={styles.label}>Teacher access code</Text>
                  <TextInput style={styles.input} value={teacherCode} onChangeText={setTeacherCode} placeholder="Provided by your school" placeholderTextColor={COLORS.textTertiary} autoCapitalize="characters" />
                </>
              )}
            </>
          )}

          {!!msg && <Text style={styles.msg}>{msg}</Text>}

          <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={submit}>
            <Text style={styles.btnText}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}</Text>
          </TouchableOpacity>
          <Text style={styles.note}>Your account is secured by Supabase Auth.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 22,
    ...SHADOWS.medium,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.white, ...SHADOWS.small },
  tabText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: COLORS.primary },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 13,
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 10,
  },
  msg: { color: COLORS.error, fontSize: 13, marginBottom: 8 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  note: { color: COLORS.textTertiary, fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 16 },
});
