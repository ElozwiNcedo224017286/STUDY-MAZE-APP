import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import NavigationDock from '../components/NavigationDock';

const GAMES = [
  { key: 'MazeLevels', emoji: '🧩', name: 'Maze Runner', desc: 'Dodge ghosts, collect tokens, answer quiz nodes. 3 levels.' },
  { key: 'QuizRush', emoji: '⚡', name: 'Quiz Rush', desc: 'Beat the clock on rapid-fire questions. 3 lives.' },
  { key: 'MemoryFlip', emoji: '🧠', name: 'Memory Flip', desc: 'Match subject pairs before the 60s timer runs out.' }
];

export default function HubScreen({ navigation }) {
  const { user, hasClaimedDailyReward, claimDailyReward } = useAuth();
  const [quizMeta, setQuizMeta] = useState(null);

  const [showDailyReward, setShowDailyReward] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      const { meta } = await api.getQuizBank();
      setQuizMeta(meta);
    } catch (e) { /* backend may be offline in dev — fail quietly here */ }
  }, []);

  const checkDailyReward = useCallback(async () => {
  if (!user) return;

  try {
    const claimed = await hasClaimedDailyReward();

    if (!claimed) {
      setRewardClaimed(false);
      setShowDailyReward(true);
    }
  } catch (e) {
    console.warn('Failed to check daily reward:', e.message);
  }
}, [user, hasClaimedDailyReward]);

const handleClaimDailyReward = async () => {
  if (claimingReward) return;

  try {
    setClaimingReward(true);

    const result = await claimDailyReward();

    if (result.claimed) {
      setRewardClaimed(true);
    }
  } catch (e) {
    console.warn('Failed to claim daily reward:', e.message);
  } finally {
    setClaimingReward(false);
  }
};

useFocusEffect(
  useCallback(() => {
    loadMeta();
    checkDailyReward();
  }, [loadMeta, checkDailyReward])
);


  return (
    <>
    <Modal visible={showDailyReward} transparent animationType="fade" onRequestClose={() => setShowDailyReward(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.rewardCard}>

      <TouchableOpacity style={styles.closeRewardBtn} onPress={() => setShowDailyReward(false)}>
        <Text style={styles.closeRewardText}>×</Text>
      </TouchableOpacity>

      {!rewardClaimed ? (
        <>
          <Text style={styles.rewardEmoji}>🎁</Text>

          <Text style={styles.rewardTitle}> Daily Reward </Text>

          <Text style={styles.rewardSubtitle}> Welcome back, {user?.username}! </Text>

          <Text style={styles.rewardDescription}> Claim your daily reward and receive </Text>

          <Text style={styles.rewardCoins}> 🪙 25 Coins </Text>

          <TouchableOpacity
            style={styles.claimRewardBtn}
            onPress={handleClaimDailyReward}
            disabled={claimingReward}
          >
            <Text style={styles.claimRewardText}>
              {claimingReward ? 'Claiming...' : 'Claim 25 Coins'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.rewardEmoji}>🎉</Text>

          <Text style={styles.rewardTitle}>Reward Claimed! </Text>

          <Text style={styles.rewardSubtitle}> You earned 25 coins!</Text>

          <Text style={styles.rewardDescription}> Come back tomorrow to claim another daily reward.</Text>

          <TouchableOpacity
            style={styles.closeRewardAction}
            onPress={() => setShowDailyReward(false)}
          >
            <Text style={styles.closeRewardActionText}>
              Continue
            </Text>
          </TouchableOpacity>
        </>
      )}

      </View>
    </View>
    </Modal>

    <View style={styles.screen}>
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Hey, <Text style={styles.username}>{user?.username}</Text></Text>
        <View style={styles.headerActions}>
          <View style={styles.coinPill}><Text style={styles.coinText}>🪙 {user?.coins ?? 0}</Text></View>
  
        </View>
      </View>

      {quizMeta && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>📚 Custom quiz active: {quizMeta.topic} (by {quizMeta.teacher})</Text>
        </View>
      )}

      {user?.role === 'teacher' && (
        <TouchableOpacity style={styles.teacherBtn} onPress={() => navigation.navigate('TeacherDashboard')}>
          <Text style={styles.teacherBtnText}>🧑‍🏫 Teacher Dashboard</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Choose a Game</Text>
      {GAMES.map((g) => (
        <View key={g.key} style={styles.gameCard}>
          <Text style={styles.gameEmoji}>{g.emoji}</Text>
          <View style={styles.gameInfo}>
            <Text style={styles.gameName}>{g.name}</Text>
            <Text style={styles.gameDesc}>{g.desc}</Text>
          </View>
          <TouchableOpacity style={styles.playBtn} onPress={() => navigation.navigate(g.key)}>
            <Text style={styles.playBtnText}>Play</Text>
          </TouchableOpacity>
        </View>
      ))}

    </ScrollView>
    <NavigationDock navigation={navigation} activeRoute="Hub"/>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 150,},
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  welcome: { color: colors.inkDim, fontSize: 13 },
  username: { color: colors.gold, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  coinPill: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  coinText: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  badge: { backgroundColor: 'rgba(6,255,165,0.1)', borderWidth: 2, borderColor: colors.mint, borderRadius: 10, padding: 10, marginBottom: 14 },
  badgeText: { color: colors.mint, fontSize: 12 },
  teacherBtn: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 16 },
  teacherBtnText: { color: '#062B1F', fontWeight: '800', fontSize: 14 },
  sectionTitle: { color: colors.gold, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  gameCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 14, padding: 14, marginBottom: 12 },
  gameEmoji: { fontSize: 28, width: 40, textAlign: 'center' },
  gameInfo: { flex: 1 },
  gameName: { color: colors.ink, fontWeight: '700', fontSize: 14.5 },
  gameDesc: { color: colors.inkDim, fontSize: 11.5, marginTop: 3, lineHeight: 15 },
  playBtn: { backgroundColor: colors.mint, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  playBtnText: { color: '#062B1F', fontWeight: '700', fontSize: 12 }, 
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 24,},
  rewardCard: { width: '100%', maxWidth: 360, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 20, padding: 26, alignItems: 'center', position: 'relative',},
  closeRewardBtn: {position: 'absolute', top: 8, right: 10, width: 30, height: 30, alignItems: 'center', justifyContent: 'center',},
  closeRewardText: {color: colors.inkDim, fontSize: 26, fontWeight: '700', },
  rewardEmoji: { fontSize: 48, marginBottom: 10, },
  rewardTitle: { color: colors.gold, fontSize: 22, fontWeight: '900', marginBottom: 8, },
  rewardSubtitle: { color: colors.ink, fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 10, },
  rewardDescription: { color: colors.inkDim, fontSize: 12, textAlign: 'center', lineHeight: 18, },
  rewardCoins: { color: colors.gold, fontSize: 24, fontWeight: '900', marginTop: 12, marginBottom: 20, },
  claimRewardBtn: { width: '100%', backgroundColor: colors.mint, borderRadius: 12, paddingVertical: 14, alignItems: 'center', },
  claimRewardText: { color: '#062B1F', fontSize: 14, fontWeight: '900', },
  closeRewardAction: { width: '100%', backgroundColor: colors.teal, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 18, },
  closeRewardActionText: { color: '#062B1F', fontSize: 14, fontWeight: '900',},

});
