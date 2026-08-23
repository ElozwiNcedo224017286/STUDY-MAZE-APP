import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../api/supabase';

const AuthContext = createContext(null);

// Access code a user must supply to register as a teacher (client-side gate only).
const TEACHER_CODE = process.env.EXPO_PUBLIC_TEACHER_CODE || 'TEACH2024';

// The app screens speak in terms of { username, role, coins, unlockedLevel, highScore }.
// The database keeps identity in auth.users/profiles/user_roles and progress in the
// append-only game_scores table, so we assemble that shape here at the boundary.
async function loadUser(authUser) {
  if (!authUser) return null;

  const [{ data: profile }, { data: roles }, { data: scores }] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url, grade, created_at').eq('id', authUser.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', authUser.id),
    supabase.from('game_scores').select('coins, score, detail').eq('user_id', authUser.id)
  ]);

  const roleNames = (roles || []).map((r) => r.role);
  const role = roleNames.includes('teacher') || roleNames.includes('admin') ? 'teacher' : 'student';

  // Aggregate progress from the score rows: coins are earned-total, high score is the
  // best single run, and the unlocked maze level follows the best completed level.
  let coins = 0;
  let highScore = 0;
  let bestLevel = 0;
  (scores || []).forEach((s) => {
    coins += s.coins || 0;
    if ((s.score || 0) > highScore) highScore = s.score;
    const lvl = s.detail && s.detail.level;
    if (typeof lvl === 'number' && lvl > bestLevel) bestLevel = lvl;
  });

  const displayName = profile?.display_name || authUser.email?.split('@')[0] || 'Player';

  return {
    id: authUser.id,
    email: authUser.email,
    username: displayName,       // screens still read `username` for the greeting
    displayName,
    avatarUrl: profile?.avatar_url || null,
    grade: profile?.grade || null,
    role,
    coins,
    highScore,
    unlockedLevel: bestLevel + 1, // completing level N unlocks N+1
    createdAt: profile?.created_at
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // Restore any persisted Supabase session on launch, and react to sign-in/out events.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (alive) {
        setUser(session ? await loadUser(session.user) : null);
        setBooting(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUser(null);
    });
    return () => { alive = false; subscription?.unsubscribe(); };
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const fresh = session ? await loadUser(session.user) : null;
    setUser(fresh);
    return fresh;
  }, []);

  const getUserStreak = useCallback(async () => {
  if (!user) return null;

  const { data, error } = await supabase
    .from('daily_streaks')
    .select('current_streak, longest_streak, last_reward_date')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('Failed to load user streak:', error.message);
    throw new Error(error.message || 'Could not load streak.');
  }

  // No streak record yet.
  if (!data) {
    return {
      current_streak: 0,
      longest_streak: 0,
      last_reward_date: null
    };
  }

  // If there is no last reward date, the streak cannot be active.
  if (!data.last_reward_date) {
    return {
      ...data,
      current_streak: 0
    };
  }

  // --------------------------------------------------
  // Check whether the streak is still alive.
  // --------------------------------------------------

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastRewardDate = new Date(
    `${data.last_reward_date}T00:00:00`
  );
  lastRewardDate.setHours(0, 0, 0, 0);

  const differenceInDays =
    Math.floor(
      (today - lastRewardDate) / (1000 * 60 * 60 * 24)
    );

  // Claimed today or yesterday.
  if (differenceInDays <= 1) {
    return data;
  }

  // --------------------------------------------------
  // The user missed at least one day.
  // Reset current streak but preserve the record.
  // --------------------------------------------------

  const { data: resetData, error: resetError } = await supabase
    .from('daily_streaks')
    .update({
      current_streak: 0,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id)
    .select('current_streak, longest_streak, last_reward_date')
    .single();

  if (resetError) {
    console.warn(
      'Failed to reset broken streak:',
      resetError.message
    );

    // Even if the database update fails,
    // don't display the old broken streak.
    return {
      ...data,
      current_streak: 0
    };
  }

  return resetData;
}, [user]);

const getDailyRewardDates = useCallback(async () => {
  if (!user) return [];

  const { data, error } = await supabase
    .from('daily_login_rewards')
    .select('reward_date')
    .eq('user_id', user.id)
    .order('reward_date', { ascending: true });

  if (error) {
    console.warn(
      'Failed to load reward history:',
      error.message
    );

    throw new Error(
      error.message || 'Could not load reward history.'
    );
  }

  return (data || []).map((row) => row.reward_date);
}, [user]);

  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
    const u = await loadUser(data.user);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (email, password, displayName, role, teacherCode) => {
    if (role === 'teacher' && teacherCode !== TEACHER_CODE) {
      throw new Error('Invalid teacher access code.');
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Read by the handle_new_user() trigger to seed profiles + user_roles.
      options: { data: { display_name: displayName?.trim() || email.split('@')[0], role: role || 'student' } }
    });
    if (error) throw new Error(error.message);

    // With email confirmation enabled, signUp returns no session until the user confirms.
    if (!data.session) return { user: null, needsConfirmation: true };

    const u = await loadUser(data.user);
    setUser(u);
    return { user: u, needsConfirmation: false };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  // Record one finished game into game_scores, then refresh the aggregated user.
  const recordGame = useCallback(async (game, { coinsEarned = 0, score = 0, level } = {}) => {
    if (!user) return null;
    const detail = level != null ? { level } : {};
    const { error } = await supabase.from('game_scores').insert({
      user_id: user.id,
      game,                              // 'quiz_maze' | 'memory_match' | 'study_quiz'
      coins: Math.max(0, Math.round(coinsEarned)),
      score: Math.round(score),
      detail
    });
    if (error) {
      // Don't crash the results screen if the write fails — surface it in the console.
      console.warn('Failed to record game score:', error.message);
      return user;
    }
    return refreshUser();
  }, [user, refreshUser]);

  
// Claim today's daily login reward through the secure Supabase RPC.
// The database decides whether the reward has already been claimed.
const claimDailyReward = useCallback(async () => {
  if (!user) {
    throw new Error('You must be signed in to claim the daily reward.');
  }

const { data, error } = await supabase.rpc('claim_daily_reward');

  if (error) {
    console.warn('Failed to claim daily reward:', error.message);
    throw new Error(error.message || 'Could not claim daily reward.');
  }

// RPC returns one row:
// { claimed, coins_awarded, reward_date }
const result = Array.isArray(data) ? data[0] : data;

if (!result) {
  throw new Error('The daily reward response was empty.');
}

// If the user already claimed today's reward, don't modify local user data.
if (!result.claimed) {
  return {
    claimed: false,
    coinsAwarded: 0,
    rewardDate: result.reward_date
  };
}

// game_scores was updated by the RPC, so refresh the aggregated
// user object to pick up the newly earned coins.
await refreshUser();

return {
  claimed: true,
  coinsAwarded: result.coins_awarded,
  rewardDate: result.reward_date,
  currentStreak: result.current_streak,
  longestStreak: result.longest_streak
};
}, [user, refreshUser]);


//popup method
const hasClaimedDailyReward = useCallback(async () => {
  if (!user) return false;

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('daily_login_rewards')
    .select('id')
    .eq('user_id', user.id)
    .eq('reward_date', today)
    .maybeSingle();

  if (error) {
    console.warn('Failed to check daily reward:', error.message);
    return false;
  }

  return !!data;
}, [user]);

  return (
    <AuthContext.Provider value={{ user, booting, login, register, logout, recordGame, claimDailyReward, hasClaimedDailyReward, getUserStreak, getDailyRewardDates, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
