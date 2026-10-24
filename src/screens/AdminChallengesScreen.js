import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import { AdminPage, AdminButton, dateLabel, styles, useAdminResource } from '../components/AdminUI';

const TYPES = ['weekly', 'monthly', 'special'];
const STATUS_COLORS = { draft: COLORS.warning, active: COLORS.success, completed: COLORS.primary, cancelled: COLORS.textSecondary };
const loadCatalogue = async () => {
  const [challenges, classes] = await Promise.all([api.adminListChallenges(), api.adminListClasses()]);
  return { challenges, classes };
};

function Choices({ values, selected, onSelect, disabled }) {
  return <View style={styles.wrap}>{values.map(({ id, label }) => <TouchableOpacity accessibilityRole="button"
    accessibilityState={{ selected: selected === id, disabled }} key={id} disabled={disabled}
    onPress={() => onSelect(id)} style={[styles.choice, selected === id && styles.selected]}>
    <Text style={[styles.choiceText, selected === id && styles.selectedText]}>{label}</Text>
  </TouchableOpacity>)}</View>;
}

function DraftForm({ draft, classes, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({
    title: draft?.title || '', description: draft?.description || '', challenge_type: draft?.challenge_type || 'weekly',
    starts_at: draft?.starts_at || '', ends_at: draft?.ends_at || '',
    class_id: draft?.classes?.length === 1 ? draft.classes[0].id : '',
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const alive = useRef(false);
  useFocusEffect(useCallback(() => { alive.current = true; return () => { alive.current = false; }; }, []));
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  async function save() {
    if (lock.current || uncertain || user?.role !== 'admin') return;
    // Require an explicit timezone so the date shown is the date sent to the server.
    const validDate = (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
    if (!form.title.trim() || !TYPES.includes(form.challenge_type) || !classes.some((row) => row.id === form.class_id)) {
      setError('Enter a title and select a challenge type and class.'); return;
    }
    if (!validDate(form.starts_at.trim()) || !validDate(form.ends_at.trim()) || Date.parse(form.ends_at) <= Date.parse(form.starts_at)) {
      setError('Enter valid start/end times with a timezone. End must be after start.'); return;
    }
    lock.current = true; setBusy(true); setError('');
    try {
      await api.adminSaveChallenge({ ...form, id: draft?.id ?? null, title: form.title.trim(), description: form.description.trim(),
        starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString() });
      if (alive.current) onSaved();
    } catch (failure) {
      if (alive.current) {
        setError(`${failure.message || 'Save failed.'} Return to the catalogue and refresh before trying again.`);
        // A lost response may follow a committed write. Never automatically repeat it.
        setUncertain(true);
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  return <View style={styles.card}>
    <Text style={styles.title}>{draft ? 'Edit draft' : 'New challenge draft'}</Text>
    {['title', 'description'].map((key) => <View key={key}>
      <Text style={styles.label}>{key === 'title' ? 'Title' : 'Description'}</Text>
      <TextInput accessibilityLabel={key} editable={!busy} style={styles.input} value={form[key]} onChangeText={(value) => update(key, value)} multiline={key === 'description'} />
    </View>)}
    <Text style={styles.label}>Challenge type</Text>
    <Choices values={TYPES.map((type) => ({ id: type, label: type }))} selected={form.challenge_type} onSelect={(value) => update('challenge_type', value)} disabled={busy} />
    <Text style={styles.text}>Date/time format: YYYY-MM-DDTHH:mm+02:00. Use your intended timezone offset, or Z for UTC.</Text>
    {['starts_at', 'ends_at'].map((key) => <View key={key}>
      <Text style={styles.label}>{key === 'starts_at' ? 'Start date/time' : 'End date/time'}</Text>
      <TextInput accessibilityLabel={key === 'starts_at' ? 'Start date and time' : 'End date and time'} editable={!busy} style={styles.input} value={form[key]} onChangeText={(value) => update(key, value)} autoCapitalize="none" autoCorrect={false} placeholder="YYYY-MM-DDTHH:mm+02:00" placeholderTextColor={COLORS.textTertiary} />
    </View>)}
    <Text style={styles.label}>Assigned class</Text>
    {!classes.length ? <Text style={styles.text}>No classes available. A class is required to save a draft.</Text> :
      <Choices values={classes.map((row) => ({ id: row.id, label: row.name }))} selected={form.class_id} onSelect={(value) => update('class_id', value)} disabled={busy} />}
    {draft?.classes?.length > 1 && <Text style={styles.text}>This draft has multiple classes. Saving will replace them with the one class selected above.</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <AdminButton title={busy ? 'Saving...' : 'Save draft'} onPress={save} disabled={busy || uncertain || !classes.length} />
    <AdminButton title="Back to challenges" secondary onPress={onClose} disabled={busy} />
  </View>;
}

export default function AdminChallengesScreen() {
  const { user } = useAuth();
  const resource = useAdminResource(loadCatalogue);
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const scope = useRef(0);
  const currentUser = useRef(user);
  currentUser.current = user;
  useFocusEffect(useCallback(() => {
    scope.current += 1; setEditor(null); setMessage('');
    return () => { scope.current += 1; };
  }, [user?.id]));

  function confirmTransition(challenge, action) {
    if (lock.current || user?.role !== 'admin') return;
    const ticket = scope.current;
    const owner = user.id;
    const labels = { activate: 'Activate', complete: 'Complete', cancel: 'Cancel' };
    Alert.alert(`${labels[action]} challenge?`, `${challenge.title}\n\n${action === 'activate' ? 'Activation locks editing of this draft.' : 'This action cannot be undone.'}`, [
      { text: 'Keep current status', style: 'cancel' },
      { text: labels[action], style: action === 'cancel' ? 'destructive' : 'default', onPress: async () => {
        if (lock.current || ticket !== scope.current || currentUser.current?.id !== owner || currentUser.current?.role !== 'admin') return;
        lock.current = true; setBusy(true); setMessage('');
        try {
          await api.adminTransitionChallenge(challenge.id, action);
          if (ticket === scope.current) await resource.load();
        } catch (error) {
          if (ticket === scope.current) {
            setMessage(`${error.message || 'Could not change status.'} Refresh before trying again.`);
            await resource.load();
          }
        } finally { lock.current = false; setBusy(false); }
      } },
    ]);
  }
  return <AdminPage title="Challenges" subtitle="Manage class challenges and their lifecycle" resource={resource}>
    {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
    {editor ? <DraftForm key={editor.draft?.id || 'new'} draft={editor.draft} classes={resource.data?.classes || []}
      onClose={() => setEditor(null)} onSaved={() => { setEditor(null); resource.load(); }} /> : <>
      <AdminButton title="Create challenge draft" disabled={busy} onPress={() => { setMessage(''); setEditor({ draft: null }); }} />
      {!resource.data?.challenges.length ? <View style={styles.card}><Text style={styles.title}>No challenges yet</Text><Text style={styles.text}>Create a draft to plan your next class challenge.</Text></View> :
        resource.data.challenges.map((challenge) => <View key={challenge.id} style={styles.card}>
          <Text style={styles.title}>{challenge.title}</Text>
          <Text style={[styles.badge, { color: STATUS_COLORS[challenge.status] || COLORS.textSecondary }]}>{challenge.challenge_type} / {challenge.status}</Text>
          {!!challenge.description && <Text style={styles.text}>{challenge.description}</Text>}
          <Text style={styles.meta}>Starts: {dateLabel(challenge.starts_at)}{'\n'}Ends: {dateLabel(challenge.ends_at)}</Text>
          <Text style={styles.text}>Classes: {challenge.classes?.map((row) => row.name).join(', ') || 'None assigned'}</Text>
          <Text style={styles.meta}>{challenge.eligible_student_count ?? '-'} eligible students</Text>
          <View style={styles.wrap}>
            {challenge.status === 'draft' && <><AdminButton title="Edit" secondary disabled={busy} onPress={() => setEditor({ draft: challenge })} />
              <AdminButton title="Activate" disabled={busy} onPress={() => confirmTransition(challenge, 'activate')} /></>}
            {challenge.status === 'active' && <AdminButton title="Complete" disabled={busy} onPress={() => confirmTransition(challenge, 'complete')} />}
            {['draft', 'active'].includes(challenge.status) && <AdminButton title="Cancel" danger disabled={busy} onPress={() => confirmTransition(challenge, 'cancel')} />}
          </View>
        </View>)}
    </>}
  </AdminPage>;
}
