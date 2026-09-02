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
    supabase.from('game_scores').select('coins, score, detail, created_at').eq('user_id', authUser.id)
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

  // Consecutive-day play streak, derived from the calendar dates of past score rows
  // (today counts if already played; otherwise the streak is still "alive" through yesterday).
  const playDates = new Set((scores || []).map((s) => new Date(s.created_at).toDateString()));
  let streakDays = 0;
  if (playDates.size) {
    const cursor = new Date();
    if (!playDates.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
    while (playDates.has(cursor.toDateString())) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

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
    streakDays,
    gamesPlayed: (scores || []).length,
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

  return (
    <AuthContext.Provider value={{ user, booting, login, register, logout, recordGame, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
