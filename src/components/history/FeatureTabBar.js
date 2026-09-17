import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export default function FeatureTabBar({ active, onChange, color = COLORS.primary }) {
  const tabs = [
    { key: 'start', label: 'Start', icon: 'sparkles-outline' },
    { key: 'history', label: 'History', icon: 'time-outline' },
  ];

  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const on = active === tab.key;
        return (
          <TouchableOpacity key={tab.key} style={styles.tab} onPress={() => onChange(tab.key)} activeOpacity={0.75}>
            <Ionicons name={tab.icon} size={18} color={on ? color : COLORS.textTertiary} />
            <Text style={[styles.label, on && { color }]}>{tab.label}</Text>
            {on ? <View style={[styles.indicator, { backgroundColor: color }]} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    position: 'relative',
  },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textTertiary },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    borderRadius: 2,
  },
});
