import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import { AdminPage, AdminButton, styles, useAdminResource } from '../components/AdminUI';

function Avatar({ uri }) {
  const [failed, setFailed] = useState(false);
  return uri && !failed ? <Image source={{ uri }} style={styles.avatar} onError={() => setFailed(true)} /> :
    <Ionicons name="person-circle-outline" size={36} color={COLORS.textTertiary} />;
}

function ClassDetail({ id, onBack }) {
  const fetcher = useCallback(() => api.adminGetClass(id), [id]);
  const resource = useAdminResource(fetcher);
  const detail = resource.data;
  return <AdminPage title="Class" subtitle="Class membership" resource={resource}
    right={<AdminButton title="Back" secondary onPress={onBack} />}>
    {detail && <>
      <View style={styles.card}><Text style={styles.title}>{detail.name}</Text>{detail.grade != null && <Text style={styles.meta}>Grade {detail.grade}</Text>}</View>
      {[['Students', detail.students], ['Teachers', detail.teachers]].map(([title, rows]) => <View key={title} style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {!rows.length ? <Text style={styles.text}>No {title.toLowerCase()} assigned.</Text> : rows.map((row) => <View key={row.user_id} style={styles.row}>
          <Avatar key={row.user_id + (row.avatar_url || '')} uri={row.avatar_url} /><Text style={[styles.text, styles.grow]}>{row.display_name || 'Member'}</Text>
        </View>)}
      </View>)}
    </>}
  </AdminPage>;
}

export default function AdminClassesScreen() {
  const [selected, setSelected] = useState(null);
  // Unmount the catalogue while showing detail to avoid duplicate focus requests.
  return selected ? <ClassDetail key={selected} id={selected} onBack={() => setSelected(null)} /> : <ClassList onSelect={setSelected} />;
}

function ClassList({ onSelect }) {
  const resource = useAdminResource(api.adminListClasses);
  return <AdminPage title="Classes" subtitle="Students and teachers in each class" resource={resource}>
    {!resource.data?.length ? <View style={styles.card}><Text style={styles.title}>No classes yet</Text><Text style={styles.text}>Classes will appear here when available.</Text></View> : resource.data.map((row) =>
      <TouchableOpacity accessibilityRole="button" key={row.id} style={[styles.card, styles.row]} onPress={() => onSelect(row.id)}>
        <Ionicons name="people" size={26} color={COLORS.primary} /><View style={styles.grow}>
          <Text style={styles.title}>{row.name}</Text>{row.grade != null && <Text style={styles.meta}>Grade {row.grade}</Text>}
          <Text style={styles.meta}>{row.student_count} students / {row.teacher_count} teachers</Text>
        </View><Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
      </TouchableOpacity>)}
  </AdminPage>;
}
