import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../config/colors';

interface PremiumCardProps {
  children: React.ReactNode;
  accent?: string;
  style?: ViewStyle;
}

export function PremiumCard({ children, accent, style }: PremiumCardProps) {
  return (
    <View style={[styles.card, accent && { borderLeftColor: accent, borderLeftWidth: 3 }, style]}>
      {children}
    </View>
  );
}

export function EarningsCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: string }) {
  return (
    <View style={styles.earningsCard}>
      {icon && <Text style={styles.earningsIcon}>{icon}</Text>}
      <Text style={styles.earningsValue}>{value}</Text>
      <Text style={styles.earningsLabel}>{label}</Text>
      {sub && <Text style={styles.earningsSub}>{sub}</Text>}
    </View>
  );
}

export function StatusPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <View style={[styles.pill, active && styles.pillActive]}>
      <View style={[styles.pillDot, active && styles.pillDotActive]} />
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  earningsCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  earningsIcon: { fontSize: 20, marginBottom: 4 },
  earningsValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
  earningsLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  earningsSub: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(255,215,0,0.08)' },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.statusOffline },
  pillDotActive: { backgroundColor: COLORS.statusOnline },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  pillTextActive: { color: COLORS.primary },
});
