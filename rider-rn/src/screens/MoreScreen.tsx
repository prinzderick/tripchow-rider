import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  TextInput, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rider, support, notifications } from '../api/endpoints';
import { useAuthStore } from '../store/auth';
import { Card, SectionHeader, RowItem, LoadingScreen, Button, Divider } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';

interface MoreScreenProps {
  onShowNotifications?: () => void;
  onShowSupport?: () => void;
}

export default function MoreScreen({ onShowNotifications, onShowSupport }: MoreScreenProps = {}) {
  const { user, clearAuth } = useAuthStore();
  const qc = useQueryClient();

  const [editModal,    setEditModal]    = useState(false);
  const [vehicleModal, setVehicleModal] = useState(false);
  const [bankModal,    setBankModal]    = useState(false);
  const [supportModal, setSupportModal] = useState(false);

  const [firstName,  setFirstName]  = useState(user?.first_name || '');
  const [lastName,   setLastName]   = useState(user?.last_name  || '');
  const [vehicleType,setVehicleType]= useState('');
  const [plate,      setPlate]      = useState('');
  const [bankName,   setBankName]   = useState('');
  const [accNum,     setAccNum]     = useState('');
  const [accName,    setAccName]    = useState('');
  const [supportMsg, setSupportMsg] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn:  () => rider.profile().then(r => r.data.data),
  });

  // Notification badge — matches PWA more.html GET /notifications/unread-count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['rider-notif-count'],
    queryFn:  () => rider.notifCount().then(r => r.data.data?.unread ?? r.data.data?.count ?? 0),
    refetchInterval: 60_000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['rider-notif-count'],
    queryFn:  () => notifications.unreadCount().then(r => r.data.data?.unread ?? r.data.data?.count ?? 0),
    refetchInterval: 60_000,
  });

  const updateProfile = useMutation({
    mutationFn: () => rider.updateProfile({ first_name: firstName, last_name: lastName }),
    onSuccess:  () => { setEditModal(false); Alert.alert('Saved', 'Profile updated.'); qc.invalidateQueries({ queryKey: ['profile'] }); },
    onError:    (e: any) => Alert.alert('Error', e.response?.data?.message || 'Update failed'),
  });

  const saveVehicle = useMutation({
    mutationFn: () => rider.saveVehicle({ vehicle_type: vehicleType, plate_number: plate }),
    onSuccess:  () => { setVehicleModal(false); Alert.alert('Saved', 'Vehicle info updated.'); qc.invalidateQueries({ queryKey: ['profile'] }); },
    onError:    (e: any) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  const saveBank = useMutation({
    mutationFn: () => rider.saveBankAccount({ bank_name: bankName, account_number: accNum, account_name: accName }),
    onSuccess:  () => { setBankModal(false); Alert.alert('Saved', 'Bank account saved.'); },
    onError:    (e: any) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  const submitSupport = useMutation({
    mutationFn: () => support.create('Rider support request', supportMsg),
    onSuccess:  () => { setSupportModal(false); setSupportMsg(''); Alert.alert('Sent', 'Support request submitted.'); },
    onError:    (e: any) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => clearAuth() },
    ]);
  };

  if (isLoading) return <LoadingScreen />;

  const p = profile || {};
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
            <Text style={styles.phone}>{user?.phone}</Text>
            {p.rating > 0 && (
              <Text style={styles.rating}>⭐ {Number(p.rating).toFixed(1)} rating</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => { setFirstName(user?.first_name || ''); setLastName(user?.last_name || ''); setEditModal(true); }}
            style={styles.editBtn}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Status badge */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: p.is_approved ? Colors.success : Colors.warning }]} />
          <Text style={styles.statusText}>
            {p.is_approved ? 'Account approved' : 'Pending approval'}
          </Text>
        </View>

        {/* Account */}
        <SectionHeader label="My account" />
        <Card style={styles.sectionCard}>
          <RowItem icon="🛵" label="Vehicle info"     onPress={() => { setVehicleType(p.vehicle?.type || ''); setPlate(p.vehicle?.plate_number || ''); setVehicleModal(true); }} />
          <Divider />
          <RowItem icon="🏦" label="Bank account"      onPress={() => setBankModal(true)} />
          <Divider />
          <RowItem icon="📄" label="Documents"          value={p.documents?.length ? `${p.documents.length} uploaded` : 'None'} onPress={() => Alert.alert('Documents', 'Upload documents via the web portal at rider.tripchow.com')} />
        </Card>

        {/* Performance */}
        <SectionHeader label="Performance" />
        <Card style={styles.sectionCard}>
          <View style={styles.statsGrid}>
            <StatCell label="Total deliveries" value={String(p.total_deliveries || 0)} />
            <StatCell label="Rating"            value={p.rating ? Number(p.rating).toFixed(1) + ' ⭐' : '—'} />
            <StatCell label="Acceptance rate"   value={p.acceptance_rate ? p.acceptance_rate + '%' : '—'} />
            <StatCell label="Completion rate"   value={p.completion_rate ? p.completion_rate + '%' : '—'} />
          </View>
        </Card>

        {/* Notifications */}
        <SectionHeader label="Notifications" />
        <Card style={styles.sectionCard}>
          <RowItem icon="🔔" label="Notifications" value={unreadCount > 0 ? `${unreadCount} new` : undefined} onPress={() => onShowNotifications?.()} />
        </Card>

        {/* Help */}
        <SectionHeader label="Help & support" />
        <Card style={styles.sectionCard}>
          <RowItem icon="💬" label="Contact support" onPress={() => onShowSupport ? onShowSupport() : setSupportModal(true)} />
          <Divider />
          <RowItem icon="📞" label="Call TripChow"    value="+234 800 000 0000" />
        </Card>

        {/* Sign out */}
        <SectionHeader label="Account" />
        <Card style={styles.sectionCard}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutRow}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </Card>

        <Text style={styles.version}>TripChow Rider v1.0.0</Text>
      </ScrollView>

      {/* Edit profile modal */}
      <BottomModal visible={editModal} onClose={() => setEditModal(false)} title="Edit profile">
        <Field label="First name">
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={Colors.text3} />
        </Field>
        <Field label="Last name">
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={Colors.text3} />
        </Field>
        <Button label="Save changes" onPress={() => updateProfile.mutate()} loading={updateProfile.isPending} fullWidth size="lg" style={{ marginTop: 8 }} />
      </BottomModal>

      {/* Vehicle modal */}
      <BottomModal visible={vehicleModal} onClose={() => setVehicleModal(false)} title="Vehicle info">
        <Field label="Vehicle type">
          <TextInput style={styles.input} value={vehicleType} onChangeText={setVehicleType} placeholder="e.g. Motorcycle, Bicycle" placeholderTextColor={Colors.text3} />
        </Field>
        <Field label="Plate number">
          <TextInput style={styles.input} value={plate} onChangeText={setPlate} placeholder="e.g. LND 123 AA" placeholderTextColor={Colors.text3} autoCapitalize="characters" />
        </Field>
        <Button label="Save vehicle" onPress={() => saveVehicle.mutate()} loading={saveVehicle.isPending} fullWidth size="lg" style={{ marginTop: 8 }} />
      </BottomModal>

      {/* Bank account modal */}
      <BottomModal visible={bankModal} onClose={() => setBankModal(false)} title="Bank account">
        <Field label="Bank name">
          <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder="e.g. GTBank, First Bank" placeholderTextColor={Colors.text3} />
        </Field>
        <Field label="Account number">
          <TextInput style={styles.input} value={accNum} onChangeText={setAccNum} placeholder="10-digit NUBAN" placeholderTextColor={Colors.text3} keyboardType="number-pad" maxLength={10} />
        </Field>
        <Field label="Account name">
          <TextInput style={styles.input} value={accName} onChangeText={setAccName} placeholder="Account holder name" placeholderTextColor={Colors.text3} />
        </Field>
        <Button label="Save account" onPress={() => saveBank.mutate()} loading={saveBank.isPending} fullWidth size="lg" style={{ marginTop: 8 }} />
      </BottomModal>

      {/* Support modal */}
      <BottomModal visible={supportModal} onClose={() => setSupportModal(false)} title="Contact support">
        <Field label="Describe your issue">
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
            value={supportMsg}
            onChangeText={setSupportMsg}
            placeholder="Tell us what's happening…"
            placeholderTextColor={Colors.text3}
            multiline
          />
        </Field>
        <Button label="Send message" onPress={() => submitSupport.mutate()} loading={submitSupport.isPending} fullWidth size="lg" style={{ marginTop: 8 }} />
      </BottomModal>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const StatCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.statCell}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={{ gap: 6 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
  </View>
);

const BottomModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ visible, onClose, title, children }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
    <View style={styles.modalSheet}>
      <View style={styles.modalHandle} />
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ fontSize: 24, color: Colors.text3 }}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={{ gap: Spacing.md }}>{children}</View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar:        { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: Typography.xl, fontFamily: 'Manrope-ExtraBold', color: '#fff' },
  name:          { fontSize: Typography.lg, fontFamily: 'Manrope-ExtraBold', color: Colors.text },
  phone:         { fontSize: Typography.sm, color: Colors.text3, fontFamily: 'Manrope-Regular', marginTop: 2 },
  rating:        { fontSize: Typography.sm, color: Colors.warning, fontFamily: 'Manrope-SemiBold', marginTop: 2 },
  editBtn:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  editBtnText:   { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: Colors.text },
  statusRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md, paddingHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statusDot:     { width: 8, height: 8, borderRadius: 4 },
  statusText:    { fontSize: Typography.sm, fontFamily: 'Manrope-SemiBold', color: Colors.text2 },
  sectionCard:   { marginHorizontal: Spacing.lg },
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap' },
  statCell:      { width: '50%', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statValue:     { fontSize: Typography.xl, fontFamily: 'Manrope-ExtraBold', color: Colors.text },
  statLabel:     { fontSize: 10, color: Colors.text3, fontFamily: 'Manrope-SemiBold', textTransform: 'uppercase', marginTop: 3, letterSpacing: 0.3, textAlign: 'center' },
  logoutRow:     { padding: Spacing.md, alignItems: 'center' },
  logoutText:    { fontSize: Typography.base, fontFamily: 'Manrope-Bold', color: Colors.danger },
  version:       { textAlign: 'center', padding: Spacing.xl, fontSize: Typography.sm, color: Colors.text3, fontFamily: 'Manrope-Regular' },
  fieldLabel:    { fontSize: 11, fontFamily: 'Manrope-Bold', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:         { backgroundColor: Colors.bg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: 13, fontSize: Typography.base, fontFamily: 'Manrope-Regular', color: Colors.text },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,.5)' },
  modalSheet:    { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, gap: Spacing.md, maxHeight: '85%' },
  modalHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 8 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:    { fontSize: Typography.lg, fontFamily: 'Manrope-ExtraBold', color: Colors.text },
});
