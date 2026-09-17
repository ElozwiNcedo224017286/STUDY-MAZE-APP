import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

import HomeScreen from '../screens/HomeScreen';
import PlayScreen from '../screens/PlayScreen';
import LearnScreen from '../screens/LearnScreen';
import ShopScreen from '../screens/ShopScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StudioScreen from '../screens/StudioScreen';
import ClassScreen from '../screens/ClassScreen';
import NotesScreen from '../screens/NotesScreen';

const Tab = createBottomTabNavigator();

function tabIcon(name) {
  return ({ color, size }) => <Ionicons name={name} size={size} color={color} />;
}

export default function MainTabs() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.white }]} />
        ),
      }}
    >
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
              tabBarLabel: ({ color }) => (
                <Text style={[styles.smartLabel, { color }]} numberOfLines={2}>
                  Smart Learn
                </Text>
              ),
              tabBarIcon: tabIcon('sparkles'),
            }}
          />
          <Tab.Screen
            name="Rewards"
            component={ShopScreen}
            options={{
              tabBarLabel: 'Rewards',
              tabBarIcon: tabIcon('gift'),
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
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    elevation: 8,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: Platform.OS === 'ios' ? 0 : 4,
  },
  smartLabel: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 11,
    marginBottom: Platform.OS === 'ios' ? 0 : 2,
  },
});
