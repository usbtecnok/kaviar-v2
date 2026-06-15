import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../config/colors';

type Variant = 'success' | 'warning' | 'danger' | 'neutral';

interface Props {
  label: string | null | undefined;
  variant?: Variant;
}

const VARIANT_COLORS: Record<Variant, string> = {
  success: COLORS.success,
  warning: COLORS.warning,
  danger: COLORS.danger,
  neutral: COLORS.textMuted,
};

/** Badge de status com cores semânticas. Aceita label null/undefined sem quebrar. */
export function StatusBadge({ label, variant = 'neutral' }: Props) {
  if (!label) return null;

  return (
    <View style={[styles.badge, { backgroundColor: VARIANT_COLORS[variant] }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
});
