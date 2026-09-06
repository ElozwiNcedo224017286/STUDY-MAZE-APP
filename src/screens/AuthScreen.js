import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_IMAGE_WIDTH = SCREEN_WIDTH * 0.86;
const HERO_IMAGE_HEIGHT = HERO_IMAGE_WIDTH * (1024 / 1536);
const REGISTER_IMAGE_WIDTH = SCREEN_WIDTH * 0.9;
const REGISTER_IMAGE_HEIGHT = REGISTER_IMAGE_WIDTH * (925 / 1701);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { login, register, user, booting } = useAuth();
  const [mode, setMode] = useState(route?.params?.mode === 'register' ? 'register' : 'login');
  const [role, setRole] = useState('student');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [termsVisible, setTermsVisible] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const nameValid = displayName.trim().length > 1;
  const emailValid = EMAIL_RE.test(email.trim());

  useEffect(() => {
    if (!booting && user) navigation.replace('Main');
  }, [booting, user, navigation]);

  async function submit() {
    if (!termsAccepted) return;
    setMsg('');
    if (!email.trim() || !password) { setMsg('Enter an email and password.'); return; }
    setBusy(true);
    try {
      if (mode === 'register') {
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

  const termsModal = (
    <Modal visible={termsVisible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.modalBackdrop}>
        <View style={styles.termsCard}>
          <View style={styles.termsHeader}>
            <View style={styles.termsIcon}>
              <Ionicons name="document-text-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.termsHeaderCopy}>
              <Text style={styles.termsTitle}>Terms and conditions</Text>
              <Text style={styles.termsSubtitle}>Please review these before continuing.</Text>
            </View>
          </View>

          <ScrollView style={styles.termsScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.termsBody}>
              By using Study Maze, you agree to use the app for learning and to provide accurate account information. Keep your password private and do not share your account. Study Maze may update these terms or features as the service evolves.
            </Text>
            <Text style={styles.termsBody}>
              Your account activity and learning progress may be stored securely so we can provide games, rewards and class features. You can stop using the service at any time.
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.termsAgreeRow}
            activeOpacity={0.8}
            onPress={() => setTermsAccepted((accepted) => !accepted)}
          >
            <View style={[styles.termsCheckbox, termsAccepted && styles.termsCheckboxActive]}>
              {termsAccepted && <Ionicons name="checkmark" size={15} color={COLORS.white} />}
            </View>
            <Text style={styles.termsAgreeText}>I agree to the Terms and Conditions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.termsButton, !termsAccepted && styles.termsButtonDisabled]}
            disabled={!termsAccepted}
            onPress={() => setTermsVisible(false)}
            activeOpacity={0.9}
          >
            <Text style={styles.termsButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const tabsRow = (
    <View style={styles.tabs}>
      <TouchableOpacity style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => setMode('login')}>
        <Ionicons name="log-in-outline" size={16} color={mode === 'login' ? COLORS.primary : COLORS.textTertiary} />
        <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Log in</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tab, mode === 'register' && styles.tabActive]} onPress={() => setMode('register')}>
        <Ionicons name="person-outline" size={16} color={mode === 'register' ? COLORS.primary : COLORS.textTertiary} />
        <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Register</Text>
      </TouchableOpacity>
    </View>
  );

  // Both hero illustrations are mounted (invisibly) up front so switching between
  // Log in / Register never has to decode a fresh image the first time it's shown.
  const preloadImages = (
    <View style={styles.preload} pointerEvents="none">
      <Image source={require('../../assets/Artwork/login-student.png')} style={styles.preloadImg} />
      <Image source={require('../../assets/Artwork/register-students.png')} style={styles.preloadImg} />
    </View>
  );

  if (mode === 'register') {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar barStyle="dark-content" />
        <LinearGradient colors={[COLORS.backgroundSecondary, '#E4DBFA']} style={StyleSheet.absoluteFill} />
        {preloadImages}

        <View style={[styles.regHero, { height: insets.top + 300 }]}>
          <Image
            source={require('../../assets/Artwork/register-students.png')}
            style={styles.regImage}
            resizeMode="contain"
          />

          <View style={[styles.heroContent, { paddingTop: insets.top + 12 }]}>
            <View style={styles.heroBrand}>
              <View style={styles.logoWrap}>
                <Image source={require('../../assets/logo.png')} style={styles.logo} />
              </View>
              <View>
                <Text style={styles.wordmark}>
                  <Text style={styles.study}>Study</Text>
                  <Text style={styles.maze}>Maze</Text>
                </Text>
                <Text style={styles.heroTagline}>Play. Learn. Earn.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.regCard}>
          <View style={styles.stepBadgeRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Step 1 of 2</Text>
            </View>
          </View>

          <Text style={styles.regHeading}>Create your learning profile</Text>
          <Text style={styles.regSubtitle}>Join your class and turn study material into games.</Text>

          {tabsRow}

          <Text style={styles.label}>Display name</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Thabo M"
              placeholderTextColor={COLORS.textTertiary}
            />
            {nameValid && <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />}
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="thabo@example.com"
              placeholderTextColor={COLORS.textTertiary}
            />
            {emailValid && <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />}
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textTertiary}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Choose your role</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity style={[styles.roleCard, role === 'student' && styles.roleCardActive]} onPress={() => setRole('student')}>
              <View style={styles.roleIconWrap}>
                <Ionicons name="school-outline" size={22} color={COLORS.primary} />
                <View style={[styles.roleBadge, role === 'student' && styles.roleBadgeActive]}>
                  {role === 'student' && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                </View>
              </View>
              <Text style={[styles.roleLabel, role === 'student' && styles.roleLabelActive]}>Student</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.roleCard, role === 'teacher' && styles.roleCardActive]} onPress={() => setRole('teacher')}>
              <View style={styles.roleIconWrap}>
                <Ionicons name="easel-outline" size={22} color={COLORS.primary} />
                <View style={[styles.roleBadge, role === 'teacher' && styles.roleBadgeActive]}>
                  {role === 'teacher' && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                </View>
              </View>
              <Text style={[styles.roleLabel, role === 'teacher' && styles.roleLabelActive]}>Teacher</Text>
            </TouchableOpacity>
          </View>

          {role === 'teacher' && (
            <>
              <Text style={styles.label}>Teacher access code</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={teacherCode}
                  onChangeText={setTeacherCode}
                  placeholder="Provided by your school"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="characters"
                />
              </View>
            </>
          )}

          {!!msg && <Text style={styles.msg}>{msg}</Text>}

          <TouchableOpacity activeOpacity={0.9} disabled={busy} onPress={submit}>
            <LinearGradient
              colors={COLORS.gradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.ctaRow, busy && styles.ctaDisabled]}
            >
              <Text style={styles.ctaText}>{busy ? 'Please wait…' : 'Create account'}</Text>
              {!busy && <Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
            </LinearGradient>
          </TouchableOpacity>

          <View style={[styles.footerRow, { marginBottom: insets.bottom }]}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.footerText}>Securely powered by Supabase Auth</Text>
          </View>
        </View>
        {termsModal}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" />
      {preloadImages}

      <View style={styles.hero}>
        <LinearGradient colors={[COLORS.backgroundSecondary, '#E4DBFA']} style={StyleSheet.absoluteFill} />

        <Image
          source={require('../../assets/Artwork/login-student.png')}
          style={styles.heroImage}
          resizeMode="contain"
        />

        <Image source={require('../../assets/Artwork/icon-maze.png')} style={styles.cornerMaze} resizeMode="contain" />
        <Ionicons name="star" size={16} color={COLORS.accent} style={styles.cornerStar} />

        <View style={[styles.heroContent, { paddingTop: insets.top + 12 }]}>
          <View style={styles.heroBrand}>
            <View style={styles.logoWrap}>
              <Image source={require('../../assets/logo.png')} style={styles.logo} />
            </View>
            <View>
              <Text style={styles.wordmark}>
                <Text style={styles.study}>Study</Text>
                <Text style={styles.maze}>Maze</Text>
              </Text>
              <View style={styles.heroTaglineRow}>
                <Text style={styles.heroTagline}>Play. Learn. Earn.</Text>
                <Ionicons name="sparkles" size={12} color={COLORS.accent} style={{ marginLeft: 4 }} />
              </View>
            </View>
          </View>

          <View style={styles.cardsCol}>
            <View style={[styles.floatCard, styles.quizCard]}>
              <View style={styles.floatRow}>
                <View style={styles.quizBadge}>
                  <Ionicons name="help" size={14} color={COLORS.white} />
                </View>
                <Text style={styles.floatTitle}>Quiz Time</Text>
              </View>
              <View style={styles.floatLine} />
              <View style={styles.floatRow}>
                <Text style={styles.floatScore}>+50</Text>
                <Ionicons name="star" size={13} color={COLORS.accentDark} />
              </View>
            </View>

            <View style={[styles.floatCard, styles.streakCard]}>
              <View style={styles.floatRow}>
                <Ionicons name="flame" size={18} color="#F97316" />
                <View>
                  <Text style={styles.streakLabel}>Streak</Text>
                  <Text style={styles.streakValue}>7 days</Text>
                </View>
              </View>
              <View style={styles.streakTrack}>
                <View style={styles.streakFill} />
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={[styles.sheetContent, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Welcome back</Text>
            <Ionicons name="sparkles" size={20} color={COLORS.accent} />
          </View>
          <Text style={styles.subtitle}>Ready for your next challenge?</Text>

          {tabsRow}

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="thabo@example.com"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textTertiary}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => setMsg("Password reset isn't set up yet — ask your teacher for help.")}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {!!msg && <Text style={styles.msg}>{msg}</Text>}

          <TouchableOpacity activeOpacity={0.9} disabled={busy} onPress={submit}>
            <LinearGradient
              colors={COLORS.gradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.cta, busy && styles.ctaDisabled]}
            >
              <Text style={styles.ctaText}>{busy ? 'Please wait…' : 'Continue learning'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleBtn}
            activeOpacity={0.85}
            onPress={() => setMsg('Google sign-in is not set up yet.')}
          >
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text style={styles.googleText}>Google</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.footerText}>Securely powered by Supabase Auth</Text>
          </View>
        </View>
      </View>
      {termsModal}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  preload: { position: 'absolute', width: 0, height: 0, overflow: 'hidden' },
  preloadImg: { width: 1, height: 1 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 16, 48, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  termsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 22,
    ...SHADOWS.large,
  },
  termsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  termsIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  termsHeaderCopy: { flex: 1 },
  termsTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '900' },
  termsSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  termsScroll: { maxHeight: 190 },
  termsBody: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 14 },
  termsAgreeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 16 },
  termsCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  termsCheckboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  termsAgreeText: { flex: 1, color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  termsButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  termsButtonDisabled: { opacity: 0.45 },
  termsButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },

  hero: {
    flex: 1,
    minHeight: 170,
    overflow: 'hidden',
  },
  heroContent: {
    paddingHorizontal: 20,
  },
  heroBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  logo: { width: '100%', height: '100%' },
  wordmark: { fontSize: 22, letterSpacing: -0.5 },
  study: { color: COLORS.textPrimary, fontWeight: '900' },
  maze: { color: COLORS.primary, fontWeight: '900' },
  heroTaglineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  heroTagline: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },

  cornerMaze: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    opacity: 0.45,
    transform: [{ rotate: '18deg' }],
  },
  cornerStar: { position: 'absolute', top: 46, right: 74 },

  heroImage: {
    position: 'absolute',
    width: HERO_IMAGE_WIDTH,
    height: HERO_IMAGE_HEIGHT,
    right: -HERO_IMAGE_WIDTH * 0.06,
    bottom: -10,
  },

  cardsCol: { marginTop: 14 },
  floatCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 10,
    ...SHADOWS.medium,
  },
  quizCard: { width: 150 },
  streakCard: { width: 140, marginTop: 12, marginLeft: 20 },
  floatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quizBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  floatLine: { height: 6, borderRadius: 3, backgroundColor: COLORS.borderLight, marginTop: 8, marginBottom: 6 },
  floatScore: { fontSize: 13, fontWeight: '800', color: COLORS.accentDark },
  streakLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  streakValue: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  streakTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.borderLight, marginTop: 8, overflow: 'hidden' },
  streakFill: { width: '80%', height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },

  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    ...SHADOWS.large,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetContent: { paddingHorizontal: 24, paddingTop: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.5 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4, marginBottom: 18 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11 },
  tabActive: { backgroundColor: COLORS.white, ...SHADOWS.small },
  tabText: { color: COLORS.textTertiary, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: COLORS.primary },

  label: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 4, marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 11, color: COLORS.textPrimary, fontSize: 15 },

  forgotRow: { alignSelf: 'flex-end', marginTop: -2, marginBottom: 6 },
  forgotText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  msg: { color: COLORS.error, fontSize: 13, marginBottom: 6 },

  cta: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 4, ...SHADOWS.medium },
  ctaRow: {
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...SHADOWS.medium,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textTertiary, fontSize: 13 },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 12,
  },
  googleText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 15 },

  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  footerText: { color: COLORS.textTertiary, fontSize: 12 },

  regHero: { overflow: 'hidden' },
  regHeading: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 2,
  },
  regSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  regImage: {
    position: 'absolute',
    width: REGISTER_IMAGE_WIDTH,
    height: REGISTER_IMAGE_HEIGHT,
    left: (SCREEN_WIDTH - REGISTER_IMAGE_WIDTH) / 2,
    bottom: -10,
  },

  regCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    padding: 12,
    paddingHorizontal: 24,
    ...SHADOWS.large,
  },
  stepBadgeRow: { alignItems: 'flex-end', marginBottom: 4 },
  stepBadge: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stepBadgeText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },

  roleRow: { flexDirection: 'row', gap: 12, marginTop: 2, marginBottom: 2 },
  roleCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: 8,
    alignItems: 'center',
  },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  roleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  roleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadgeActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  roleLabelActive: { color: COLORS.primary },
});
