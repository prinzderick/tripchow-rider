import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { support } from '../api/endpoints';
import { Badge, Button, EmptyState, LoadingScreen } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';

const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  open:             { label: 'Open',     variant: 'brand'   },
  pending_support:  { label: 'Pending',  variant: 'warning' },
  pending_customer: { label: 'Awaiting', variant: 'info'    },
  resolved:         { label: 'Resolved', variant: 'success' },
  closed:           { label: 'Closed',   variant: 'neutral' },
};

export default function SupportScreen({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();
  const [newTicketSheet, setNewTicketSheet] = useState(false);
  const [viewTicket,     setViewTicket]     = useState<any>(null);
  const [subject,  setSubject]  = useState('');
  const [message,  setMessage]  = useState('');
  const [reply,    setReply]    = useState('');

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['rider-tickets'],
    queryFn:  () => support.tickets().then(r => r.data.data?.items || r.data.data || []),
  });

  const { data: ticketDetail } = useQuery({
    queryKey: ['rider-ticket', viewTicket?.id],
    queryFn:  () => support.getTicket(viewTicket.id).then(r => r.data.data),
    enabled:  !!viewTicket,
    refetchInterval: 15_000,
  });

  const createMut = useMutation({
    mutationFn: () => support.create(subject, message),
    onSuccess:  () => { setNewTicketSheet(false); setSubject(''); setMessage(''); qc.invalidateQueries({ queryKey: ['rider-tickets'] }); Alert.alert('Submitted', 'Our team will respond within 24 hours.'); },
    onError:    (e: any) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  const replyMut = useMutation({
    mutationFn: () => support.reply(viewTicket.id, reply),
    onSuccess:  () => { setReply(''); qc.invalidateQueries({ queryKey: ['rider-ticket', viewTicket?.id] }); },
    onError:    (e: any) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <LoadingScreen />;

  // ── Ticket detail view ─────────────────────────────────────────────────────
  if (viewTicket && ticketDetail) {
    const msgs = ticketDetail.messages || [];
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.hdr}>
          <TouchableOpacity onPress={() => setViewTicket(null)} style={s.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
          <Text style={s.title} numberOfLines={1}>{viewTicket.subject}</Text>
          <Badge label={STATUS_MAP[viewTicket.status]?.label || viewTicket.status} variant={STATUS_MAP[viewTicket.status]?.variant || 'neutral'} />
        </View>
        <FlatList
          data={msgs}
          keyExtractor={(m: any) => m.id}
          contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: 100 }}
          renderItem={({ item: m }) => {
            const isAgent = m.sender_role?.includes('admin') || m.sender_role?.includes('support');
            return (
              <View style={{ alignItems: isAgent ? 'flex-start' : 'flex-end' }}>
                <View style={{ backgroundColor: isAgent ? Colors.surface : Colors.brand, borderRadius: 14, padding: 12, maxWidth: '80%', borderWidth: isAgent ? 1 : 0, borderColor: Colors.border }}>
                  <Text style={{ fontSize: Typography.sm, color: isAgent ? Colors.text : '#fff', lineHeight: 18 }}>{m.body}</Text>
                </View>
                <Text style={{ fontSize: 10, color: Colors.text3, marginTop: 3 }}>
                  {m.first_name} · {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />
        {!['resolved', 'closed'].includes(viewTicket.status) && (
          <View style={{ flexDirection: 'row', gap: 10, padding: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border }}>
            <TextInput
              style={{ flex: 1, backgroundColor: Colors.bg, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: Typography.sm, color: Colors.text, fontFamily: 'Manrope-Regular' }}
              placeholder="Type a reply…" placeholderTextColor={Colors.text3}
              value={reply} onChangeText={setReply} multiline
            />
            <Button label="Send" onPress={() => replyMut.mutate()} loading={replyMut.isPending} size="sm" disabled={!reply.trim()} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Ticket list ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={s.title}>Help & support</Text>
        <Button label="New ticket" onPress={() => setNewTicketSheet(true)} size="sm" />
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(t: any) => t.id}
        contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 }}
        onRefresh={refetch} refreshing={false}
        renderItem={({ item: t }) => (
          <TouchableOpacity onPress={() => setViewTicket(t)}
            style={{ backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ flex: 1, fontSize: Typography.base, fontFamily: 'Manrope-Bold', color: Colors.text }} numberOfLines={1}>{t.subject}</Text>
              <Badge label={STATUS_MAP[t.status]?.label || t.status} variant={STATUS_MAP[t.status]?.variant || 'neutral'} />
            </View>
            <Text style={{ fontSize: Typography.sm, color: Colors.text3, fontFamily: 'Manrope-Regular' }}>
              {t.message_count || 0} message{t.message_count !== 1 ? 's' : ''} · {new Date(t.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState icon="💬" title="No support tickets" subtitle="Need help? Create a ticket and we'll respond within 24 hours."
            action={{ label: 'Create ticket', onPress: () => setNewTicketSheet(true) }} />
        }
      />

      {/* New ticket modal */}
      <Modal visible={newTicketSheet} transparent animationType="slide" onRequestClose={() => setNewTicketSheet(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)' }} activeOpacity={1} onPress={() => setNewTicketSheet(false)} />
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: Spacing.lg, gap: Spacing.md, paddingBottom: 36 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 8 }} />
          <Text style={{ fontSize: Typography.lg, fontFamily: 'Manrope-ExtraBold', color: Colors.text }}>New support ticket</Text>
          {[['Subject', subject, setSubject, false], ['Describe your issue', message, setMessage, true]].map(([label, val, setter, multi]: any) => (
            <View key={label} style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Manrope-Bold', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
              <TextInput
                style={{ backgroundColor: Colors.bg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: 13, fontSize: Typography.base, color: Colors.text, fontFamily: 'Manrope-Regular', ...(multi ? { height: 90, textAlignVertical: 'top' } : {}) }}
                value={val} onChangeText={setter} multiline={multi}
              />
            </View>
          ))}
          <Button label="Submit ticket" onPress={() => createMut.mutate()} loading={createMut.isPending} fullWidth size="lg" disabled={!subject.trim() || !message.trim()} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  hdr:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.lg, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  title:   { flex: 1, fontSize: Typography.xl, fontFamily: 'Manrope-ExtraBold', color: Colors.text },
});
