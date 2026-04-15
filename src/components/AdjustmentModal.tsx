import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../config/colors';

const TIMEOUT_SECONDS = 60;

interface Props {
  visible: boolean;
  quotedPrice: number;
  driverAdjustment: number;
  adjustedPrice: number;
  driverName?: string;
  vehicleInfo?: string;
  rideUpdatedAt?: string;
  onAccept: () => void;
  onReject: () => void;
  onTimeout: () => void;
}

export function AdjustmentModal({
  visible, quotedPrice, driverAdjustment, adjustedPrice,
  driverName, vehicleInfo, rideUpdatedAt, onAccept, onReject, onTimeout,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) { setLoading(null); return; }

    // Calculate elapsed time if ride has updated_at
    let elapsed = 0;
    if (rideUpdatedAt) {
      elapsed = Math.floor((Date.now() - Date.parse(rideUpdatedAt)) / 1000);
    }
    const remaining = Math.max(0, TIMEOUT_SECONDS - elapsed);
    setSecondsLeft(remaining);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Animate progress bar
    progressAnim.setValue(remaining / TIMEOUT_SECONDS);
    Animated.timing(progressAnim, {
      toValue: 0, duration: remaining * 1000, useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(interval); onTimeout(); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  const handleAccept = async () => {
    setLoading('accept');
    onAccept();
  };

  const handleReject = async () => {
    setLoading('reject');
    onReject();
  };

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.icon}>💰</Text>
          <Text style={s.title}>Ajuste de valor</Text>
          <Text style={s.subtitle}>O motorista aceitou esta corrida com valor ajustado.</Text>

          <View style={s.priceBlock}>
            <View style={s.priceRow}>
              <Text style={s.priceLabel}>Valor base</Text>
              <Text style={s.priceValue}>{fmt(quotedPrice)}</Text>
            </View>
            <View style={s.priceRow}>
              <Text style={s.priceLabel}>Ajuste sugerido</Text>
              <Text style={[s.priceValue, { color: COLORS.warning }]}>+ {fmt(driverAdjustment)}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.priceRow}>
              <Text style={s.finalLabel}>Valor final</Text>
              <Text style={s.finalValue}>{fmt(adjustedPrice)}</Text>
            </View>
          </View>

          {/* Countdown */}
          <View style={s.countdownRow}>
            <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
            <Text style={s.countdownText}>Responda em {secondsLeft}s</Text>
          </View>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressBar, { width: progressWidth }]} />
          </View>

          {/* Driver info */}
          {driverName && (
            <View style={s.driverRow}>
              <Ionicons name="person-circle-outline" size={18} color={COLORS.textSecondary} />
              <Text style={s.driverText}>{driverName}{vehicleInfo ? ` • ${vehicleInfo}` : ''}</Text>
            </View>
          )}

          {/* Actions */}
          <TouchableOpacity
            style={s.btnAccept}
            onPress={handleAccept}
            disabled={loading !== null}
            accessibilityRole="button"
            accessibilityLabel={`Aceitar ${fmt(adjustedPrice)}`}
          >
            {loading === 'accept'
              ? <ActivityIndicator color={COLORS.textDark} />
              : <Text style={s.btnAcceptText}>Aceitar {fmt(adjustedPrice)}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={s.btnReject}
            onPress={handleReject}
            disabled={loading !== null}
            accessibilityRole="button"
            accessibilityLabel="Recusar"
          >
            {loading === 'reject'
              ? <ActivityIndicator color={COLORS.textSecondary} />
              : <Text style={s.btnRejectText}>Recusar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  icon: { fontSize: 36, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  priceBlock: { width: '100%', backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 16, marginBottom: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: COLORS.textSecondary },
  priceValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  finalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  finalValue: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  countdownText: { fontSize: 13, color: COLORS.textMuted },
  progressTrack: { width: '100%', height: 4, backgroundColor: COLORS.surfaceLight, borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  driverText: { fontSize: 13, color: COLORS.textSecondary },
  btnAccept: { backgroundColor: COLORS.success, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 10 },
  btnAcceptText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  btnReject: { borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 14, width: '100%', alignItems: 'center' },
  btnRejectText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
});
