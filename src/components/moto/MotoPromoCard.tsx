import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';
import { MOTO_FLAGS } from '../../config/moto.config';

interface Props {
  onPress?: () => void;
}

/** Banner complementar "Moto KAVIAR" — não hero, posicionado após corrida principal. */
export function MotoPromoCard({ onPress }: Props) {
  if (!MOTO_FLAGS.PROMO_CARD_ENABLED) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      <LinearGradient
        colors={['#1A1A2E', '#1E1E10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="motorbike" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.textBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Agora também de Moto</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>NOVO</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Rápido e econômico para deslocamentos curtos</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  gradient: { paddingVertical: 16, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 8, fontWeight: '900', color: COLORS.textDark, letterSpacing: 0.5 },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
});
