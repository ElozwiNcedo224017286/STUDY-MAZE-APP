import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { api } from '../api/client';

const SubjectContext = createContext(null);
const empty = { owner: null, subjects: [], activeSubject: null, status: 'loading', error: '' };
const storageKey = (owner) => `@studymaze_active_subject:${owner}`;

export function SubjectProvider({ children }) {
  const { user, booting } = useAuth();
  const owner = !booting && user?.role === 'student' ? user.id : null;
  const liveOwner = useRef(owner);
  liveOwner.current = owner;
  const [state, setState] = useState(empty);
  const currentState = useRef(state);
  currentState.current = state;
  const version = useRef(0);
  const inFlight = useRef(null);
  const writes = useRef(Promise.resolve());
  const selecting = useRef(null);

  const persist = useCallback((account, id) => {
    const operation = writes.current.catch(() => {}).then(() => id
      ? AsyncStorage.setItem(storageKey(account), id)
      : AsyncStorage.removeItem(storageKey(account)));
    writes.current = operation;
    return operation;
  }, []);

  const refreshActiveSubject = useCallback(() => {
    if (!owner || liveOwner.current !== owner) return Promise.resolve();
    if (inFlight.current?.owner === owner) return inFlight.current.promise;
    const ticket = ++version.current;
    const isCurrent = () => liveOwner.current === owner && ticket === version.current;
    setState((previous) => ({ ...(previous.owner === owner ? previous : empty), owner, status: 'loading', error: '' }));
    const promise = (async () => {
      try {
        const [subjects, saved] = await Promise.all([
          api.getMySubjects(),
          writes.current.catch(() => {}).then(() => AsyncStorage.getItem(storageKey(owner))),
        ]);
        if (!isCurrent()) return;
        const activeSubject = subjects.find((subject) => subject.class_subject_id === saved) ||
          (subjects.length === 1 ? subjects[0] : null);
        const id = activeSubject?.class_subject_id || null;
        let error = '';
        if (id !== saved) {
          try { await persist(owner, id); }
          catch { error = 'Your current subject could not be saved on this device. Retry to save it.'; }
        }
        if (isCurrent()) setState({ owner, subjects, activeSubject, status: 'ready', error });
      } catch (error) {
        if (isCurrent()) setState((previous) => ({
          ...(previous.owner === owner ? previous : empty), owner, status: 'error',
          error: error.message || 'Could not load your enrolled subjects. Please retry.',
        }));
      }
    })();
    inFlight.current = { owner, promise };
    promise.finally(() => { if (inFlight.current?.promise === promise) inFlight.current = null; });
    return promise;
  }, [owner, persist]);

  const setActiveSubject = useCallback(async (classSubjectId) => {
    const current = currentState.current;
    if (!owner || liveOwner.current !== owner || current.owner !== owner || current.status !== 'ready') {
      throw new Error('Refresh your enrolled subjects before choosing a current subject.');
    }
    const selected = current.subjects.find((subject) => subject.class_subject_id === classSubjectId);
    if (!selected) throw new Error('Choose one of your enrolled subjects.');
    if (selecting.current?.owner === owner) return;
    const ticket = ++version.current;
    const selection = { owner, ticket };
    selecting.current = selection;
    // A refresh started before this choice must not restore an older preference.
    inFlight.current = null;
    try {
      await persist(owner, selected.class_subject_id);
      if (liveOwner.current === owner && ticket === version.current) {
        setState({ ...current, activeSubject: selected, error: '' });
      }
    } catch {
      throw new Error('Could not save your current subject. Please try again.');
    } finally { if (selecting.current === selection) selecting.current = null; }
  }, [owner, persist]);

  useEffect(() => {
    version.current += 1;
    inFlight.current = null;
    setState({ ...empty, owner, status: owner || booting ? 'loading' : 'ready' });
    refreshActiveSubject();
    return () => { version.current += 1; inFlight.current = null; };
  }, [owner, booting, refreshActiveSubject]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshActiveSubject();
    });
    return () => subscription.remove();
  }, [refreshActiveSubject]);

  // Gate during render so another account can never see the previous account's data.
  const visible = state.owner === owner && owner ? state : { ...empty, status: owner || booting ? 'loading' : 'ready' };
  return <SubjectContext.Provider value={{ ...visible, setActiveSubject, refreshActiveSubject }}>{children}</SubjectContext.Provider>;
}

export function useSubject() {
  const context = useContext(SubjectContext);
  if (!context) throw new Error('useSubject must be used within SubjectProvider');
  return context;
}
