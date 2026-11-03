import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSubject } from '../context/SubjectContext';
import { useTheme } from '../context/ThemeContext';

export default function SubjectPrompt() {
  const { activeSubject, status, error, refreshActiveSubject } = useSubject();
  const { colors } = useTheme();
  const navigation = useNavigation();
  if (status === 'ready' && activeSubject) return null;
  return <View style={styles.wrap}>
    {status === 'loading' ? <ActivityIndicator color={colors.primaryText} accessibilityLabel="Loading current subject" /> : <>
      <Text style={{ color: colors.textSecondary }} accessibilityRole={error ? 'alert' : undefined}>{error || 'Choose your current subject in My Subjects.'}</Text>
      {status === 'error' && <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={refreshActiveSubject}><Text style={{ color: colors.primaryText }}>Retry subjects</Text></TouchableOpacity>}
      <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => navigation.navigate('MySubjects')}><Text style={{ color: colors.primaryText }}>My Subjects</Text></TouchableOpacity>
    </>}
  </View>;
}

const styles = StyleSheet.create({ wrap: { paddingVertical: 16, gap: 12 }, action: { paddingVertical: 12 } });
