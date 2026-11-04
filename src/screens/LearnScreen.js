import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet, StatusBar, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import LearnToolCard from '../components/learn/LearnToolCard';
import { STUDY_TOOLS } from '../constants/studyTools';
import { useTheme } from '../context/ThemeContext';
import { SPACE, PAGE_CONTENT, studyToolWidth } from '../theme/layout';

export default function LearnScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const cardWidth = studyToolWidth(width, fontScale);
  function open(screen, params) { (navigation.getParent() || navigation).navigate(screen, params); }

  useFocusEffect(useCallback(() => {
    if (route?.params?.openMentor) {
      navigation.setParams({ openMentor: undefined });
      (navigation.getParent() || navigation).navigate('MentorHub');
    }
  }, [route?.params?.openMentor, navigation]));

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScreenHeader title="Smart" titleHighlight="Learn" subtitle="Choose your next study quest." />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + SPACE.section }]} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {STUDY_TOOLS.map(tool => <LearnToolCard key={tool.key} tool={tool} width={cardWidth} onPress={() => open(tool.route, tool.route === 'MentorHub' ? { initialTab: 'start' } : undefined)} />)}
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 }, body: { ...PAGE_CONTENT, paddingTop: SPACE.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md },
});
