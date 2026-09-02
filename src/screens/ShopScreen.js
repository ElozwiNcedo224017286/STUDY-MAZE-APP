import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, SHADOWS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import NavigationDock from '../components/NavigationDock';

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

<<<<<<< HEAD
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
=======
return (
  <View style={styles.screen}>
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topnav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Rewards Shop</Text>
      </View>

      <Text style={styles.sub}>
        Earn coins by playing to unlock real rewards from our partners.
        Earned: {user?.coins ?? 0} 🪙
      </Text>

      {REWARDS.map((r) => {
        const canAfford = (user?.coins ?? 0) >= r.cost;

        return (
          <View key={r.name} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.icon}>{r.icon}</Text>

              <View>
>>>>>>> origin/aphile-ui-changes
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.partner}>{r.partner} · {r.cost} coins</Text>
              </View>
<<<<<<< HEAD
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
=======
            </View>

            <View style={styles.right}>
              <Text style={styles.cost}>{r.cost} 🪙</Text>

              <TouchableOpacity
                style={[
                  styles.redeemBtn,
                  !canAfford && styles.redeemBtnDisabled,
                ]}
                disabled={!canAfford}
                onPress={() => redeem(r)}
              >
                <Text style={styles.redeemBtnText}>Redeem</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {!!toast && <Text style={styles.toast}>{toast}</Text>}
    </ScrollView>

    <NavigationDock
      navigation={navigation}
      activeRoute="Shop"
    />
  </View>
);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 50,

    // IMPORTANT:
    // Gives the last reward enough room to scroll
    // above the floating NavigationDock.
    paddingBottom: 180,
  },

  topnav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backBtnText: {
    color: colors.ink,
    fontSize: 18,
  },

  title: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 14,
  },

  sub: {
    color: colors.inkDim,
    fontSize: 12.5,
    marginBottom: 14,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.wallEdge,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  icon: {
    fontSize: 20,
  },

  name: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
  },

  partner: {
    color: colors.inkDim,
    fontSize: 10.5,
    marginTop: 2,
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  cost: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
  },

  redeemBtn: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },

  redeemBtnDisabled: {
    backgroundColor: '#4a4560',
  },

  redeemBtnText: {
    color: '#332600',
    fontWeight: '700',
    fontSize: 11,
  },

  toast: {
    color: colors.mint,
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 8,
  },
>>>>>>> origin/aphile-ui-changes
});
