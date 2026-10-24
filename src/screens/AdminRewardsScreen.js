import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AdminPage, AdminButton, dateLabel, styles, useAdminResource } from '../components/AdminUI';
import RewardEditor from '../components/RewardEditor';

const loadRewards = async () => {
  const [rewards, redemptions] = await Promise.all([api.adminListRewards(), api.adminListRedemptions()]);
  return { rewards, redemptions };
};
const statusLabel = { pending: 'Pending', fulfilled: 'Fulfilled', cancelled: 'Cancelled' };

export default function AdminRewardsScreen() {
  const { user } = useAuth();
  const resource = useAdminResource(loadRewards);
  const [section, setSection] = useState('catalogue');
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const scope = useRef(0);
  const currentUser = useRef(user);
  currentUser.current = user;
  useFocusEffect(useCallback(() => {
    scope.current += 1; setEditor(null); setError(''); setMessage('');
    return () => { scope.current += 1; };
  }, [user?.id]));

  function confirmTransition(row, action) {
    if (lock.current || user?.role !== 'admin' || row.status !== 'pending') return;
    const ticket = scope.current;
    const owner = user.id;
    const current = () => ticket === scope.current && currentUser.current?.id === owner && currentUser.current?.role === 'admin';
    Alert.alert(action === 'fulfill' ? 'Fulfill redemption?' : 'Cancel redemption?',
      `${row.reward_name} for ${row.display_name}\n\n${action === 'fulfill' ? 'Confirm the reward has been provided. This cannot be reversed.' : 'Cancellation refunds coins and restores tracked stock. This cannot be reversed.'}`,
      [{ text: 'Keep pending', style: 'cancel' }, { text: action === 'fulfill' ? 'Fulfill' : 'Cancel redemption', style: action === 'cancel' ? 'destructive' : 'default',
        onPress: async () => {
          if (lock.current || !current()) return;
          lock.current = true; setBusy(true); setError(''); setMessage('');
          try {
            await api.adminTransitionRedemption(row.id, action);
            if (current()) setMessage(action === 'fulfill' ? 'Redemption fulfilled.' : 'Redemption cancelled.');
          } catch (failure) {
            if (current()) setError(`${failure.message || 'Could not confirm the action.'} Refresh to check its current status before retrying.`);
          } finally {
            if (current()) await resource.load();
            lock.current = false; setBusy(false);
          }
        } }]);
  }

  return <AdminPage title="Rewards" subtitle="Manage rewards and student redemptions" resource={resource}>
    {!!message && <Text style={styles.text}>{message}</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {editor ? <RewardEditor key={editor.reward?.id || 'new'} rewardId={editor.reward?.id ?? null} initial={editor.reward}
      onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setMessage('Reward saved.'); resource.load(); }} /> : <>
      <View style={styles.wrap}>{[['catalogue', 'Catalogue'], ['redemptions', 'Redemptions']].map(([key, label]) =>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: section === key }} key={key}
          disabled={busy} onPress={() => setSection(key)} style={[styles.choice, section === key && styles.selected]}>
          <Text style={[styles.choiceText, section === key && styles.selectedText]}>{label}</Text>
        </TouchableOpacity>)}</View>
      {section === 'catalogue' ? <>
        <AdminButton title="Create reward" disabled={busy} onPress={() => { setMessage(''); setError(''); setEditor({ reward: null }); }} />
        {!resource.data?.rewards.length ? <View style={styles.card}><Text style={styles.title}>No rewards yet</Text><Text style={styles.text}>Create a reward for students to redeem with trusted coins.</Text></View> :
          resource.data.rewards.map((row) => <View key={row.id} style={styles.card}>
            <Text style={styles.title}>{row.name}</Text>
            {!!row.description && <Text style={styles.text}>{row.description}</Text>}
            <Text style={styles.badge}>{row.is_enabled ? 'Enabled' : 'Disabled'}</Text>
            <Text style={styles.text}>{row.coin_cost} coins / {row.stock_quantity === null ? 'Unlimited stock' : `${row.stock_quantity} in stock`}</Text>
            <Text style={styles.meta}>{row.pending_redemptions} pending / {row.fulfilled_redemptions} fulfilled</Text>
            <AdminButton title="Edit reward" secondary disabled={busy} onPress={() => setEditor({ reward: row })} />
          </View>)}
      </> : <>
        {!resource.data?.redemptions.length ? <View style={styles.card}><Text style={styles.title}>No redemptions yet</Text><Text style={styles.text}>Student requests will appear here.</Text></View> :
          resource.data.redemptions.map((row) => <View key={row.id} style={styles.card}>
            <Text style={styles.title}>{row.reward_name}</Text>
            <Text style={styles.text}>{row.display_name}</Text>
            <Text style={styles.badge}>{statusLabel[row.status] || row.status}</Text>
            <Text style={styles.meta}>{row.coin_cost} coins / Requested: {dateLabel(row.created_at)}</Text>
            {!!row.fulfilled_at && <Text style={styles.meta}>Fulfilled: {dateLabel(row.fulfilled_at)}</Text>}
            {!!row.cancelled_at && <Text style={styles.meta}>Cancelled: {dateLabel(row.cancelled_at)}</Text>}
            {row.status === 'pending' && <View style={styles.wrap}>
              <AdminButton title="Fulfill" disabled={busy} onPress={() => confirmTransition(row, 'fulfill')} />
              <AdminButton title="Cancel" danger disabled={busy} onPress={() => confirmTransition(row, 'cancel')} />
            </View>}
          </View>)}
      </>}
    </>}
  </AdminPage>;
}
