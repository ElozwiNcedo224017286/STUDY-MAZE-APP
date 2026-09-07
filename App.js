import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import MainTabs from './src/navigation/MainTabs';

import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import MazeLevelsScreen from './src/screens/MazeLevelsScreen';
import MazeGameScreen from './src/screens/MazeGameScreen';
import MazeResultScreen from './src/screens/MazeResultScreen';
import QuizRushScreen from './src/screens/QuizRushScreen';
import MemoryFlipScreen from './src/screens/MemoryFlipScreen';
import StreakScreen from './src/screens/StreakScreen';
import StudyNotesScreen from './src/screens/StudyNotesScreen';
import SpeakingPracticeScreen from './src/screens/SpeakingPracticeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />

        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="Splash"
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Streak" component={StreakScreen} />

            <Stack.Screen name="MazeLevels" component={MazeLevelsScreen} />
            <Stack.Screen name="MazeGame" component={MazeGameScreen} />
            <Stack.Screen name="MazeResult" component={MazeResultScreen} />
            <Stack.Screen name="QuizRush" component={QuizRushScreen} />
            <Stack.Screen name="MemoryFlip" component={MemoryFlipScreen} />
            <Stack.Screen
              name="MentorHub"
              getComponent={() => require('./src/screens/MentorHubScreen').default}
            />
            <Stack.Screen
              name="TutorChat"
              getComponent={() => require('./src/screens/TutorChatScreen').default}
            />
            <Stack.Screen
              name="SmartSolver"
              getComponent={() => require('./src/screens/SmartSolverScreen').default}
            />
            <Stack.Screen name="StudyNotes" component={StudyNotesScreen} />
            <Stack.Screen name="SpeakingPractice" component={SpeakingPracticeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}