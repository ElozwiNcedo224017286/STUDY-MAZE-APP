import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import ProfileSection from '../components/ProfileSection';
import ProfileMenuItem from '../components/ProfileMenuItem';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const isTeacher = user?.role === 'teacher';

  async function handleLogout() {
    await logout();
    navigation.getParent()?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] })
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />
      <ScreenHeader title="Your" titleHighlight="Profile" subtitle={isTeacher ? 'Teacher account' : 'Student account'} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Image source={require('../../assets/logo.png')} style={styles.avatar} />
          <Text style={styles.name}>{user?.username || 'Player'}</Text>
          <Text style={styles.role}>{isTeacher ? 'Teacher' : 'Student'} · {user?.email}</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user?.coins ?? 0}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user?.highScore ?? 0}</Text>
              <Text style={styles.statLabel}>High score</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user?.unlockedLevel || 1}</Text>
              <Text style={styles.statLabel}>Maze level</Text>
            </View>
          </View>
        </View>

        <ProfileSection title="Shortcuts">
          {isTeacher ? (
            <>
              <ProfileMenuItem icon="create-outline" title="Quiz Studio" description="Create and publish questions" onPress={() => navigation.navigate('Studio')} />
              <ProfileMenuItem icon="people-outline" title="Class board" description="See who is earning coins" onPress={() => navigation.navigate('Class')} />
              <ProfileMenuItem icon="document-text-outline" title="Study notes" description="Post summaries for students" onPress={() => navigation.navigate('Notes')} />
            </>
          ) : (
            <>
              <ProfileMenuItem icon="game-controller-outline" title="Play Zone" description="Maze, Quiz Rush, Memory Flip" onPress={() => navigation.navigate('Play')} />
              <ProfileMenuItem icon="book-outline" title="Learn Hub" description="Teacher notes and revision" onPress={() => navigation.navigate('Learn')} />
              <ProfileMenuItem icon="gift-outline" title="Rewards" description="Unlock partner vouchers with coins" onPress={() => navigation.navigate('Rewards')} />
            </>
          )}
        </ProfileSection>

        <ProfileSection title="Account">
          <ProfileMenuItem icon="shield-checkmark-outline" title="Secured with Supabase Auth" description="Email and password sign-in" />
          <ProfileMenuItem icon="log-out-outline" title="Log out" description="Sign out of Study Maze" danger onPress={handleLogout} />
        </ProfileSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  avatar: { width: 88, height: 88, borderRadius: 22, marginBottom: 14 },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  role: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  stats: { flexDirection: 'row', marginTop: 18, width: '100%' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontWeight: '600' },
});
