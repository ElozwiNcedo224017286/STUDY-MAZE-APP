import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import ProfileSection from '../components/ProfileSection';
import ProfileMenuItem from '../components/ProfileMenuItem';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const TOTAL_MAZE_LEVELS = 3;

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [notesCount, setNotesCount] = useState(0);
  const [editVisible, setEditVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const { materials } = await (isTeacher ? api.getStudyMaterials() : api.getPublishedNotes());
      setNotesCount((materials || []).length);
    } catch {
      /* keep last good state */
    }
  }, [isTeacher]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const currentLevel = Math.min(user?.unlockedLevel || 1, TOTAL_MAZE_LEVELS);
  const levelsCleared = Math.max(0, currentLevel - 1);
  const mazePercent = Math.round((levelsCleared / TOTAL_MAZE_LEVELS) * 100);
  const streakDays = user?.streakDays ?? 0;
  const gamesPlayed = user?.gamesPlayed ?? 0;

  const achievements = [
    { key: 'maze', label: 'Maze Master', image: require('../../assets/Artwork/icon-maze.png'), unlocked: levelsCleared >= TOTAL_MAZE_LEVELS },
    { key: 'quiz', label: 'Quiz Star', image: require('../../assets/Artwork/icon-scoreboard.png'), unlocked: (user?.coins ?? 0) > 0 },
    { key: 'streak', label: '7 Day Streak', image: require('../../assets/Artwork/badge-streak.png'), unlocked: streakDays >= 7 },
  ];

  async function handleLogout() {
    await logout();
    navigation.getParent()?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] })
    );
  }

  function openEdit() {
    setNameInput(user?.username || '');
    setEditVisible(true);
  }

  async function saveEdit() {
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      await api.updateProfile(nameInput);
      await refreshUser();
      setEditVisible(false);
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
    setSaving(false);
  }

  async function uploadProfileImage() {
    if (uploadingImage) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
      multiple: false
    });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingImage(true);
    try {
      await api.uploadProfileImage(result.assets[0]);
      await refreshUser();
    } catch (e) {
      Alert.alert('Could not upload photo', e.message);
    } finally {
      setUploadingImage(false);
    }
  }

  async function openNotifications() {
    setNotificationsVisible(true);
    setNotificationsLoading(true);
    try {
      setNotifications(await api.getNotifications());
    } catch (e) {
      Alert.alert('Could not load notifications', e.message);
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function markNotificationRead(notification) {
    if (notification.read_at) return;
    try {
      await api.markNotificationRead(notification.id);
      setNotifications((items) => items.map((item) => item.id === notification.id
        ? { ...item, read_at: new Date().toISOString() }
        : item));
    } catch (e) {
      Alert.alert('Could not update notification', e.message);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerSide}>
          <View style={styles.brandRow}>
            <View style={styles.brandLogoWrap}>
              <Image source={require('../../assets/logo.png')} style={styles.brandLogo} />
            </View>
            <Text style={styles.brandText}>
              <Text style={styles.brandStudy}>Study</Text>
              <Text style={styles.brandMaze}>Maze</Text>
            </Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
          <TouchableOpacity
            style={styles.settingsBtn}
            activeOpacity={0.75}
            onPress={() => Alert.alert('Coming soon', 'Settings aren\'t available yet.')}
          >
            <Ionicons name="settings-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={COLORS.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Ionicons name="star" size={18} color="rgba(255,255,255,0.35)" style={styles.decorStarOne} />
          <Ionicons name="square" size={12} color="rgba(255,255,255,0.3)" style={styles.decorSquare} />
          <Ionicons name="school" size={30} color="rgba(255,255,255,0.35)" style={styles.decorSchool} />

          <View style={styles.avatarWrap}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={48} color={COLORS.white} />
            )}
            <TouchableOpacity
              style={styles.cameraBtn}
              activeOpacity={0.8}
              onPress={uploadProfileImage}
            >
              <Ionicons name={uploadingImage ? 'hourglass-outline' : 'camera'} size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{user?.username || 'Player'}</Text>
          <Text style={styles.role}>{isTeacher ? 'Teacher' : 'Student'}</Text>

          <TouchableOpacity style={styles.editBtn} activeOpacity={0.85} onPress={openEdit}>
            <Text style={styles.editBtnText}>Edit profile</Text>
          </TouchableOpacity>

          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color={COLORS.accent} />
              <Text style={styles.statText}>Level {currentLevel}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="flame" size={16} color="#FB923C" />
              <Text style={styles.statText}>{streakDays} day streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statCoin}>🪙</Text>
              <Text style={styles.statText}>{(user?.coins ?? 0).toLocaleString()} coins</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>Learning progress</Text>
              <View style={styles.progressLevelRow}>
                <View style={styles.progressBadge}>
                  <Ionicons name="star" size={16} color={COLORS.white} />
                </View>
                <Text style={styles.progressLevelText}>Level {currentLevel}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${mazePercent}%` }]} />
              </View>
              <Text style={styles.progressCaption}>{levelsCleared} of {TOTAL_MAZE_LEVELS} maze levels cleared</Text>
            </View>
            <Image source={require('../../assets/Artwork/icon-maze.png')} style={styles.progressIcon} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.achievementsHeader}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <TouchableOpacity onPress={() => Alert.alert('Coming soon', 'A full achievements list isn\'t available yet.')}>
            <View style={styles.viewAllRow}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.achievementsRow}>
          {achievements.map((a) => (
            <View key={a.key} style={styles.achievementCard}>
              <Image
                source={a.image}
                style={[styles.achievementImage, !a.unlocked && styles.achievementImageLocked]}
                resizeMode="contain"
              />
              <Text style={[styles.achievementLabel, !a.unlocked && styles.achievementLabelLocked]}>{a.label}</Text>
            </View>
          ))}
        </View>

        <ProfileSection title="My activity">
          <ProfileMenuItem
            icon="book-outline"
            title="Notes"
            description={`${notesCount} note${notesCount === 1 ? '' : 's'}`}
            onPress={() => navigation.navigate(isTeacher ? 'Notes' : 'Learn')}
          />
          <ProfileMenuItem
            icon="game-controller-outline"
            title="Games completed"
            description={`${gamesPlayed} game${gamesPlayed === 1 ? '' : 's'}`}
            onPress={() => navigation.navigate(isTeacher ? 'Studio' : 'Play')}
          />
          <ProfileMenuItem
            icon="map-outline"
            title="Maze levels cleared"
            description={`${levelsCleared} of ${TOTAL_MAZE_LEVELS}`}
            onPress={() => navigation.getParent()?.navigate('MazeLevels')}
          />
        </ProfileSection>

        <ProfileSection title="Account">
          <ProfileMenuItem
            icon="person-outline"
            title="Personal details"
            description={user?.email}
            onPress={() => Alert.alert('Personal details', `Name: ${user?.username || '—'}\nEmail: ${user?.email || '—'}\nRole: ${isTeacher ? 'Teacher' : 'Student'}`)}
          />
          <ProfileMenuItem
            icon="notifications-outline"
            title="Notifications"
            description="View system and account messages"
            onPress={openNotifications}
          />
          <ProfileMenuItem
            icon="help-circle-outline"
            title="Help & support"
            onPress={() => Alert.alert('Help & support', 'Need a hand? Reach out to your teacher or school admin for now.')}
          />
        </ProfileSection>

        <ProfileSection>
          <ProfileMenuItem icon="log-out-outline" title="Log out" description="Sign out of Study Maze" danger onPress={handleLogout} />
        </ProfileSection>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit profile</Text>
            <Text style={styles.modalLabel}>Display name</Text>
            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your name"
              placeholderTextColor={COLORS.textTertiary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, saving && { opacity: 0.6 }]} disabled={saving} onPress={saveEdit}>
                <Text style={styles.modalSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={notificationsVisible} transparent animationType="slide" onRequestClose={() => setNotificationsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.notificationsCard}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            {notificationsLoading ? (
              <Text style={styles.emptyNotifications}>Loading notifications...</Text>
            ) : notifications.length === 0 ? (
              <Text style={styles.emptyNotifications}>You have no notifications yet.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {notifications.map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={[styles.notificationItem, !notification.read_at && styles.notificationUnread]}
                    onPress={() => markNotificationRead(notification)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={notification.category === 'earnings' ? 'cash-outline' : notification.category === 'announcement' ? 'megaphone-outline' : 'notifications-outline'}
                      size={20}
                      color={COLORS.primary}
                    />
                    <View style={styles.notificationCopy}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>
                      <Text style={styles.notificationDate}>{new Date(notification.created_at).toLocaleDateString()}</Text>
                    </View>
                    {!notification.read_at && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerSide: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandLogoWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
    ...SHADOWS.small,
  },
  brandLogo: { width: '100%', height: '100%' },
  brandText: { fontSize: 17, letterSpacing: -0.4 },
  brandStudy: { color: COLORS.textPrimary, fontWeight: '900' },
  brandMaze: { color: COLORS.primary, fontWeight: '900' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },

  body: { paddingHorizontal: 20, paddingBottom: 4 },

  hero: {
    borderRadius: 26,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 18,
    ...SHADOWS.medium,
  },
  decorStarOne: { position: 'absolute', top: 18, left: 24 },
  decorSquare: { position: 'absolute', top: 46, right: 40, transform: [{ rotate: '20deg' }] },
  decorSchool: { position: 'absolute', top: 20, right: 20 },

  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  cameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  name: { color: COLORS.white, fontSize: 21, fontWeight: '800', marginTop: 14 },
  role: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  editBtn: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  editBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 18,
    width: '100%',
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.25)' },
  statText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  statCoin: { fontSize: 13 },

  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    ...SHADOWS.small,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center' },
  progressTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  progressLevelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLevelText: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.backgroundTertiary, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressCaption: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, fontWeight: '600' },
  progressIcon: { width: 56, height: 56, marginLeft: 12 },

  achievementsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  viewAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  achievementsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  achievementCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  achievementImage: { width: 48, height: 48, marginBottom: 8 },
  achievementImageLocked: { opacity: 0.3 },
  achievementLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  achievementLabelLocked: { color: COLORS.textTertiary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 22, width: '100%', ...SHADOWS.large },
  notificationsCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, width: '100%', maxHeight: '78%', ...SHADOWS.large },
  notificationsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emptyNotifications: { color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 28, fontSize: 13 },
  notificationItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: 10 },
  notificationUnread: { backgroundColor: COLORS.backgroundWarm },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  notificationMessage: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  notificationDate: { color: COLORS.textTertiary, fontSize: 10, marginTop: 5 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 6 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 14 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  modalInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  modalCancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  modalSave: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  modalSaveText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
});
