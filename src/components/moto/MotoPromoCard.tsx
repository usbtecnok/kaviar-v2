import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';
import { MOTO_FLAGS } from '../../config/moto.config';

const { width: W } = Dimensions.get('window');

interface Props {
  onPress?: () => void;
}

/** Hero card premium "Vá de Moto KAVIAR". Só renderiza se flag ativa. */
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
        colors={['#1A1A2E', '#0F0F1A', '#1E1E10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NOVO</Text>
        </View>

        {/* Ícone grande */}
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="motorbike" size={44} color={COLORS.primary} />
        </View>

        {/* Textos */}
        <Text style={styles.title}>VÁ DE MOTO KAVIAR</Text>
        <Text style={styles.subtitle}>Rápido, prático e seguro</Text>
        <Text style={styles.aux}>Ideal para deslocamentos rápidos na sua região</Text>

        {/* CTA */}
        <View style={styles.cta}>
          <Text style={styles.ctaText}>EXPERIMENTAR</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
        </View>

        {/* Borda dourada inferior */}
        <LinearGradient
          colors={['transparent', 'rgba(255,215,0,0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomGlow}
        />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.25)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    minHeight: 200,
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '900', color: COLORS.textDark, letterSpacing: 1 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  aux: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaText: { fontSize: 13, fontWeight: '800', color: COLORS.primary, letterSpacing: 1.5 },
  bottomGlow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
});
