import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wallet, rider } from '../api/endpoints';
import { Card, Badge, Money, EmptyState, LoadingScreen, Button } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';

const TXN_ICONS: Record<string, string> = {
  delivery_earning: '🛵',
  payout:           '🏦',
  bonus:            '🎁',
  adjustment:       '⚙️',
  deduction:        '➖',
};

export default function WalletScreen() {
  const qc = useQueryClient();

  const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn:  () => wallet.summary().then(r => r.data.data),
  });

  const [earningsPeriod, setEarningsPeriod] = React.useState<'today' | 'week' | 'month'>('week');

  const { data: earningsData } = useQuery({
    queryKey: ['earnings'],
    queryFn:  () => rider.earnings().then(r => r.data.data),
  });

  const { data: breakdown } = useQuery({
    queryKey: ['earnings-breakdown', earningsPeriod],
    queryFn:  () => rider.earningsBreakdown(earningsPeriod).then(r => r.data.data),
  });

  const {
    data: ledger, fetchNextPage, hasNextPage, isFetchingNextPage, refetch: refetchLedger,
  } = useInfiniteQuery({
    queryKey: ['ledger'],
    queryFn:  ({ pageParam = 1 }) => wallet.ledger(pageParam).then(r => r.data.data),
    getNextPageParam: (last) =>
      last.pagination?.current_page < last.pagination?.last_page
        ? last.pagination.current_page + 1
        : undefined,
    initialPageParam: 1,
  });

  const payoutMutation = useMutation({
    mutationFn: async () => {
      const accountsRes = await rider.getBankAccounts();
      const accounts = accountsRes.data.data || [];
      if (!accounts.length) throw new Error('No bank account saved. Add one in the More tab first.');
      const bal = walletData?.balance || 0;
      return rider.withdraw(bal, accounts[0].id).then(r => r.data);
    },
    onSuccess:  () => {
      Alert.alert('Withdrawal requested', 'Your funds will be sent to your bank account shortly.');
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['ledger'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message || e.response?.data?.message || 'Withdrawal failed'),
  });

  const handlePayout = () => {
    const bal = walletData?.balance || 0;
    if (bal < 50000) { // ₦500 minimum
      Alert.alert('Minimum balance', 'You need at least ₦500 to request a payout.');
      return;
    }
    Alert.alert(
      'Request payout',
      `Withdraw your wallet balance to your registered bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request payout', onPress: () => payoutMutation.mutate() },
      ]
    );
  };

  if (walletLoading) return <LoadingScreen />;

  const balance  = walletData?.balance  || 0;
  const earnings = earningsData;
  const txns     = ledger?.pages.flatMap(p => p.items || p) ?? [];

  const renderTxn = ({ item: t }: { item: any }) => {
    const credit = (t.type || '').includes('earning') || (t.type || '').includes('bonus') || t.amount > 0;
    const date   = new Date(t.created_at);
    const icon   = TXN_ICONS[t.type] || '💰';

    return (
      <View style={styles.txnRow}>
        <View style={styles.txnIcon}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.txnDesc}>{t.description || t.type?.replace(/_/g, ' ') || 'Transaction'}</Text>
          <Text style={styles.txnDate}>
            {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ·{' '}
            {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={[styles.txnAmount, { color: credit ? Colors.success : Colors.danger }]}>
          {credit ? '+' : '-'}₦{Math.abs(t.amount / 100).toLocaleString('en-NG')}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={txns}
        keyExtractor={item => item.id}
        renderItem={renderTxn}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { refetchWallet(); refetchLedger(); }}
            tintColor={Colors.brand}
          />
        }
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Wallet</Text>
            </View>

            {/* Balance card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available balance</Text>
              <Money kobo={balance} size={36} style={{ color: '#fff', marginVertical: 8 }} />
              <Button
                label="Request payout"
                onPress={handlePayout}
                loading={payoutMutation.isPending}
                style={{ backgroundColor: 'rgba(255,255,255,.2)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,.4)' }}
                size="sm"
              />
            </View>

            {/* Earnings summary */}
            {earnings && (
              <View style={styles.earningsRow}>
                <EarnBox label="Today" kobo={earnings.today || 0} />
                <View style={styles.earnDivider} />
                <EarnBox label="This week" kobo={earnings.week || 0} />
                <View style={styles.earnDivider} />
                <EarnBox label="This month" kobo={earnings.month || 0} />
              </View>
            )}

            {/* Earnings breakdown by period */}
            <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
              <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>Earnings breakdown</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {(['today', 'week', 'month'] as const).map(p => (
                  <TouchableOpacity key={p} onPress={() => setEarningsPeriod(p)}
                    style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
                      borderColor: earningsPeriod === p ? Colors.brand : Colors.border,
                      backgroundColor: earningsPeriod === p ? Colors.brandLight : Colors.surface }}>
                    <Text style={{ fontSize: 12, fontFamily: 'Manrope-Bold', color: earningsPeriod === p ? Colors.brand : Colors.text3 }}>
                      {p === 'today' ? 'Today' : p === 'week' ? 'This week' : 'This month'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {breakdown && (
                <View style={{ backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontFamily: 'Manrope-ExtraBold', color: Colors.success }}>₦{((breakdown.total_earned || 0)/100).toLocaleString()}</Text>
                      <Text style={{ fontSize: 10, color: Colors.text3, fontFamily: 'Manrope-SemiBold' }}>EARNED</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontFamily: 'Manrope-ExtraBold', color: Colors.text }}>{breakdown.deliveries || 0}</Text>
                      <Text style={{ fontSize: 10, color: Colors.text3, fontFamily: 'Manrope-SemiBold' }}>DELIVERIES</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontFamily: 'Manrope-ExtraBold', color: Colors.text }}>₦{breakdown.avg_per_delivery ? ((breakdown.avg_per_delivery)/100).toLocaleString('en-NG', {maximumFractionDigits:0}) : 0}</Text>
                      <Text style={{ fontSize: 10, color: Colors.text3, fontFamily: 'Manrope-SemiBold' }}>AVG/DELIVERY</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Transactions header */}
            <Text style={styles.sectionLabel}>Transaction history</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="💸"
            title="No transactions yet"
            subtitle="Your earnings and withdrawals will appear here"
          />
        }
        ListFooterComponent={isFetchingNextPage
          ? <Text style={styles.loadMore}>Loading more…</Text>
          : null}
      />
    </SafeAreaView>
  );
}

const EarnBox: React.FC<{ label: string; kobo: number }> = ({ label, kobo }) => (
  <View style={styles.earnBox}>
    <Money kobo={kobo} size={Typography.lg} />
    <Text style={styles.earnLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.bg },
  header:       { padding: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:        { fontSize: Typography.xl, fontFamily: 'Manrope-ExtraBold', color: Colors.text },
  balanceCard:  { margin: Spacing.lg, borderRadius: 20, backgroundColor: Colors.brand, padding: Spacing.xl, alignItems: 'center' },
  balanceLabel: { fontSize: Typography.sm, color: 'rgba(255,255,255,.8)', fontFamily: 'Manrope-SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  earningsRow:  { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 14, marginHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.md },
  earnBox:      { flex: 1, alignItems: 'center', padding: Spacing.md, gap: 4 },
  earnDivider:  { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  earnLabel:    { fontSize: 10, color: Colors.text3, fontFamily: 'Manrope-SemiBold', textTransform: 'uppercase', letterSpacing: 0.3 },
  sectionLabel: { fontSize: 11, fontFamily: 'Manrope-Bold', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  txnRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 13, paddingHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  txnIcon:      { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  txnDesc:      { fontSize: Typography.base, fontFamily: 'Manrope-SemiBold', color: Colors.text, textTransform: 'capitalize' },
  txnDate:      { fontSize: 11, color: Colors.text3, fontFamily: 'Manrope-Regular', marginTop: 2 },
  txnAmount:    { fontSize: Typography.base, fontFamily: 'Manrope-Bold' },
  loadMore:     { textAlign: 'center', padding: Spacing.lg, color: Colors.text3 },
});
