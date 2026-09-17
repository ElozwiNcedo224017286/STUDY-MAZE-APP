import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const NAV_ITEMS = [
  {
    key: 'Shop',
    route: 'Shop',
    icon: '🛍️',
    label: 'Shop',
  },
  {
    key: 'Leaderboard',
    route: 'Leaderboard',
    icon: '🏆',
    label: 'Leaderboard',
  },
  {
    key: 'Hub',
    route: 'Hub',
    icon: '🏠',
    label: 'Home',
  },
  {
    key: 'Streak',
    route: 'Streak',
    icon: '🎁',
    label: 'Daily Rewards',
  },
  {
    key: 'Settings',
    route: 'Settings',
    icon: '⚙️',
    label: 'Settings',
  },
];

export default function NavigationDock({ navigation, activeRoute }) {
  const availableRoutes =
    navigation.getState()?.routeNames ?? [];

  return (
    <View style={styles.dockWrapper}>
      <View style={styles.dock}>

        {NAV_ITEMS.map((item) => {
          const isActive = activeRoute === item.route;
          const isAvailable = availableRoutes.includes(item.route);

          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                isActive && styles.activeNavItem,
                !isAvailable && styles.disabledNavItem,
              ]}
              onPress={() => {
                if (isAvailable && !isActive) {
                  navigation.navigate(item.route);
                }
              }}
              activeOpacity={isAvailable ? 0.75 : 1}
            >
              <Text
                style={[
                  styles.icon,
                  isActive && styles.activeIcon,
                ]}
              >
                {item.icon}
              </Text>

              {isActive && (
                <Text style={styles.label}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  // Floating positioning
  dockWrapper: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    alignItems: 'center',
  },

  // Main navigation container
  dock: {
    width: '100%',
    maxWidth: 500,
    minHeight: 70,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',

    backgroundColor: colors.panel,

    borderWidth: 2,
    borderColor: colors.wallEdge,

    borderRadius: 30,

    paddingHorizontal: 8,
    paddingVertical: 7,

    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.30,
    shadowRadius: 10,

    // Android shadow
    elevation: 10,
  },

  // Normal navigation item
  navItem: {
    minWidth: 52,
    minHeight: 52,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 20,

    paddingHorizontal: 7,
    paddingVertical: 5,
  },

  // Selected screen
  activeNavItem: {
    minWidth: 84,
    minHeight: 62,

    backgroundColor: colors.bg,

    borderWidth: 2,
    borderColor: colors.wallEdge,

    borderRadius: 22,

    transform: [
      {
        translateY: -10,
      },
    ],

    // Small shadow makes the active item feel raised
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,

    elevation: 7,
  },

  // Screens that haven't been added to App.js yet
  disabledNavItem: {
    opacity: 0.35,
  },

  // Normal icon
  icon: {
    fontSize: 24,
  },

  // Active icon becomes larger
  activeIcon: {
    fontSize: 30,
  },

  // Active screen name
  label: {
    marginTop: 1,

    color: colors.gold,

    fontSize: 10,
    fontWeight: '800',

    textAlign: 'center',
  },
});