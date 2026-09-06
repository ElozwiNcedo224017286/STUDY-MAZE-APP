import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider } from './src/context/AuthContext';
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import HubScreen from './src/screens/HubScreen';
import MazeLevelsScreen from './src/screens/MazeLevelsScreen';
import MazeGameScreen from './src/screens/MazeGameScreen';
import MazeResultScreen from './src/screens/MazeResultScreen';
import QuizRushScreen from './src/screens/QuizRushScreen';
import MemoryFlipScreen from './src/screens/MemoryFlipScreen';
import TeacherDashboardScreen from './src/screens/TeacherDashboardScreen';
import ShopScreen from './src/screens/ShopScreen';
import StreakScreen from './src/screens/StreakScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Hub" component={HubScreen} />
          <Stack.Screen name="MazeLevels" component={MazeLevelsScreen} />
          <Stack.Screen name="MazeGame" component={MazeGameScreen} />
          <Stack.Screen name="MazeResult" component={MazeResultScreen} />
          <Stack.Screen name="QuizRush" component={QuizRushScreen} />
          <Stack.Screen name="MemoryFlip" component={MemoryFlipScreen} />
          <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} />
          <Stack.Screen name="Shop" component={ShopScreen} />
          <Stack.Screen name="Streak" component={StreakScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
