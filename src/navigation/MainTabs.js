import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import PlayScreen from '../screens/PlayScreen';
import LearnScreen from '../screens/LearnScreen';
import ChallengeLeaderboardScreen from '../screens/ChallengeLeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StudioScreen from '../screens/StudioScreen';
import ClassScreen from '../screens/ClassScreen';
import NotesScreen from '../screens/NotesScreen';

import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminClassesScreen from '../screens/AdminClassesScreen';
import AdminChallengesScreen from '../screens/AdminChallengesScreen';

import AdminRewardsScreen from '../screens/AdminRewardsScreen';
import { FONT_FAMILY } from '../theme/layout';

const Tab = createBottomTabNavigator();

function tabIcon(name) {
  return ({ color, focused }) => <Ionicons name={focused ? name : `${name}-outline`} size={22} color={color} />;
}

export default function MainTabs() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isTeacher = user?.role === 'teacher';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8) }],
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
        ),
      }}
    >
      {user?.role === 'admin' ? (
        <>
          <Tab.Screen name="AdminOverview" component={AdminDashboardScreen} options={{ tabBarLabel: 'Overview', tabBarIcon: tabIcon('grid') }} />
          <Tab.Screen name="AdminClasses" component={AdminClassesScreen} options={{ tabBarLabel: 'Classes', tabBarIcon: tabIcon('people') }} />
          <Tab.Screen name="AdminChallenges" component={AdminChallengesScreen} options={{ tabBarLabel: 'Challenges', tabBarIcon: tabIcon('trophy') }} />
          <Tab.Screen name="AdminRewards" component={AdminRewardsScreen} options={{ tabBarLabel: 'Rewards', tabBarIcon: tabIcon('gift') }} />
        </>
      ) : (
        <>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: tabIcon('home'),
        }}
      />

      {isTeacher ? (
        <>
          <Tab.Screen
            name="Studio"
            component={StudioScreen}
            options={{
              tabBarLabel: 'Studio',
              tabBarIcon: tabIcon('create'),
            }}
          />
          <Tab.Screen
            name="Class"
            component={ClassScreen}
            options={{
              tabBarLabel: 'Class',
              tabBarIcon: tabIcon('people'),
            }}
          />
          <Tab.Screen
            name="Notes"
            component={NotesScreen}
            options={{
              tabBarLabel: 'Notes',
              tabBarIcon: tabIcon('document-text'),
            }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            name="Play"
            component={PlayScreen}
            options={{
              tabBarLabel: 'Play',
              tabBarIcon: tabIcon('game-controller'),
            }}
          />
          <Tab.Screen
            name="Learn"
            component={LearnScreen}
            options={{
              tabBarLabel: 'Smart Learn',
              tabBarIcon: tabIcon('sparkles'),
            }}
          />
          <Tab.Screen
            name="Challenges"
            component={ChallengeLeaderboardScreen}
            options={{
              tabBarLabel: 'Challenges',
              tabBarIcon: tabIcon('trophy'),
            }}
          />
        </>
      )}

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: tabIcon('person'),
        }}
      />
        </>
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    elevation: 0,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY,
    fontWeight: '600',
    marginTop: 4,
  },
});
