
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { COLORS } from '../theme/colors';

/**
 * Kept so existing navigation to this route still works.
 * The real dashboard lives in MazeGameScreen (screenMode === 'dashboard').
 * Once your navigator points at 'MazeGame' directly, delete this file.
 */
export default function MazeGameDashboardScreen({ navigation }) {
  useEffect(() => {
    navigation.replace('MazeGame');
  }, [navigation]);

  return <View style={{ flex: 1, backgroundColor: COLORS.backgroundSecondary }} />;
}