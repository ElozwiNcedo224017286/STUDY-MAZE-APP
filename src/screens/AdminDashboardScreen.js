import React, { useRef, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import { AdminPage, AdminButton, Metric, dateLabel, styles, useAdminResource } from '../components/AdminUI';

export default function AdminDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const resource = useAdminResource(api.adminGetOverview);
  const overview = resource.data;
  const logoutLock = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false);
  async function handleLogout() {
    if (logoutLock.current) return;
    logoutLock.current = true;
    setLoggingOut(true);
    try {
      await logout();
      navigation.getParent()?.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] }));
    } catch (error) { Alert.alert('Could not log out', error.message); }
    finally { logoutLock.current = false; setLoggingOut(false); }
  }
  return <AdminPage title="Overview" subtitle="Your Study Maze community at a glance" resource={resource}
    right={<AdminButton title={loggingOut ? 'Signing out...' : 'Log out'} secondary disabled={loggingOut} onPress={handleLogout} />}>
    <View style={styles.card}>
      <View style={styles.row}><Ionicons name="shield-checkmark" size={28} color={COLORS.primary} />
        <View style={styles.grow}><Text style={styles.title}>{user?.displayName || user?.username || 'Admin'}</Text><Text style={styles.meta}>Study Maze Admin</Text></View></View>
    </View>
    {overview && <>
      <View style={styles.wrap}><Metric label="Students" value={overview.student_count} /><Metric label="Teachers" value={overview.teacher_count} /><Metric label="Classes" value={overview.class_count} /></View>
      <View style={styles.card}>
        <Text style={styles.title}>Active Challenge</Text>
        <Text style={styles.meta}>{overview.active_challenge_count ?? '-'} active challenges</Text>
        {overview.active_challenge_id ? <>
          <Text style={styles.title}>{overview.active_challenge_title}</Text>
          <Text style={styles.text}>{dateLabel(overview.active_challenge_starts_at)} - {dateLabel(overview.active_challenge_ends_at)}</Text>
          <View style={styles.wrap}><Metric label="Eligible students" value={overview.eligible_student_count} /><Metric label="Participating" value={overview.participating_student_count} /><Metric label="Trusted XP" value={overview.challenge_total_xp} /></View>
        </> : <Text style={styles.text}>No active challenge. Manage drafts in Challenges.</Text>}
      </View>
    </>}
  </AdminPage>;
}
