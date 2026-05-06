import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Switch, Alert, RefreshControl, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rider, jobs } from '../api/endpoints';
import { useAuthStore } from '../store/auth';
import { Card, Badge, Money, LoadingScreen, Button } from '../components';
import { Colors, Spacing, Typography, Radius, Shadow } from '../theme';

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') return true;
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export default function HomeScreen() {
  const user        = useAuthStore(s => s.user);
  const qc          = useQueryClient();
  const watchIdRef  = useRef<number | null>(null);

  const { data: dash, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => rider.dashboard().then(r => r.data.data),
    refetchInterval: (dash?.online_status === 'online' || dash?.online_status === 'on_delivery') ? 10_000 : false,
  });

  const toggleMutation = useMutation({
    mutationFn: (online: boolean) => rider.setOnline(online).then(r => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
    onError:    (e: any) => Alert.alert('Error', e.response?.data?.message || 'Failed to update status'),
  });

  const acceptMutation = useMutation({
    mutationFn: (assignId: string) => jobs.accept(assignId).then(r => r.data),
    onSuccess:  () => {
      Vibration.vibrate([0, 100, 50, 100]);
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.message || 'Could not accept job'),
  });

  const rejectMutation = useMutation({
    mutationFn: (assignId: string) => jobs.reject(assignId).then(r => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const { data: available } = useQuery({
    queryKey: ['jobs'],
    queryFn:  () => jobs.available().then(r => r.data.data),
    enabled:  dash?.online_status === 'online' && !dash?.active_delivery,
    refetchInterval: dash?.online_status === 'online' ? 8_000 : false,
  });

  // Incentives/targets — matches PWA GET /rider/incentives
  const { data: incentives } = useQuery({
    queryKey: ['rider-incentives'],
    queryFn:  () => rider.incentives().then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: incentives } = useQuery({
    queryKey: ['rider-incentives'],
    queryFn:  () => rider.incentives().then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  // Start/stop GPS tracking when online status changes
  useEffect(() => {
    const isOnline = dash?.online_status === 'online' || dash?.online_status === 'on_delivery';
    if (isOnline) {
      startTracking();
    } else {
      stopTracking();
    }
    return () => stopTracking();
  }, [dash?.online_status]);

  const startTracking = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;
    watchIdRef.current = Geolocation.watchPosition(
      ({ coords }) => { rider.updateLocation(coords.latitude, coords.longitude).catch(() => {}); },
      () => {},
      { enableHighAccuracy: true, distanceFilter: 20, interval: 15000, fastestInterval: 10000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const handleToggle = () => {
    const goOnline = dash?.online_status !== 'online';
    if (goOnline) {
      Alert.alert('Go online', 'You will start receiving delivery jobs. Make sure you are ready.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go online', onPress: () => toggleMutation.mutate(true) },
      ]);
    } else {
      if (dash?.active_delivery) {
        Alert.alert('Active delivery', 'Complete your current delivery before going offline.');
        return;
      }
      toggleMutation.mutate(false);
    }
  };

  if (isLoading) return <LoadingScreen message="Loading dashboard…" />;

  const isOnline     = dash?.online_status === 'online';
  const isDelivering = dash?.online_status === 'on_delivery';
  const active       = dash?.active_delivery;
  const stats        = dash?.stats;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.brand} />}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey {user?.first_name} 👋</Text>
            <Text style={styles.subGreeting}>
              {isDelivering ? 'Delivery in progress' : isOnline ? 'You are online' : 'You are offline'}
            </Text>
          </View>
          <View style={styles.onlineToggle}>
            <Text style={[styles.onlineLabel, { color: isOnline || isDelivering ? Colors.success : Colors.text3 }]}>
              {isOnline || isDelivering ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline || isDelivering}
              onValueChange={handleToggle}
              disabled={toggleMutation.isPending || isDelivering}
              trackColor={{ false: Colors.border, true: Colors.success }}
              thumbColor={Colors.surface}
            />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox label="Today"     value={stats?.deliveries_today ?? 0} unit="deliveries" />
          <View style={styles.statDivider} />
          <StatBox label="This week" value={stats?.deliveries_week ?? 0} unit="deliveries" />
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Money kobo={stats?.earned_today ?? 0} size={Typography.xl} style={{ color: Colors.success }} />
            <Text style={styles.statLabel}>Earned today</Text>
          </View>
        </View>

        {/* Wallet chip */}
        {dash?.wallet && (
          <View style={styles.walletChip}>
            <Text style={styles.walletLabel}>💚 Wallet balance</Text>
            <Money kobo={dash.wallet.balance} size={Typography.base} style={{ color: Colors.success }} />
          </View>
        )}

        {/* Incentives / targets */}
        {incentives && incentives.length > 0 && (
          <View style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
            {incentives.map((inc: any) => (
              <View key={inc.id} style={{ backgroundColor: Colors.warningLight, borderRadius: Radius.md, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 22 }}>🎯</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: Colors.warning }}>{inc.title || inc.name}</Text>
                  <Text style={{ fontSize: 11, color: Colors.text3, fontFamily: 'Manrope-Regular', marginTop: 2 }}>{inc.description}</Text>
                </View>
                {inc.reward_amount > 0 && <Text style={{ fontSize: Typography.base, fontFamily: 'Manrope-ExtraBold', color: Colors.success }}>₦{(inc.reward_amount/100).toLocaleString()}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Incentives/Targets */}
        {incentives && incentives.length > 0 && (
          <View style={styles.incentivesCard}>
            <Text style={styles.incentivesTitle}>🎯 Today's targets</Text>
            {incentives.map((inc: any, i: number) => {
              const pct = Math.min(100, Math.round(((inc.current ?? 0) / (inc.target ?? 1)) * 100));
              return (
                <View key={i} style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.incentiveLabel}>{inc.name || inc.type}</Text>
                    <Text style={styles.incentiveVal}>{inc.current ?? 0}/{inc.target ?? 0} · {inc.reward ? '₦' + ((inc.reward)/100).toLocaleString() : ''}</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: pct >= 100 ? Colors.success : Colors.brand }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Active delivery */}
        {active && (
          <ActiveDeliveryCard
            delivery={active}
            onPickup={async () => { await jobs.pickup(active.id); qc.invalidateQueries({ queryKey: ['dashboard'] }); }}
            onDeliver={async () => { await jobs.deliver(active.id); qc.invalidateQueries({ queryKey: ['dashboard'] }); }}
          />
        )}

        {/* Available jobs */}
        {!active && isOnline && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available jobs</Text>
            {available && available.length > 0 ? (
              available.map((job: any) => (
                <JobCard key={job.id} job={job}
                  onAccept={() => acceptMutation.mutate(job.id)}
                  onReject={() => rejectMutation.mutate(job.id)}
                  loading={acceptMutation.isPending}
                />
              ))
            ) : (
              <Card style={styles.noJobsCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                <Text style={styles.noJobsTitle}>Looking for jobs…</Text>
                <Text style={styles.noJobsSub}>Stay online to receive delivery requests</Text>
              </Card>
            )}
          </View>
        )}

        {!active && !isOnline && (
          <View style={styles.offlineCard}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>😴</Text>
            <Text style={styles.offlineTitle}>You're offline</Text>
            <Text style={styles.offlineSub}>Toggle online above to start receiving jobs</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const StatBox: React.FC<{ label: string; value: number; unit: string }> = ({ label, value, unit }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const JobCard: React.FC<{ job: any; onAccept: () => void; onReject: () => void; loading: boolean }> = ({
  job, onAccept, onReject, loading,
}) => (
  <Card style={styles.jobCard}>
    <View style={styles.jobHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.jobRestaurant}>{job.restaurant_name}</Text>
        <Text style={styles.jobAddress} numberOfLines={1}>{job.pickup_address}</Text>
      </View>
      <View style={styles.jobFee}>
        <Money kobo={job.delivery_fee} size={Typography.xl} style={{ color: Colors.brand }} />
        <Text style={styles.jobFeeLabel}>delivery fee</Text>
      </View>
    </View>
    <View style={styles.jobRoute}>
      <View style={styles.routePoint}>
        <View style={[styles.routeDot, { backgroundColor: Colors.brand }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.routeLabel}>PICKUP</Text>
          <Text style={styles.routeAddr} numberOfLines={1}>{job.pickup_address}</Text>
        </View>
      </View>
      <View style={styles.routeLine} />
      <View style={styles.routePoint}>
        <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.routeLabel}>DROP OFF</Text>
          <Text style={styles.routeAddr} numberOfLines={1}>{job.dropoff_address}</Text>
        </View>
      </View>
    </View>
    <View style={styles.jobActions}>
      <TouchableOpacity onPress={onReject} style={styles.rejectBtn}>
        <Text style={styles.rejectText}>Skip</Text>
      </TouchableOpacity>
      <Button label="Accept job" onPress={onAccept} loading={loading} size="md" style={{ flex: 1 }} />
    </View>
  </Card>
);

const ActiveDeliveryCard: React.FC<{ delivery: any; onPickup: () => void; onDeliver: () => void }> = ({
  delivery, onPickup, onDeliver,
}) => {
  const isPickedUp = delivery.status === 'picked_up' || delivery.status === 'on_the_way';
  return (
    <Card style={styles.activeCard}>
      <View style={styles.activeHeader}>
        <Badge label="Active delivery" variant="brand" />
        <Text style={styles.activeRef}>{delivery.reference}</Text>
      </View>
      <View style={styles.jobRoute}>
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: isPickedUp ? Colors.text3 : Colors.brand }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>PICKUP — {delivery.restaurant_name}</Text>
            <Text style={styles.routeAddr}>{delivery.pickup_address}</Text>
            {delivery.restaurant_phone && <Text style={styles.callLink}>📞 {delivery.restaurant_phone}</Text>}
          </View>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>DROP OFF — {delivery.recipient_name}</Text>
            <Text style={styles.routeAddr}>{delivery.dropoff_address}</Text>
            {delivery.recipient_phone && <Text style={styles.callLink}>📞 {delivery.recipient_phone}</Text>}
          </View>
        </View>
      </View>
      <View style={styles.jobActions}>
        <Money kobo={delivery.delivery_fee} size={Typography.lg} />
        {!isPickedUp
          ? <Button label="Confirm pickup"   onPress={onPickup}  size="md" style={{ flex: 1 }} />
          : <Button label="Confirm delivery" onPress={onDeliver} variant="success" size="md" style={{ flex: 1 }} />}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, paddingTop: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  greeting:      { fontSize: Typography.xl, fontFamily: 'Manrope-ExtraBold', color: Colors.text },
  subGreeting:   { fontSize: Typography.sm, color: Colors.text3, fontFamily: 'Manrope-Regular', marginTop: 2 },
  onlineToggle:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineLabel:   { fontSize: Typography.sm, fontFamily: 'Manrope-Bold' },
  statsRow:      { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statBox:       { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statDivider:   { width: 1, backgroundColor: Colors.border, marginVertical: 12 },
  statValue:     { fontSize: Typography.xl, fontFamily: 'Manrope-ExtraBold', color: Colors.text },
  statLabel:     { fontSize: 10, color: Colors.text3, fontFamily: 'Manrope-SemiBold', textTransform: 'uppercase', letterSpacing: 0.3 },
  walletChip:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: Spacing.lg, backgroundColor: Colors.successLight, borderRadius: Radius.md, padding: 12, paddingHorizontal: Spacing.md },
  walletLabel:   { fontSize: Typography.sm, fontFamily: 'Manrope-SemiBold', color: Colors.success },
  section:       { padding: Spacing.lg, gap: Spacing.md },
  sectionTitle:  { fontSize: Typography.base, fontFamily: 'Manrope-Bold', color: Colors.text },
  noJobsCard:    { alignItems: 'center', padding: Spacing.xl },
  noJobsTitle:   { fontSize: Typography.base, fontFamily: 'Manrope-Bold', color: Colors.text, marginBottom: 4 },
  noJobsSub:     { fontSize: Typography.sm, color: Colors.text3, textAlign: 'center', fontFamily: 'Manrope-Regular' },
  offlineCard:   { alignItems: 'center', padding: Spacing.xxl },
  offlineTitle:  { fontSize: Typography.lg, fontFamily: 'Manrope-Bold', color: Colors.text, marginBottom: 6 },
  offlineSub:    { fontSize: Typography.sm, color: Colors.text3, textAlign: 'center', fontFamily: 'Manrope-Regular' },
  jobCard:       { margin: 0, ...Shadow.card },
  activeCard:    { margin: Spacing.lg, ...Shadow.card, borderColor: Colors.brand, borderWidth: 1.5 },
  activeHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, paddingBottom: 0 },
  activeRef:     { fontSize: Typography.sm, fontFamily: 'Manrope-SemiBold', color: Colors.text3 },
  jobHeader:     { flexDirection: 'row', padding: Spacing.md, gap: Spacing.md },
  jobRestaurant: { fontSize: Typography.base, fontFamily: 'Manrope-Bold', color: Colors.text },
  jobAddress:    { fontSize: Typography.sm, color: Colors.text3, marginTop: 2, fontFamily: 'Manrope-Regular' },
  jobFee:        { alignItems: 'flex-end' },
  jobFeeLabel:   { fontSize: 10, color: Colors.text3, fontFamily: 'Manrope-SemiBold' },
  jobRoute:      { paddingHorizontal: Spacing.md, paddingVertical: 8, gap: 2 },
  routePoint:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot:      { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  routeLine:     { width: 1, height: 12, backgroundColor: Colors.border, marginLeft: 4.5 },
  routeLabel:    { fontSize: 9, fontFamily: 'Manrope-Bold', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.4 },
  routeAddr:     { fontSize: Typography.sm, fontFamily: 'Manrope-SemiBold', color: Colors.text, lineHeight: 18 },
  callLink:      { fontSize: Typography.sm, color: Colors.brand, fontFamily: 'Manrope-SemiBold', marginTop: 3 },
  jobActions:    { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  rejectBtn:     { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  rejectText:    { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: Colors.text3 },
  incentivesCard: { margin: Spacing.lg, marginTop: 0, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  incentivesTitle:{ fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: Colors.text, marginBottom: 2 },
  incentiveLabel: { fontSize: Typography.sm, fontFamily: 'Manrope-SemiBold', color: Colors.text },
  incentiveVal:   { fontSize: Typography.sm, fontFamily: 'Manrope-Regular', color: Colors.text3 },
  progressBg:     { height: 6, backgroundColor: Colors.border, borderRadius: 3 },
  progressFill:   { height: 6, borderRadius: 3 },
});
