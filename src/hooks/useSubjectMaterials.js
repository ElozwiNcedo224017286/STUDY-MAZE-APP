import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSubject } from '../context/SubjectContext';
import { api } from '../api/client';

export default function useSubjectMaterials() {
  const { user } = useAuth();
  const { activeSubject, status } = useSubject();
  const id = user?.role === 'student' && status === 'ready' ? activeSubject?.class_subject_id : null;
  const key = id ? `${user.id}:${id}` : null;
  const liveKey = useRef(key);
  liveKey.current = key;
  const request = useRef(0);
  const [state, setState] = useState({ key: null, materials: [], loading: false, error: '' });
  const refresh = useCallback(async () => {
    const ticket = ++request.current;
    if (!id) return;
    setState({ key, materials: [], loading: true, error: '' });
    try {
      const { materials } = await api.getSubjectMaterials(id);
      if (ticket === request.current && liveKey.current === key) setState({ key, materials, loading: false, error: '' });
    } catch (error) {
      if (ticket === request.current && liveKey.current === key) setState({ key, materials: [], loading: false, error: error.message || 'Could not load this subject’s notes.' });
    }
  }, [id, key]);
  useFocusEffect(useCallback(() => {
    refresh();
    return () => { request.current += 1; };
  }, [refresh]));
  const current = key && state.key === key;
  return { materials: current ? state.materials : [], loading: !!key && (!current || state.loading), error: current ? state.error : '', refresh };
}
