import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';
import { MOTO_FLAGS } from '../../config/moto.config';

interface Props {
  onPress?: () => void;
}

/** Card promocional "Vá de Moto KAVIAR". Só renderiza se flag ativa. */
export function MotoPromoCard({ onPress }: Props) {
  if (!MOTO_FLAGS.PROMO_CARD_ENABLED) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <LinearGradient
        colors={['#1E1E10', '#1A1A2E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NOVO</Text>
        </View>

        <View style={styles.iconWrap}>
          <Ionicons name="bicycle" size={28} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>VÁ DE MOTO KAVIAR</Text>
        <Text style={styles.subtitle}>Rápido, prático e econômico</Text>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>CONHECER</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  gradient: { padding: 18 },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: COLORS.textDark },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 14 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, letterSpacing: 1 },
});
