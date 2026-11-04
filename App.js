import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { AuthProvider } from './src/context/AuthContext';
import { SubjectProvider } from './src/context/SubjectContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import MainTabs from './src/navigation/MainTabs';
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import MazeLevelsScreen from './src/screens/MazeLevelsScreen';
import MazeGameScreen from './src/screens/MazeGameScreen';
import MazeResultScreen from './src/screens/MazeResultScreen';
import QuizRushScreen from './src/screens/QuizRushScreen';
import MemoryFlipScreen from './src/screens/MemoryFlipScreen';
import TeacherDashboardScreen from './src/screens/TeacherDashboardScreen';
import ShopScreen from './src/screens/ShopScreen';
import ChallengeLeaderboardScreen from './src/screens/ChallengeLeaderboardScreen';
import StreakScreen from './src/screens/StreakScreen';
import StudyNotesScreen from './src/screens/StudyNotesScreen';
import NotesWorkspaceScreen from './src/screens/NotesWorkspaceScreen';
import SpeakingPracticeScreen from './src/screens/SpeakingPracticeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MySubjectsScreen from './src/screens/MySubjectsScreen';
import { PrivacyPolicyScreen, TermsOfServiceScreen } from './src/screens/LegalScreens';
import {
  AchievementsScreen,
  HelpSupportScreen,
  ProfileDetailsScreen,
} from './src/screens/ProfilePages';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { isDark } = useTheme();
  const navigationTheme = isDark ? DarkTheme : DefaultTheme;
  const expoGoPrefix = Constants.executionEnvironment === 'storeClient' && Constants.expoConfig?.hostUri
    ? `exp://${Constants.expoConfig.hostUri}/--/`
    : null;
  const linking = {
    prefixes: [expoGoPrefix, 'studymaze://'].filter(Boolean),
    config: { screens: { Auth: { path: 'auth/callback' } } },
  };

  return (
      <AuthProvider>
        <SubjectProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <NavigationContainer theme={navigationTheme} linking={linking}>
          <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="Splash"
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />

            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Streak" component={StreakScreen} />
            <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
            <Stack.Screen name="MySubjects" component={MySubjectsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} />

            <Stack.Screen name="MazeLevels" component={MazeLevelsScreen} />
            <Stack.Screen name="MazeGame" component={MazeGameScreen} />
            <Stack.Screen name="MazeResult" component={MazeResultScreen} />
            <Stack.Screen name="MazePractice" getComponent={() => require('./src/screens/MazePracticeScreen').default} />
            <Stack.Screen name="MazePracticeResult" getComponent={() => require('./src/screens/MazePracticeResultScreen').default} />

            <Stack.Screen name="QuizRush" component={QuizRushScreen} />
            <Stack.Screen name="MemoryFlip" component={MemoryFlipScreen} />

            <Stack.Screen
              name="TeacherDashboard"
              component={TeacherDashboardScreen}
            />

            <Stack.Screen name="Shop" component={ShopScreen} />
            <Stack.Screen name="ChallengeLeaderboard" component={ChallengeLeaderboardScreen} />
            <Stack.Screen name="NotesWorkspace" component={NotesWorkspaceScreen} />

            <Stack.Screen
              name="MentorHub"
              getComponent={() =>
                require('./src/screens/MentorHubScreen').default
              }
            />

            <Stack.Screen
              name="TutorChat"
              getComponent={() =>
                require('./src/screens/TutorChatScreen').default
              }
            />

            <Stack.Screen
              name="SmartSolver"
              getComponent={() =>
                require('./src/screens/SmartSolverScreen').default
              }
            />

            <Stack.Screen
              name="StudyNotes"
              component={StudyNotesScreen}
            />

            <Stack.Screen
              name="SpeakingPractice"
              component={SpeakingPracticeScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
        </SubjectProvider>
      </AuthProvider>
  );
}
