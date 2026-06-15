import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';
import { MOTO_FLAGS, MOTO_TEXTS } from '../../config/moto.config';

type VehicleType = 'car' | 'moto';

interface Props {
  selectedType?: VehicleType | null;
  onSelect?: (type: VehicleType) => void;
}

/** Seletor premium Carro/Moto — cards grandes com destaque visual. */
export function MotoTypeSelector({ selectedType, onSelect }: Props) {
  const selected = selectedType === 'car' || selectedType === 'moto' ? selectedType : 'car';

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Como você quer ir?</Text>

      <View style={styles.row}>
        {/* CARRO */}
        <TouchableOpacity
          style={[styles.card, selected === 'car' && styles.cardActive]}
          onPress={() => onSelect?.('car')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrap, selected === 'car' && styles.iconWrapActive]}>
            <Ionicons name="car-sport" size={32} color={selected === 'car' ? COLORS.primary : COLORS.textMuted} />
          </View>
          <Text style={[styles.label, selected === 'car' && styles.labelActive]}>
            {MOTO_TEXTS.selectorCar}
          </Text>
          <Text style={styles.sub}>{MOTO_TEXTS.selectorCarSub}</Text>
        </TouchableOpacity>

        {/* MOTO */}
        <TouchableOpacity
          style={[styles.card, selected === 'moto' && styles.cardActive]}
          onPress={() => onSelect?.('moto')}
          activeOpacity={0.8}
        >
          <View style={styles.badgeWrap}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{MOTO_TEXTS.selectorBadge}</Text>
            </View>
          </View>
          <View style={[styles.iconWrap, selected === 'moto' && styles.iconWrapActive]}>
            <MaterialCommunityIcons name="motorbike" size={32} color={selected === 'moto' ? COLORS.primary : COLORS.textMuted} />
          </View>
          <Text style={[styles.label, selected === 'moto' && styles.labelActive]}>
            {MOTO_TEXTS.selectorMoto}
          </Text>
          <Text style={styles.sub}>{MOTO_TEXTS.selectorMotoSub}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  heading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  row: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  cardActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255,215,0,0.04)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderColor: 'rgba(255,215,0,0.4)',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  labelActive: { color: COLORS.primary },
  sub: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  badgeWrap: { position: 'absolute', top: 10, right: 10 },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '900', color: COLORS.textDark, letterSpacing: 0.5 },
});
