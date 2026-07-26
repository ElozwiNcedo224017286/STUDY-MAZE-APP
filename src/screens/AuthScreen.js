import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen({ navigation }) {
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

  // A persisted Supabase session means we're already signed in — skip straight in.
  useEffect(() => {
    if (!booting && user) {
      navigation.replace(user.role === 'teacher' ? 'TeacherDashboard' : 'Hub');
    }
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
          setMsg('Account created! Check your email to confirm, then log in.');
          setMode('login');
          setBusy(false);
          return;
        }
        navigation.replace(u.role === 'teacher' ? 'TeacherDashboard' : 'Hub');
      } else {
        const u = await login(email, password);
        navigation.replace(u.role === 'teacher' ? 'TeacherDashboard' : 'Hub');
      }
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => setMode('login')}>
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Log In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, mode === 'register' && styles.tabActive]} onPress={() => setMode('register')}>
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Register</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="e.g. thabo@example.com" placeholderTextColor={colors.inkDim} />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={colors.inkDim} />

          {mode === 'register' && (
            <>
              <Text style={styles.label}>Display name</Text>
              <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="e.g. Thabo M" placeholderTextColor={colors.inkDim} />

              <Text style={styles.label}>Confirm password</Text>
              <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••••" placeholderTextColor={colors.inkDim} />

              <Text style={styles.label}>I am a:</Text>
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
                  <TextInput style={styles.input} value={teacherCode} onChangeText={setTeacherCode} placeholder="Provided by your school" placeholderTextColor={colors.inkDim} autoCapitalize="characters" />
                </>
              )}
            </>
          )}

          {!!msg && <Text style={styles.msg}>{msg}</Text>}

          <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={submit}>
            <Text style={styles.btnText}>{busy ? 'Please wait…' : mode === 'register' ? 'Create Account' : 'Log In'}</Text>
          </TouchableOpacity>

          <Text style={styles.note}>Your account is secured by Supabase Auth.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: colors.panelLight, borderWidth: 2, borderColor: colors.wallEdge,
    borderRadius: 16, padding: 22
  },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, padding: 10, borderRadius: 9, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center' },
  tabActive: { backgroundColor: colors.wall, borderColor: colors.mint },
  tabText: { color: colors.inkDim, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: colors.ink },
  label: { color: colors.inkDim, fontSize: 11, marginBottom: 5, marginTop: 4 },
  input: {
    backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 9,
    padding: 12, color: colors.ink, fontSize: 14, marginBottom: 10
  },
  msg: { color: colors.coral, fontSize: 12.5, marginBottom: 8 },
  btn: { backgroundColor: colors.mint, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#062B1F', fontWeight: '800', fontSize: 15 },
  note: { color: colors.inkDim, fontSize: 10, textAlign: 'center', marginTop: 14, lineHeight: 15 }
});
