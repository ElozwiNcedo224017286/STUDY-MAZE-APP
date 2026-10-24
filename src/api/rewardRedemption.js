import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from 'expo-modules-core';
import { api } from './client';

// Store only operation identifiers, never session credentials. Each account has its own retry.
const activeRequests = new Set();
const keyFor = (userId) => `study-maze:reward-redemption:${userId}`;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPendingRedemption(userId) {
  if (!userId) return null;
  const stored = await AsyncStorage.getItem(keyFor(userId));
  if (!stored) return null;
  const request = JSON.parse(stored);
  if (!uuidPattern.test(request?.rewardId || '') || !uuidPattern.test(request?.requestId || '')) {
    throw new Error('Saved redemption request is invalid. Please contact support before redeeming again.');
  }
  return request;
}

export async function submitRewardRedemption(userId, rewardId, isCurrent = () => true) {
  if (!userId || !uuidPattern.test(rewardId || '')) throw new Error('A signed-in user and reward are required.');
  if (activeRequests.has(userId)) throw new Error('A redemption request is already in progress.');
  activeRequests.add(userId);
  let request;
  try {
    request = await getPendingRedemption(userId);
    if (request && request.rewardId !== rewardId) {
      throw new Error('Resolve the previous redemption using Retry before choosing another reward.');
    }
    if (!request) {
      const requestId = uuid.v4();
      if (!uuidPattern.test(requestId)) throw new Error('Could not generate a redemption request ID.');
      request = { rewardId, requestId };
      // Persist before sending: remounts/restarts must retry the same operation.
      await AsyncStorage.setItem(keyFor(userId), JSON.stringify(request));
    }
    if (!isCurrent()) throw new Error('Account changed. Return to Rewards to confirm your request.');
    let result;
    try {
      result = await api.redeemReward(request.rewardId, request.requestId);
    } catch (error) {
      // Explicit PostgreSQL validation/permission failures roll back the transaction.
      // Network/unknown failures retain the identifier because the write may have committed.
      if (['P0001', '42501', '22023', '23514'].includes(error.code)) {
        await AsyncStorage.removeItem(keyFor(userId));
      }
      throw error;
    }
    await AsyncStorage.removeItem(keyFor(userId));
    return result;
  } finally {
    activeRequests.delete(userId);
  }
}
