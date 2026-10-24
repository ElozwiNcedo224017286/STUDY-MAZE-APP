import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { getPendingRedemption, submitRewardRedemption } from '../api/rewardRedemption';

const statusLabel = { pending: 'Pending', fulfilled: 'Fulfilled', cancelled: 'Cancelled' };
const dateLabel = (value) => new Date(value).toLocaleString();

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [state, setState] = useState({ owner: null, data: null, loading: true, error: '' });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const request = useRef(0);
  const lock = useRef(false);
  const currentUser = useRef(user);
  currentUser.current = user;
  const current = state.owner === user?.id;
  const data = current ? state.data : null;
  const loading = !current || state.loading;

  const load = useCallback(async () => {
    const ticket = ++request.current;
    const owner = user?.id;
    setState({ owner, data: null, loading: true, error: '' });
    if (!owner || user?.role !== 'student') {
      setState({ owner, data: null, loading: false, error: 'Sign in as a student to access Rewards.' });
      return;
    }
    try {
      const retry = await getPendingRedemption(owner);
      if (ticket === request.current) setPending(retry);
      const [balance, rewards, history] = await Promise.all([api.getCoinBalance(), api.getRewards(), api.getMyRedemptions()]);
      if (ticket === request.current) setState({ owner, data: { balance, rewards, history }, loading: false, error: '' });
    } catch (error) {
      if (ticket === request.current) setState({ owner, data: null, loading: false, error: error.message || 'Could not load Rewards.' });
    }
  }, [user?.id, user?.role]);

  useFocusEffect(useCallback(() => {
    setNotice(''); setActionError(''); setPending(null);
    load();
    return () => { request.current += 1; };
  }, [load]));

  async function redeem(rewardId) {
    if (lock.current || user?.role !== 'student' || !user?.id) return;
    lock.current = true; setBusy(true); setActionError(''); setNotice('');
    const owner = user.id;
    const isCurrent = () => currentUser.current?.id === owner && currentUser.current?.role === 'student';
    try {
      await submitRewardRedemption(owner, rewardId, isCurrent);
      if (isCurrent()) setNotice('Redemption confirmed. Check its status in your history.');
    } catch (error) {
      if (isCurrent()) setActionError(error.message || 'Could not confirm redemption. Retry the same request.');
    } finally {
      // Re-read all authoritative values, including after uncertain responses.
      if (isCurrent()) await load();
      lock.current = false; setBusy(false);
    }
  }

  return <View style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />
    <ScreenHeader title="Rewards" titleHighlight="Shop" subtitle="Use your trusted coins to redeem Study Maze rewards." />
    <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { if (!lock.current) load(); }} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
      {!!notice && <Text style={styles.toast}>{notice}</Text>}
      {!!actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
      {current && pending && <View style={styles.historyCard}>
        <Text style={styles.name}>Confirm your previous redemption</Text>
        <Text style={styles.partner}>Retry safely to confirm the result before choosing another reward.</Text>
        <TouchableOpacity accessibilityRole="button" disabled={busy} style={[styles.redeem, busy && styles.redeemOff]} onPress={() => redeem(pending.rewardId)}>
          <Text style={styles.redeemText}>{busy ? 'Confirming...' : 'Retry redemption'}</Text>
        </TouchableOpacity>
      </View>}
      {loading ? <ActivityIndicator color={COLORS.primary} /> : state.error ? <View style={styles.historyCard}>
        <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.redeem} onPress={load} disabled={busy}><Text style={styles.redeemText}>Refresh</Text></TouchableOpacity>
      </View> : data && <>
        <LinearGradient colors={COLORS.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balance}>
          <Text style={styles.balanceLabel}>Available coins</Text><Text style={styles.balanceValue}>{data.balance.toLocaleString()}</Text>
          <Text style={styles.balanceHint}>Your trusted spendable balance. Redemptions are verified by Study Maze.</Text>
        </LinearGradient>
        {!data.rewards.length && <View style={styles.historyCard}><Text style={styles.name}>No rewards available</Text><Text style={styles.partner}>Check back for new rewards.</Text></View>}
        {data.rewards.map((reward) => {
          const outOfStock = reward.stock_quantity === 0;
          const available = reward.available === true && !outOfStock;
          const affordable = data.balance >= reward.coin_cost;
          const disabled = busy || !!pending || !available || !affordable;
          return <View key={reward.id} style={styles.row}>
            <View style={styles.iconWrap}><Ionicons name="gift-outline" size={24} color={COLORS.primary} /></View>
            <View style={styles.info}>
              <Text style={styles.name}>{reward.name}</Text>
              {!!reward.description && <Text style={styles.partner}>{reward.description}</Text>}
              <Text style={styles.partner}>{reward.coin_cost} coins</Text>
              <Text style={styles.partner}>{outOfStock ? 'Out of stock' : !available ? 'Unavailable' : reward.stock_quantity === null ? 'Available' : `${reward.stock_quantity} available`}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={() => redeem(reward.id)} style={[styles.redeem, disabled && styles.redeemOff]}>
              <Text style={[styles.redeemText, disabled && styles.redeemTextOff]}>{outOfStock ? 'Sold out' : !available ? 'Unavailable' : !affordable ? 'Earn more' : busy ? 'Working...' : 'Redeem'}</Text>
            </TouchableOpacity>
          </View>;
        })}
        <Text style={styles.sectionTitle}>Your redemptions</Text>
        {!data.history.length ? <View style={styles.historyCard}><Text style={styles.partner}>No redemptions yet.</Text></View> : data.history.map((row) =>
          <View key={row.id} style={styles.historyCard}>
            <Text style={styles.name}>{row.reward_name}</Text>
            <Text style={styles.partner}>{row.coin_cost} coins / {statusLabel[row.status] || row.status}</Text>
            <Text style={styles.partner}>Requested: {dateLabel(row.created_at)}</Text>
            {!!row.fulfilled_at && <Text style={styles.partner}>Fulfilled: {dateLabel(row.fulfilled_at)}</Text>}
            {!!row.cancelled_at && <Text style={styles.partner}>Cancelled: {dateLabel(row.cancelled_at)}</Text>}
          </View>)}
      </>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  balance: { borderRadius: 20, padding: 20, marginBottom: 16, ...SHADOWS.medium },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 12 },
  balanceValue: { color: COLORS.white, fontSize: 36, fontWeight: '900', marginTop: 4 },
  balanceHint: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 8, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  partner: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  redeem: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  redeemOff: { backgroundColor: COLORS.backgroundTertiary },
  redeemText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  redeemTextOff: { color: COLORS.textTertiary },
  historyCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, gap: 8, ...SHADOWS.small },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 12, marginBottom: 12 },
  error: { color: COLORS.error, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  toast: { color: COLORS.success, textAlign: 'center', marginTop: 8, fontWeight: '600' },
});
