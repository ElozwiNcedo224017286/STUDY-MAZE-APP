import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScannerAnimation from '../components/solver/ScannerAnimation';
import ImagePreviewScreen from '../components/solver/ImagePreviewScreen';
import AnalysisLoadingScreen from '../components/solver/AnalysisLoadingScreen';
import SolverResultScreen from '../components/solver/SolverResultScreen';
import FeatureTabBar from '../components/history/FeatureTabBar';
import FeatureHistoryTab from '../components/history/FeatureHistoryTab';
import { historyStorage } from '../services/historyStorage';
import { COLORS, SHADOWS } from '../theme/colors';
import { aiApi } from '../api/ai';

const TOOL = {
  id: 'solver',
  title: 'Smart Solver',
  description: 'Scan a question. Get taught steps.',
  color: COLORS.primary,
  gradient: COLORS.gradients.hero,
  lightGradient: ['rgba(109, 40, 217, 0.16)', 'rgba(139, 92, 246, 0.05)'],
};

export default function SmartSolverScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const cancelled = useRef(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [tab, setTab] = useState('start');
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');

  const loadHistory = useCallback(async () => {
    const items = await historyStorage.list('solver');
    setHistory(
      items.map((item) => ({
        id: item.id,
        title: item.result?.question || item.result?.subject || 'Solved question',
        subtitle: item.result?.final_answer || 'Open to view the taught steps',
        image: item.image,
        timestamp: item.timestamp,
        badge: item.result?.subject,
        entry: item,
      }))
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  function reset() {
    setSelectedImage(null);
    setAnalysisResult(null);
    setAnalysisProgress(0);
    setShowResult(false);
    setShowPreview(false);
    setIsAnalyzing(false);
  }

  function handleCapture(photo) {
    setShowScanner(false);
    setSelectedImage({ uri: photo.uri });
    setTimeout(() => setShowPreview(true), 100);
  }

  async function handleUploadPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery access is required to upload a question photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled) return;
    setSelectedImage({ uri: result.assets[0].uri });
    setShowPreview(true);
  }

  function simulateProgress() {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        if (cancelled.current) {
          clearInterval(interval);
          resolve();
          return;
        }
        progress += Math.random() * 12;
        if (progress >= 90) {
          clearInterval(interval);
          setAnalysisProgress(90);
          resolve();
        } else {
          setAnalysisProgress(Math.floor(progress));
        }
      }, 200);
    });
  }

  async function handleAnalyze() {
    if (!selectedImage) {
      Alert.alert('No image', 'Capture or upload a question first.');
      return;
    }
    cancelled.current = false;
    setShowPreview(false);
    setTimeout(() => {
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setAnalysisResult(null);
    }, 100);

    try {
      await simulateProgress();
      if (cancelled.current) return;

      const response = await aiApi.solveQuestion({ image: selectedImage });
      if (cancelled.current) return;

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Analysis failed');
      }

      setAnalysisProgress(100);
      setAnalysisResult(response.data);
      await historyStorage.add('solver', {
        image: selectedImage.uri,
        result: response.data,
      });
      loadHistory();
      setTimeout(() => {
        setIsAnalyzing(false);
        setTimeout(() => setShowResult(true), 100);
      }, 400);
    } catch (error) {
      setIsAnalyzing(false);
      let message = 'Unable to finish this solution. Please try again.';
      const raw = error.message || '';
      if (raw.includes('timeout') || raw.includes('Timeout')) {
        message = 'That took too long. Try a clearer, closer photo.';
      } else if (raw.includes('Network') || raw.includes('reach') || raw.includes('Flask')) {
        message = `Cannot reach Smart Learn at ${aiApi.getBaseUrl()}. Start the Flask backend and check the IP in .env.`;
      } else if (raw) {
        message = raw;
      }
      Alert.alert('Smart Solver', message);
    }
  }

  function handleCancelAnalysis() {
    Alert.alert('Cancel solving', 'Stop this solution?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => {
          cancelled.current = true;
          setIsAnalyzing(false);
          setAnalysisProgress(0);
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={TOOL.lightGradient}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
            </View>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{TOOL.title}</Text>
            <Text style={styles.headerDescription}>{TOOL.description}</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="scan" size={36} color={TOOL.color} />
          </View>
        </View>
      </LinearGradient>

      <FeatureTabBar active={tab} onChange={setTab} color={TOOL.color} />

      {tab === 'history' ? (
        <FeatureHistoryTab
          items={history}
          search={search}
          onSearch={setSearch}
          color={TOOL.color}
          emptyTitle="No solver history"
          emptyText="Scan a question first. Past solutions will appear here so you can revise them."
          onPress={(item) => {
            setSelectedImage({ uri: item.image });
            setAnalysisResult(item.entry.result);
            setShowResult(true);
          }}
          onDelete={async (item) => {
            await historyStorage.remove('solver', item.id);
            loadHistory();
          }}
        />
      ) : (
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.warning} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Scan tips</Text>
            <Text style={styles.infoText}>
              • Fill the frame with the question{'\n'}
              • Use bright, even light{'\n'}
              • One clear problem works best
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select image source</Text>
        <View style={styles.options}>
          <TouchableOpacity style={styles.optionCard} onPress={() => setShowScanner(true)} activeOpacity={0.8}>
            <LinearGradient colors={['rgba(109,40,217,0.14)', 'rgba(109,40,217,0.05)']} style={styles.optionGradient}>
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(109,40,217,0.16)' }]}>
                <Ionicons name="camera" size={28} color={TOOL.color} />
              </View>
              <Text style={styles.optionTitle}>Scan with camera</Text>
              <Text style={styles.optionText}>Live frame with AI scan line</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionCard} onPress={handleUploadPhoto} activeOpacity={0.8}>
            <LinearGradient colors={['rgba(99,102,241,0.14)', 'rgba(99,102,241,0.05)']} style={styles.optionGradient}>
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(99,102,241,0.16)' }]}>
                <Ionicons name="images" size={28} color={COLORS.info} />
              </View>
              <Text style={styles.optionTitle}>Upload photo</Text>
              <Text style={styles.optionText}>Pick from your gallery</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="sparkles" size={18} color={TOOL.color} />
            <Text style={styles.tipTitle}>What you get</Text>
          </View>
          <Text style={styles.tipText}>
            Smart Solver returns the question, taught steps, the final answer, a check, and a memory tip you can reuse in Quiz Rush.
          </Text>
        </View>
      </ScrollView>
      )}

      <ScannerAnimation
        visible={showScanner}
        onCapture={handleCapture}
        onClose={() => setShowScanner(false)}
        toolColor={TOOL.color}
      />
      <ImagePreviewScreen
        visible={showPreview}
        image={selectedImage?.uri}
        toolConfig={TOOL}
        onConfirm={handleAnalyze}
        onRetake={() => {
          setShowPreview(false);
          setSelectedImage(null);
          setTimeout(() => setShowScanner(true), 100);
        }}
        onClose={() => {
          setShowPreview(false);
          setSelectedImage(null);
        }}
      />
      <AnalysisLoadingScreen
        visible={isAnalyzing}
        progress={analysisProgress}
        toolConfig={TOOL}
        onCancel={handleCancelAnalysis}
      />
      <SolverResultScreen
        visible={showResult && analysisResult !== null}
        result={analysisResult}
        image={selectedImage?.uri}
        toolConfig={TOOL}
        onClose={() => {
          setShowResult(false);
          setTimeout(reset, 100);
        }}
        onNewAnalysis={reset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  header: { paddingBottom: 16, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  backButton: { marginRight: 12 },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  headerDescription: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3, fontWeight: '600' },
  headerIcon: { marginLeft: 8 },
  body: { padding: 20 },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.warningLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  infoCopy: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  infoText: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  options: { flexDirection: 'row', gap: 12 },
  optionCard: { flex: 1, borderRadius: 18, overflow: 'hidden', ...SHADOWS.small },
  optionGradient: { padding: 18, alignItems: 'center', minHeight: 168 },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 4 },
  optionText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '600' },
  tipCard: {
    marginTop: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.small,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  tipText: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary, fontWeight: '600' },
});
