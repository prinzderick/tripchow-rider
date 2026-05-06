import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '../api/endpoints';
import { EmptyState, LoadingScreen } from '../components';
import { Colors, Spacing, Typography } from '../theme';

export default function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['rider-notifications'],
      queryFn:  ({ pageParam = 1 }) => notifications.inbox(pageParam).then(r => r.data.data),
      getNextPageParam: (last) =>
        last.pagination?.current_page < last.pagination?.last_page
          ? last.pagination.current_page + 1 : undefined,
      initialPageParam: 1,
    });

  const markAll = useMutation({
    mutationFn: () => notifications.markAllRead(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['rider-notifications'] }),
  });

  const markOne = (id: string) => {
    notifications.markRead(id).then(() => qc.invalidateQueries({ queryKey: ['rider-notifications'] }));
  };

  if (isLoading) return <LoadingScreen />;

  const items = data?.pages.flatMap(p => p.items || p) ?? [];
  const hasUnread = items.some((n: any) => !n.read_at);

  const ICONS: Record<string, string> = {
    new_job_offer: '🛵', payout_processed: '💚',
    order_status_update: '📦', default: '🔔',
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
        {hasUnread && (
          <TouchableOpacity onPress={() => markAll.mutate()}>
            <Text style={{ color: Colors.brand, fontFamily: 'Manrope-Bold', fontSize: Typography.sm }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(i: any) => i.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.brand} />}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item: n }) => (
          <TouchableOpacity
            onPress={() => markOne(n.id)}
            style={[s.row, !n.read_at && { backgroundColor: Colors.brandLight }]}
            activeOpacity={0.75}>
            <View style={s.iconWrap}>
              <Text style={{ fontSize: 20 }}>{ICONS[n.type] || ICONS.default}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.notifTitle, !n.read_at && { fontFamily: 'Manrope-Bold' }]}>{n.title}</Text>
              <Text style={s.notifBody} numberOfLines={2}>{n.body}</Text>
              <Text style={s.notifTime}>
                {new Date(n.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
            {!n.read_at && <View style={s.unreadDot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="🔔" title="No notifications" subtitle="You're all caught up!" />}
        ListFooterComponent={isFetchingNextPage ? (
          <Text style={{ textAlign: 'center', padding: Spacing.lg, color: Colors.text3 }}>Loading…</Text>
        ) : null}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.bg },
  hdr:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  title:     { flex: 1, fontSize: Typography.xl, fontFamily: 'Manrope-ExtraBold', color: Colors.text },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconWrap:  { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  notifTitle:{ fontSize: Typography.base, fontFamily: 'Manrope-SemiBold', color: Colors.text },
  notifBody: { fontSize: Typography.sm, color: Colors.text3, fontFamily: 'Manrope-Regular', marginTop: 2 },
  notifTime: { fontSize: 11, color: Colors.text3, fontFamily: 'Manrope-Regular', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.brand, alignSelf: 'center' },
});
