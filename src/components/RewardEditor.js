import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AdminButton, styles } from './AdminUI';

export default function RewardEditor({ rewardId = null, initial, onClose, onSaved }) {
  const { user } = useAuth();
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [cost, setCost] = useState(initial?.coin_cost == null ? '' : String(initial.coin_cost));
  const [stock, setStock] = useState(initial?.stock_quantity == null ? '' : String(initial.stock_quantity));
  const [enabled, setEnabled] = useState(initial?.is_enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const scope = useRef(0);
  const currentUser = useRef(user);
  currentUser.current = user;
  useFocusEffect(useCallback(() => {
    scope.current += 1;
    return () => { scope.current += 1; };
  }, [user?.id]));

  async function save() {
    if (lock.current || uncertain || user?.role !== 'admin') return;
    if (!name.trim() || !/^[0-9]+$/.test(cost.trim()) || Number(cost) <= 0 || Number(cost) > 2147483647 ||
        (stock.trim() !== '' && (!/^[0-9]+$/.test(stock.trim()) || Number(stock) > 2147483647))) {
      setError('Enter a name, a positive whole-number cost, and nonnegative stock (or leave stock blank for unlimited).');
      return;
    }
    lock.current = true; setBusy(true); setError('');
    const ticket = scope.current;
    const owner = user.id;
    const current = () => ticket === scope.current && currentUser.current?.id === owner && currentUser.current?.role === 'admin';
    try {
      await api.adminSaveReward({ id: rewardId, name: name.trim(), description: description.trim(),
        coin_cost: Number(cost), is_enabled: enabled, stock_quantity: stock.trim() === '' ? null : Number(stock) });
      if (current()) onSaved();
    } catch (failure) {
      if (current()) {
        setError(`${failure.message || 'Could not save reward.'} Return to the catalogue and refresh before trying again.`);
        // Creation has no request-ID contract: do not repeat an uncertain save.
        setUncertain(true);
      }
    } finally {
      lock.current = false;
      if (current()) setBusy(false);
    }
  }
  return <View style={styles.card}>
    <Text style={styles.title}>{rewardId ? 'Edit reward' : 'Create reward'}</Text>
    <Text style={styles.label}>Name</Text>
    <TextInput accessibilityLabel="Reward name" style={styles.input} value={name} onChangeText={setName} editable={!busy} />
    <Text style={styles.label}>Description</Text>
    <TextInput accessibilityLabel="Reward description" style={styles.input} value={description} onChangeText={setDescription} multiline editable={!busy} />
    <Text style={styles.label}>Coin cost</Text>
    <TextInput accessibilityLabel="Coin cost" style={styles.input} value={cost} onChangeText={setCost} keyboardType="number-pad" editable={!busy} />
    <Text style={styles.label}>Stock quantity</Text>
    <TextInput accessibilityLabel="Stock quantity, blank for unlimited" style={styles.input} value={stock} onChangeText={setStock} keyboardType="number-pad" editable={!busy} />
    <Text style={styles.meta}>Leave stock blank for unlimited availability. Zero means out of stock.</Text>
    <View style={styles.row}><Text style={[styles.label, styles.grow]}>Enabled</Text><Switch accessibilityLabel="Reward enabled" value={enabled} onValueChange={setEnabled} disabled={busy} /></View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <AdminButton title={busy ? 'Saving...' : 'Save reward'} onPress={save} disabled={busy || uncertain} />
    <AdminButton title="Back to catalogue" secondary onPress={onClose} disabled={busy} />
  </View>;
}
