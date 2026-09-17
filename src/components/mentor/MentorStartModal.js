import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../../theme/colors';
import { STUDY_MATERIAL_TYPES, mimeFromFileName } from '../../constants/studyFiles';

export default function MentorStartModal({ visible, onClose, navigation }) {
  const insets = useSafeAreaInsets();
  const [file, setFile] = useState(null);

  function close() {
    setFile(null);
    onClose();
  }

  async function pickMaterial() {
    const result = await DocumentPicker.getDocumentAsync({
      type: STUDY_MATERIAL_TYPES,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const picked = result.assets?.[0];
    if (!picked) return;
    setFile({
      ...picked,
      mimeType: picked.mimeType || mimeFromFileName(picked.name),
    });
  }

  function startGuided() {
    if (!file) {
      Alert.alert('Add a file first', 'Choose a PDF, Word, PowerPoint, or notes file first.');
      return;
    }
    close();
    navigation.getParent()?.navigate('TutorChat', {
      mode: 'guided',
      files: [{ uri: file.uri, name: file.name, mimeType: file.mimeType }],
      title: file.name,
    });
  }

  function startGeneral() {
    close();
    navigation.getParent()?.navigate('TutorChat', {
      mode: 'general',
      files: [],
      title: 'Open session',
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <LinearGradient colors={COLORS.gradients.hero} style={styles.badge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="sparkles" size={18} color={COLORS.white} />
            </LinearGradient>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Maze Mentor</Text>
              <Text style={styles.subtitle}>How do you want to start?</Text>
            </View>
            <TouchableOpacity style={styles.close} onPress={close} hitSlop={10}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.option} onPress={startGeneral} activeOpacity={0.88}>
            <View style={[styles.icon, styles.iconSoft]}>
              <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>Start free chat</Text>
              <Text style={styles.optionText}>Ask anything — voice, photos, or extra files later.</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.option}>
            <View style={[styles.icon, styles.iconSoft]}>
              <Ionicons name="cloud-upload" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>Study with material</Text>
              <Text style={styles.optionText}>Ground the session in your PDF or notes.</Text>
              <TouchableOpacity style={styles.pick} onPress={pickMaterial} activeOpacity={0.85}>
                <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                <Text style={styles.pickText} numberOfLines={1}>
                  {file ? file.name : 'Choose PDF, Word, PowerPoint, or notes'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primary, !file && styles.primaryOff]}
                onPress={startGuided}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryText}>Start guided session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 16, 48, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    ...SHADOWS.large,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, marginLeft: 12 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSoft: { backgroundColor: COLORS.primarySoft },
  optionCopy: { flex: 1, marginLeft: 12, marginRight: 8 },
  optionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  optionText: { fontSize: 12, lineHeight: 17, color: COLORS.textSecondary, fontWeight: '600', marginTop: 3 },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickText: { flex: 1, color: COLORS.textPrimary, fontWeight: '700', fontSize: 13 },
  primary: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryOff: { opacity: 0.4 },
  primaryText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
});
