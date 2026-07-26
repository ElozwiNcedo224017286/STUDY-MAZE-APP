import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const REWARDS = [
  { icon: '📶', name: '50MB Data Bundle', partner: 'Vodacom', cost: 40 },
  { icon: '☎️', name: 'R10 Airtime', partner: 'MTN', cost: 50 },
  { icon: '🛒', name: 'R50 Voucher', partner: 'Takealot', cost: 100 },
  { icon: '🥫', name: 'R30 Grocery Voucher', partner: 'Shoprite', cost: 70 },
  { icon: '🧺', name: 'R30 Voucher', partner: 'Pick n Pay', cost: 70 }
];

export default function ShopScreen({ navigation }) {
  const { user, syncProgress } = useAuth();
  const [toast, setToast] = useState('');

  async function redeem(reward) {
    if ((user.coins || 0) < reward.cost) return;
    await syncProgress({ coins: user.coins - reward.cost });
    setToast(`Redeemed ${reward.name} from ${reward.partner}! 🎉`);
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.topnav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Text style={styles.backBtnText}>‹</Text></TouchableOpacity>
        <Text style={styles.title}>Rewards Shop</Text>
      </View>
      <Text style={styles.sub}>Redeem coins for real rewards from our partners. Balance: {user?.coins ?? 0} 🪙</Text>

      {REWARDS.map((r) => {
        const canAfford = (user?.coins ?? 0) >= r.cost;
        return (
          <View key={r.name} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.icon}>{r.icon}</Text>
              <View>
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.partner}>{r.partner}</Text>
              </View>
            </View>
            <View style={styles.right}>
              <Text style={styles.cost}>{r.cost} 🪙</Text>
              <TouchableOpacity style={[styles.redeemBtn, !canAfford && styles.redeemBtnDisabled]} disabled={!canAfford} onPress={() => redeem(r)}>
                <Text style={styles.redeemBtnText}>Redeem</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {!!toast && <Text style={styles.toast}>{toast}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 18, paddingTop: 50 },
  topnav: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: colors.ink, fontSize: 18 },
  title: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  sub: { color: colors.inkDim, fontSize: 12.5, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.wallEdge, borderRadius: 12, padding: 12, marginBottom: 10 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  icon: { fontSize: 20 },
  name: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  partner: { color: colors.inkDim, fontSize: 10.5, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cost: { color: colors.gold, fontSize: 11, fontWeight: '800' },
  redeemBtn: { backgroundColor: colors.gold, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 11 },
  redeemBtnDisabled: { backgroundColor: '#4a4560' },
  redeemBtnText: { color: '#332600', fontWeight: '700', fontSize: 11 },
  toast: { color: colors.mint, fontSize: 12.5, textAlign: 'center', marginTop: 8 }
});
