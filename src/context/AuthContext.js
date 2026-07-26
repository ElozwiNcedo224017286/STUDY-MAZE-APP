import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const AuthContext = createContext(null);
const SESSION_KEY = 'studymaze:session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { username, role, coins, unlockedLevel, highScore, createdAt }
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          // Re-fetch fresh progress from the server rather than trusting the cached copy.
          const { user: fresh } = await api.getUser(saved.username);
          setUser(fresh);
        }
      } catch (e) {
        // No valid session — fall through to login.
      }
      setBooting(false);
    })();
  }, []);

  const persistSession = useCallback(async (u) => {
    setUser(u);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ username: u.username }));
  }, []);

  const login = useCallback(async (username, password) => {
    const { user: u } = await api.login(username, password);
    await persistSession(u);
    return u;
  }, [persistSession]);

  const register = useCallback(async (username, password, role, teacherCode) => {
    const { user: u } = await api.register(username, password, role, teacherCode);
    await persistSession(u);
    return u;
  }, [persistSession]);

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  }, []);

  // Call after any coin/level/score change so the server (and thus the shared database) stays authoritative.
  const syncProgress = useCallback(async (patch) => {
    if (!user) return;
    const { user: fresh } = await api.updateUser(user.username, patch);
    setUser(fresh);
    return fresh;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, booting, login, register, logout, syncProgress, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
