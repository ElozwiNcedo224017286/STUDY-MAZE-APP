import StudyHero from '../components/learn/StudyHero';
import QuestAction from '../components/learn/QuestAction';
import StackHeader from '../components/StackHeader';
import { TYPE, SPACE, RADIUS, PAGE_CONTENT } from '../theme/layout';
import { useTheme } from '../context/ThemeContext';
import React, {useCallback, useRef, useState, useMemo } from 'react';
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
  const { colors: designColors, isDark: designDark } = useTheme();
  const COLORS = designColors;
  const styles = useMemo(() => createStyles(designColors), [designColors]);

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [picking, setPicking] = useState(false);

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
    if (picking) return;
    setPicking(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Photo access needed', 'Allow gallery access to choose a question photo.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8, preferredAssetRepresentationMode: 'compatible' });
      if (result.canceled) return;
      const image = result.assets?.[0];
      if (!image?.uri) throw new Error('The photo could not be read.');
      setSelectedImage({ uri: image.uri });
      setShowPreview(true);
    } catch { Alert.alert('Could not open that photo', 'Please choose the question photo again.'); }
    finally { setPicking(false); }
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
      <StatusBar barStyle={designDark ? 'light-content' : 'dark-content'} />
      <StackHeader title={TOOL.title} subtitle={TOOL.description} onBack={() => navigation.goBack()} />

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
        <StudyHero eyebrow="SCAN & SOLVE" title="From stuck to solved" description="Bring one clear question. Discover the steps that make it click." image={require('../../assets/Artwork/icon-quiz-tray.png')} />
        <Text style={styles.sectionTitle}>Choose your starting point</Text>
        <QuestAction icon="camera-outline" title="Scan a question" description="Frame a question with your camera." onPress={() => setShowScanner(true)} />
        <QuestAction icon="images-outline" title="Choose a photo" description="Use a question saved in your gallery." onPress={handleUploadPhoto} disabled={picking} />
        <TouchableOpacity onPress={() => setHelpOpen(value => !value)} accessibilityRole="button" accessibilityLabel="Tips for a clear scan" accessibilityState={{ expanded: helpOpen }} style={[styles.tipCard, { marginTop: SPACE.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}><Ionicons name="bulb-outline" size={21} color={COLORS.primaryText} /><Text style={[styles.tipTitle, { flex: 1 }]}>Tips for a clear scan</Text><Ionicons name={helpOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.primaryText} /></View>
          {helpOpen && <Text style={[styles.tipText, { marginTop: SPACE.md }]}>Use bright light, fill the frame with the text, and include one complete question.</Text>}
        </TouchableOpacity>
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

const createStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary
  },
  header: {
    paddingBottom: 16,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16
  },
  backButton: {
    marginRight: 12
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerText: {
    flex: 1
  },
  headerTitle: {
    ...TYPE.pageTitle,
    color: COLORS.textPrimary
  },
  headerDescription: {
    ...TYPE.body,
    color: COLORS.textSecondary,
    marginTop: 3
  },
  headerIcon: {
    marginLeft: 8
  },
  body: {
    ...PAGE_CONTENT,
    padding: 20
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.warningLight,
    padding: 14,
    marginBottom: 20,
    gap: 10,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  infoCopy: {
    flex: 1
  },
  infoTitle: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  infoText: {
    ...TYPE.body,
    color: COLORS.textSecondary
  },
  sectionTitle: {
    ...TYPE.sectionTitle,
    color: COLORS.textPrimary,
    marginBottom: 12
  },
  options: {
    flexDirection: 'row',
    gap: 12
  },
  optionCard: {
    flex: 1,
    overflow: 'hidden',
    ...SHADOWS.small,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  optionGradient: {
    padding: 18,
    alignItems: 'center',
    minHeight: 168
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  optionTitle: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4
  },
  optionText: {
    ...TYPE.caption,
    color: COLORS.textSecondary,
    textAlign: 'center'
  },
  tipCard: {
    marginTop: 20,
    backgroundColor: COLORS.surface,
    padding: 16,
    ...SHADOWS.small,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  tipTitle: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary
  },
  tipText: {
    ...TYPE.body,
    color: COLORS.textSecondary
  }
});
