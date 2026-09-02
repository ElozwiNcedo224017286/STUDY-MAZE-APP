import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const REWARDS = [
  { icon: '📶', name: '50MB Data Bundle', partner: 'Vodacom', cost: 40 },
  { icon: '☎️', name: 'R10 Airtime', partner: 'MTN', cost: 50 },
  { icon: '🛒', name: 'R50 Voucher', partner: 'Takealot', cost: 100 },
  { icon: '🥫', name: 'R30 Grocery Voucher', partner: 'Shoprite', cost: 70 },
  { icon: '🧺', name: 'R30 Voucher', partner: 'Pick n Pay', cost: 70 },
];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [toast, setToast] = useState('');
  const coins = user?.coins ?? 0;

  function redeem(reward) {
    if (coins < reward.cost) return;
    setToast(`Unlocked ${reward.name} from ${reward.partner}.`);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundSecondary} />
      <ScreenHeader
        title="Rewards"
        titleHighlight="Shop"
        subtitle="Earn coins by playing. Unlock partner rewards once you reach each goal."
      />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={COLORS.gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balance}>
          <Text style={styles.balanceLabel}>Coins earned</Text>
          <Text style={styles.balanceValue}>{coins}</Text>
          <Text style={styles.balanceHint}>Coins are an earned total — unlocking a reward does not spend them down.</Text>
        </LinearGradient>

        {REWARDS.map((r) => {
          const canAfford = coins >= r.cost;
          return (
            <View key={r.name} style={styles.row}>
              <View style={styles.iconWrap}><Text style={styles.icon}>{r.icon}</Text></View>
              <View style={styles.info}>
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.partner}>{r.partner} · {r.cost} coins</Text>
              </View>
              <TouchableOpacity
                style={[styles.redeem, !canAfford && styles.redeemOff]}
                disabled={!canAfford}
                onPress={() => redeem(r)}
              >
                <Text style={[styles.redeemText, !canAfford && styles.redeemTextOff]}>{canAfford ? 'Unlock' : 'Earn more'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        {!!toast && <Text style={styles.toast}>{toast}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  balance: { borderRadius: 20, padding: 20, marginBottom: 16, ...SHADOWS.medium },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 12 },
  balanceValue: { color: COLORS.white, fontSize: 36, fontWeight: '900', marginTop: 4 },
  balanceHint: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 8, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  partner: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  redeem: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  redeemOff: { backgroundColor: COLORS.backgroundTertiary },
  redeemText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  redeemTextOff: { color: COLORS.textTertiary },
  toast: { color: COLORS.success, textAlign: 'center', marginTop: 8, fontWeight: '600' },
});
