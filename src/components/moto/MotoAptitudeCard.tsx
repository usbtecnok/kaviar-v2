import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';
import { MOTO_TEXTS } from '../../config/moto.config';

type Status = 'not_started' | 'pending' | 'approved' | 'rejected' | 'blocked';

interface Props {
  serviceType?: 'Moto Express' | 'Moto Passageiro' | null;
  status?: Status | null;
  pendingDocs?: string[] | null;
  reason?: string | null;
  onPress?: () => void;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: string }> = {
  not_started: { label: MOTO_TEXTS.aptitudeNotStarted, color: COLORS.textMuted, icon: 'ellipse-outline' },
  pending: { label: MOTO_TEXTS.aptitudePending, color: COLORS.warning, icon: 'time-outline' },
  approved: { label: MOTO_TEXTS.aptitudeApproved, color: COLORS.success, icon: 'checkmark-circle' },
  rejected: { label: MOTO_TEXTS.aptitudeRejected, color: COLORS.danger, icon: 'close-circle' },
  blocked: { label: MOTO_TEXTS.aptitudeBlocked, color: COLORS.danger, icon: 'ban' },
};

/** Card de aptidão Moto para motorista — isolado, sem endpoint. */
export function MotoAptitudeCard({ serviceType, status, pendingDocs, reason, onPress }: Props) {
  const safeStatus = status && STATUS_CONFIG[status] ? status : 'not_started';
  const config = STATUS_CONFIG[safeStatus];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Ionicons name="bicycle" size={20} color={COLORS.primary} />
        <Text style={styles.title}>{serviceType || 'Moto'}</Text>
        <View style={[styles.badge, { backgroundColor: config.color }]}>
          <Ionicons name={config.icon as any} size={12} color="#fff" />
          <Text style={styles.badgeText}>{config.label}</Text>
        </View>
      </View>

      {Array.isArray(pendingDocs) && pendingDocs.length > 0 && (
        <View style={styles.docsBox}>
          <Text style={styles.docsLabel}>Documentos pendentes:</Text>
          {pendingDocs.map((doc, i) => (
            <Text key={i} style={styles.docItem}>• {doc}</Text>
          ))}
        </View>
      )}

      {reason && (
        <View style={styles.reasonBox}>
          <Ionicons name="information-circle" size={14} color={COLORS.danger} />
          <Text style={styles.reasonText}>{reason}</Text>
        </View>
      )}

      {onPress && (
        <View style={styles.actionRow}>
          <Text style={styles.actionText}>Ver detalhes</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  docsBox: { marginTop: 12, paddingLeft: 4 },
  docsLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  docItem: { fontSize: 12, color: COLORS.textMuted, marginLeft: 4, lineHeight: 18 },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(231,76,60,0.08)',
    borderRadius: 8,
    padding: 8,
  },
  reasonText: { flex: 1, fontSize: 12, color: COLORS.textPrimary, lineHeight: 16 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 12 },
  actionText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
});
