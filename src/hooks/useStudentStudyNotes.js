import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSubject } from '../context/SubjectContext';
import { api } from '../api/client';

export default function useStudentStudyNotes() {
  const { user } = useAuth();
  const { activeSubject, status } = useSubject();
  const classSubjectId = user?.role === 'student' && status === 'ready'
    ? activeSubject?.class_subject_id
    : null;
  const key = classSubjectId ? `${user.id}:${classSubjectId}` : null;
  const liveKey = useRef(key);
  liveKey.current = key;
  const request = useRef(0);
  const [state, setState] = useState({ key: null, notes: [], loading: false, error: '' });

  const refresh = useCallback(async () => {
    const ticket = ++request.current;
    if (!classSubjectId) return;
    setState({ key, notes: [], loading: true, error: '' });
    try {
      const notes = await api.getStudentStudyNotes(classSubjectId);
      if (ticket === request.current && liveKey.current === key) {
        setState({ key, notes, loading: false, error: '' });
      }
    } catch (error) {
      if (ticket === request.current && liveKey.current === key) {
        setState({
          key,
          notes: [],
          loading: false,
          error: error.message || 'Could not load your saved notes.',
        });
      }
    }
  }, [classSubjectId, key]);

  useFocusEffect(useCallback(() => {
    refresh();
    return () => { request.current += 1; };
  }, [refresh]));

  const current = key && state.key === key;
  return {
    notes: current ? state.notes : [],
    loading: !!key && (!current || state.loading),
    error: current ? state.error : '',
    refresh,
  };
}
