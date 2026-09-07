import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme/colors';

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function FeatureHistoryTab({
  items,
  search,
  onSearch,
  onPress,
  onDelete,
  emptyTitle,
  emptyText,
  color = COLORS.primary,
}) {
  const query = (search || '').trim().toLowerCase();
  const filtered = query
    ? items.filter((item) =>
        `${item.title || ''} ${item.subtitle || ''}`.toLowerCase().includes(query)
      )
    : items;

  function confirmDelete(item) {
    Alert.alert('Delete this item?', 'This will remove it from your history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item) },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={COLORS.textTertiary} />
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder="Search history"
          placeholderTextColor={COLORS.textTertiary}
          style={styles.search}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="time-outline" size={36} color={COLORS.border} />
            </View>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.82}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbIcon]}>
                <Ionicons name={item.icon || 'chatbubbles'} size={20} color={color} />
              </View>
            )}
            <View style={styles.copy}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              {item.subtitle ? (
                <Text style={styles.subtitle} numberOfLines={2}>{item.subtitle}</Text>
              ) : null}
              <View style={styles.meta}>
                <Ionicons name="time-outline" size={13} color={COLORS.textTertiary} />
                <Text style={styles.date}>{formatDate(item.timestamp)}</Text>
                {item.badge ? (
                  <View style={styles.badge}>
                    <Text style={[styles.badgeText, { color }]}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <TouchableOpacity style={styles.trash} onPress={() => confirmDelete(item)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    ...SHADOWS.small,
  },
  search: { flex: 1, height: 44, color: COLORS.textPrimary, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 28, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    ...SHADOWS.small,
  },
  thumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: COLORS.backgroundSecondary },
  thumbIcon: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 12, marginRight: 8 },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, lineHeight: 17, color: COLORS.textSecondary, fontWeight: '600', marginTop: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  date: { fontSize: 11, color: COLORS.textTertiary, fontWeight: '600' },
  badge: { marginLeft: 6, backgroundColor: COLORS.primarySoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  trash: { padding: 6 },
  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '600' },
});
