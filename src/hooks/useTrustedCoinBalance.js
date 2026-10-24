import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

// A wallet counter refreshes independently of the rest of its screen.
export default function useTrustedCoinBalance() {
  const { user } = useAuth();
  const requestRef = useRef(0);
  const [state, setState] = useState({ ownerId: null, balance: null });
  const ownerId = user?.id;
  const eligible = user?.role === 'student';
  const refreshBalance = useCallback(async () => {
    const request = ++requestRef.current;
    setState({ ownerId, balance: null });
    if (!ownerId || !eligible) return;
    try {
      const balance = await api.getCoinBalance();
      if (request === requestRef.current) setState({ ownerId, balance });
    } catch {
      // Unavailable is neutral, never a legacy total or a fabricated zero.
      if (request === requestRef.current) setState({ ownerId, balance: null });
    }
  }, [ownerId, eligible]);
  useFocusEffect(useCallback(() => {
    refreshBalance();
    return () => { requestRef.current += 1; };
  }, [refreshBalance]));
  const balance = eligible && state.ownerId === ownerId ? state.balance : null;
  return { balanceLabel: balance == null ? '-' : balance.toLocaleString(), refreshBalance };
}
