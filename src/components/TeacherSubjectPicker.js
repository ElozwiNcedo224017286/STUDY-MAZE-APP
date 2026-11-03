import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';

export function useTeacherSubjectAssignments() {
  const { user } = useAuth();
  const request = useRef(0);
  const [state, setState] = useState({ owner: null, assignments: [], loading: true, error: '', assignmentId: '' });
  const load = useCallback(async () => {
    const ticket = ++request.current;
    const owner = user?.id;
    setState((previous) => ({ ...previous, owner, assignmentId: previous.owner === owner ? previous.assignmentId : '', assignments: [], loading: true, error: '' }));
    try {
      const assignments = await api.getTeacherSubjectAssignments();
      if (ticket === request.current) setState((previous) => ({ owner, assignments, loading: false, error: '', assignmentId:
        assignments.length === 1 ? assignments[0].class_subject_id : assignments.some((row) => row.class_subject_id === previous.assignmentId) ? previous.assignmentId : '' }));
    } catch (error) {
      if (ticket === request.current) setState({ owner, assignments: [], loading: false, error: error.message || 'Could not load your assignments.', assignmentId: '' });
    }
  }, [user?.id]);
  useFocusEffect(useCallback(() => { load(); return () => { request.current += 1; }; }, [load]));
  const visible = state.owner === user?.id ? state : { assignments: [], assignmentId: '', loading: true, error: '' };
  return { ...visible, load, selectedAssignment: visible.assignments.find((row) => row.class_subject_id === visible.assignmentId),
    onSelect: (assignmentId) => setState((previous) => ({ ...previous, assignmentId })) };
}

export default function TeacherSubjectPicker({ assignments, assignmentId, loading, error, load, onSelect, disabled }) {
  const { colors } = useTheme();
  return <View style={styles.wrap}>
    <Text style={[styles.label, { color: colors.textPrimary }]}>Class subject</Text>
    {loading ? <ActivityIndicator color={colors.primaryText} /> : error ? <>
      <Text style={{ color: colors.textSecondary }} accessibilityRole="alert">{error}</Text>
      <TouchableOpacity onPress={load} disabled={disabled} accessibilityRole="button"><Text style={{ color: colors.primaryText }}>Retry assignments</Text></TouchableOpacity>
    </> : assignments.length === 0 ? <Text style={{ color: colors.textSecondary }}>No subject assignments. Ask an administrator to assign you before posting notes.</Text> : assignments.map((assignment) => (
      <TouchableOpacity key={assignment.class_subject_id} disabled={disabled || assignments.length === 1} onPress={() => onSelect(assignment.class_subject_id)}
        accessibilityRole="radio" accessibilityState={{ checked: assignmentId === assignment.class_subject_id, disabled: disabled || assignments.length === 1 }}
        style={[styles.option, { backgroundColor: colors.surface, borderColor: assignmentId === assignment.class_subject_id ? colors.primaryText : colors.border }]}>
        <Text style={{ color: colors.textPrimary }}>{assignment.class_name} — {assignment.subject_name}{assignmentId === assignment.class_subject_id ? ' (selected)' : ''}</Text>
      </TouchableOpacity>
    ))}
  </View>;
}

const styles = StyleSheet.create({ wrap: { gap: 10, marginBottom: 14 }, label: { fontSize: 14, fontWeight: '700' }, option: { padding: 12, borderWidth: 1, borderRadius: 12 } });
