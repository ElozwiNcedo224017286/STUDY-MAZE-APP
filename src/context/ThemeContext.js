import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../theme/colors';

const STORAGE_KEY = 'study-maze-theme';
const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} });

const DARK_COLORS = {
  ...COLORS,
  background: '#0F172A',
  backgroundSecondary: '#0B1220',
  backgroundTertiary: '#1E293B',
  backgroundWarm: '#151D30',
  surface: '#172033',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  border: '#334155',
  borderLight: '#263449',
  divider: '#2B394C',
  cardBackground: '#172033',
  cardShadow: 'rgba(0, 0, 0, 0.24)',
  primaryText: '#C4B5FD',
};

const LIGHT_COLORS = { ...COLORS, surface: COLORS.white, primaryText: COLORS.primary };

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((savedTheme) => {
        if (active && (savedTheme === 'dark' || savedTheme === 'light')) {
          setIsDark(savedTheme === 'dark');
        }
      })
      .catch((error) => console.warn('Could not load theme preference:', error))
      .finally(() => {
        if (active) setThemeLoaded(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    Appearance.setColorScheme?.(isDark ? 'dark' : 'light');
    AsyncStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
      .catch((error) => console.warn('Could not save theme preference:', error));
  }, [isDark, themeLoaded]);

  const toggleTheme = useCallback(() => {
    setIsDark((current) => !current);
  }, []);

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
