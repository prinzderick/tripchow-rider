import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { rider } from '../api/endpoints';
import { Card, Badge, Money, EmptyState, LoadingScreen } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';

// PWA uses period filters: today / week / month — NOT status filters
const PERIOD_FILTERS = [
  { key: 'all',   label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This week' },
  { key: 'month', label: 'This month' },
] as const;

type Period = (typeof PERIOD_FILTERS)[number]['key'];

const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  delivered:  { label: 'Delivered',  variant: 'success' },
  cancelled:  { label: 'Cancelled',  variant: 'danger'  },
  failed:     { label: 'Failed',     variant: 'danger'  },
  picked_up:  { label: 'Picked up',  variant: 'info'    },
  on_the_way: { label: 'En route',   variant: 'info'    },
};

export default function DeliveriesScreen() {
  const [period, setPeriod] = useState<Period>('all');

  const {
    data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['deliveries', period],
    queryFn:  ({ pageParam = 1 }) =>
      // Pass period to API — matches PWA: /rider/deliveries?period=today|week|month
      rider.deliveries(pageParam, period === 'all' ? undefined : period).then(r => r.data.data),
    getNextPageParam: (last) =>
      last.pagination?.current_page < last.pagination?.last_page
        ? last.pagination.current_page + 1
        : undefined,
    initialPageParam: 1,
  });

  if (isLoading) return <LoadingScreen />;

  const allItems = data?.pages.flatMap(p => p.items || p) ?? [];

  const renderItem = ({ item: d }: { item: any }) => {
    const st      = STATUS_MAP[d.status] || { label: d.status, variant: 'neutral' };
    const date    = new Date(d.delivered_at || d.created_at);
    const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return (
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ref}>{d.order_reference || d.reference}</Text>
            <Text style={styles.restaurant} numberOfLines={1}>{d.restaurant_name}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Badge label={st.label} variant={st.variant} />
            <Money kobo={d.rider_earnings || d.delivery_fee || 0} size={Typography.base} style={{ color: Colors.success }} />
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.meta}>🏠 {d.delivery_address || d.dropoff_address}</Text>
          <Text style={styles.time}>{dateStr} · {timeStr}</Text>
          {(d.customer_rating ?? 0) > 0 && (
            <Text style={{ fontSize: 11, color: Colors.warning, fontFamily: 'Manrope-SemiBold', marginTop: 2 }}>
              ⭐ {d.customer_rating} customer rating
            </Text>
          )}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Deliveries</Text>
      </View>

      {/* Period filter chips */}
      <View style={styles.filters}>
        {PERIOD_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setPeriod(f.key)}
            style={[styles.chip, period === f.key && styles.chipActive]}>
            <Text style={[styles.chipText, period === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={allItems}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand} />
        }
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <EmptyState
            icon="📭"
            title="No deliveries yet"
            subtitle={period === 'all' ? 'Completed deliveries will appear here' : `No deliveries for this ${period}`}
          />
        }
        ListFooterComponent={isFetchingNextPage ? (
          <Text style={styles.loadMore}>Loading more…</Text>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  header:        { padding: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:         { fontSize: Typography.xl, fontFamily: 'Manrope-ExtraBold', color: Colors.text },
  filters:       { flexDirection: 'row', gap: 8, padding: Spacing.md, paddingHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chip:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:    { backgroundColor: Colors.brand, borderColor: Colors.brand },
  chipText:      { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: Colors.text3 },
  chipTextActive:{ color: '#fff' },
  list:          { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  card:          { padding: Spacing.md, gap: 8 },
  cardTop:       { flexDirection: 'row', gap: Spacing.md },
  ref:           { fontSize: Typography.sm, fontFamily: 'Manrope-SemiBold', color: Colors.text3, marginBottom: 2 },
  restaurant:    { fontSize: Typography.base, fontFamily: 'Manrope-Bold', color: Colors.text },
  cardBottom:    { gap: 2 },
  meta:          { fontSize: Typography.sm, color: Colors.text2, fontFamily: 'Manrope-Regular' },
  time:          { fontSize: 11, color: Colors.text3, fontFamily: 'Manrope-Regular' },
  loadMore:      { textAlign: 'center', padding: Spacing.lg, color: Colors.text3, fontFamily: 'Manrope-Regular' },
});
