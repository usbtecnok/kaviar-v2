import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';
import { MOTO_FLAGS, MOTO_TEXTS } from '../../config/moto.config';

type VehicleType = 'car' | 'moto';

interface Props {
  selectedType?: VehicleType | null;
  onSelect?: (type: VehicleType) => void;
}

/** Seletor visual Carro/Moto — isolado, sem endpoint. */
export function MotoTypeSelector({ selectedType, onSelect }: Props) {
  const selected = selectedType === 'car' || selectedType === 'moto' ? selectedType : 'car';
  const motoEnabled = MOTO_FLAGS.enabled;

  return (
    <View style={styles.container}>
      {/* Carro */}
      <TouchableOpacity
        style={[styles.option, selected === 'car' && styles.optionActive]}
        onPress={() => onSelect?.('car')}
        activeOpacity={0.8}
      >
        <Ionicons name="car-sport" size={24} color={selected === 'car' ? COLORS.primary : COLORS.textMuted} />
        <Text style={[styles.label, selected === 'car' && styles.labelActive]}>{MOTO_TEXTS.selectorCar}</Text>
        <Text style={styles.sub}>{MOTO_TEXTS.selectorCarSub}</Text>
      </TouchableOpacity>

      {/* Moto */}
      <TouchableOpacity
        style={[styles.option, selected === 'moto' && styles.optionActive, !motoEnabled && styles.optionDisabled]}
        onPress={motoEnabled ? () => onSelect?.('moto') : undefined}
        activeOpacity={motoEnabled ? 0.8 : 1}
        disabled={!motoEnabled}
      >
        <View style={styles.iconRow}>
          <Ionicons name="bicycle" size={24} color={selected === 'moto' ? COLORS.primary : COLORS.textMuted} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{MOTO_TEXTS.selectorBadge}</Text>
          </View>
        </View>
        <Text style={[styles.label, selected === 'moto' && styles.labelActive, !motoEnabled && styles.labelDisabled]}>
          {MOTO_TEXTS.selectorMoto}
        </Text>
        <Text style={styles.sub}>{MOTO_TEXTS.selectorMotoSub}</Text>
        {!motoEnabled && <Text style={styles.soon}>Em breve</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 12 },
  option: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  optionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255,215,0,0.05)',
  },
  optionDisabled: { opacity: 0.5 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: { fontSize: 8, fontWeight: '800', color: COLORS.textDark },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8 },
  labelActive: { color: COLORS.primary },
  labelDisabled: { color: COLORS.textMuted },
  sub: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  soon: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, fontStyle: 'italic' },
});
