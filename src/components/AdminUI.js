import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from './ScreenHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

// Scope each response to its owner and invalidate requests on blur or refresh.
export function useAdminResource(fetcher) {
  const { user } = useAuth();
  const request = useRef(0);
  const [state, setState] = useState({ owner: null, data: null, loading: true, error: '' });
  const allowed = user?.role === 'admin';
  const load = useCallback(async () => {
    const ticket = ++request.current;
    const owner = user?.id;
    setState({ owner, data: null, loading: true, error: '' });
    if (!allowed || !owner) {
      setState({ owner, data: null, loading: false, error: 'Admin access required.' });
      return;
    }
    try {
      const data = await fetcher();
      if (ticket === request.current) setState({ owner, data, loading: false, error: '' });
    } catch (error) {
      if (ticket === request.current) setState({ owner, data: null, loading: false, error: error.message || 'Could not load data.' });
    }
  }, [fetcher, allowed, user?.id]);
  useFocusEffect(useCallback(() => {
    load();
    return () => { request.current += 1; };
  }, [load]));
  return { ...state, data: allowed && state.owner === user?.id ? state.data : null,
    loading: allowed && (state.owner !== user?.id || state.loading), allowed, load };
}

export function AdminPage({ title, subtitle, resource, children, right }) {
  const insets = useSafeAreaInsets();
  return <View style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />
    <ScreenHeader title="Admin" titleHighlight={title} subtitle={subtitle} right={right} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}
      refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.load} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
      {!resource.allowed ? <Text style={styles.error}>Admin access required.</Text> : resource.loading ? <ActivityIndicator color={COLORS.primary} /> : resource.error ?
        <View style={styles.card}><Text style={styles.error}>{resource.error}</Text><AdminButton title="Retry" onPress={resource.load} /></View> : children}
    </ScrollView>
  </View>;
}

export function AdminButton({ title, onPress, disabled, secondary, danger }) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, danger && styles.danger, disabled && styles.disabled]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryText, danger && styles.dangerText]}>{title}</Text>
  </TouchableOpacity>;
}

export function Metric({ label, value }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value ?? '-'}</Text><Text style={styles.meta}>{label}</Text></View>;
}

export function dateLabel(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Not set';
}

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  body: { paddingHorizontal: 20, gap: 14, paddingTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 18, gap: 10, ...SHADOWS.small },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  text: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary },
  meta: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grow: { flex: 1 },
  metric: { flexGrow: 1, flexBasis: 90, backgroundColor: COLORS.primaryFaded, padding: 12, borderRadius: 12 },
  metricValue: { fontSize: 23, fontWeight: '900', color: COLORS.primary },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  secondary: { backgroundColor: COLORS.primarySoft },
  secondaryText: { color: COLORS.primary },
  danger: { backgroundColor: COLORS.errorLight },
  dangerText: { color: COLORS.error },
  disabled: { opacity: 0.5 },
  error: { fontSize: 14, color: COLORS.error, lineHeight: 21 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6 },
  input: { backgroundColor: COLORS.backgroundSecondary, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.textPrimary },
  selected: { backgroundColor: COLORS.primary },
  choice: { backgroundColor: COLORS.backgroundTertiary, borderRadius: 12, padding: 12 },
  choiceText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  selectedText: { color: COLORS.white },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  badge: { color: COLORS.primary, fontWeight: '700', fontSize: 12, backgroundColor: COLORS.primarySoft, padding: 8, borderRadius: 8, alignSelf: 'flex-start' },
});
