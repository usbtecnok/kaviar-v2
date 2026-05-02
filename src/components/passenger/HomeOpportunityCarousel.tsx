import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.7;

const SLIDES = [
  { icon: '💼', title: 'Seja um Consultor', sub: 'Ajude o KAVIAR a crescer na sua região e ganhe por isso.', cta: 'Saiba mais', action: 'consultor' },
  { icon: '🚗', title: 'Trabalhe como motorista', sub: 'Dirija na sua comunidade com segurança e autonomia.', cta: 'Quero dirigir', action: 'refer' },
  { icon: '🤝', title: 'Indique e ganhe', sub: 'Indique motoristas e passageiros e receba créditos KAVIAR.', cta: 'Indicar agora', action: 'refer' },
  { icon: '🎉', title: 'Novidades da comunidade', sub: 'Fique por dentro das campanhas e promoções locais.', cta: 'Ver mais', action: 'help' },
] as const;

export function HomeOpportunityCarousel() {
  const router = useRouter();

  const handlePress = (action: string) => {
    if (action === 'refer') router.push('/(passenger)/refer-driver');
    else if (action === 'consultor') Linking.openURL('https://kaviar.com.br/#consultor');
    else if (action === 'help') router.push('/(passenger)/help');
  };

  return (
    <View>
      <Text style={s.title}>Destaques para você</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + 12}
        decelerationRate="fast"
        contentContainerStyle={s.scroll}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={s.card}>
            <Text style={s.icon}>{slide.icon}</Text>
            <Text style={s.cardTitle}>{slide.title}</Text>
            <Text style={s.cardSub}>{slide.sub}</Text>
            <TouchableOpacity style={s.cta} onPress={() => handlePress(slide.action)} activeOpacity={0.7}>
              <Text style={s.ctaText}>{slide.cta}</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  title: {
    fontSize: 13, fontWeight: '700', color: '#444',
    marginBottom: 12, paddingHorizontal: 4,
  },
  scroll: { paddingRight: 20 },
  card: {
    width: CARD_W, backgroundColor: '#FBFAF5',
    borderRadius: 16, padding: 18, marginRight: 12,
    borderWidth: 1, borderColor: '#DDD8C4',
  },
  icon: { fontSize: 28, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 6 },
  cardSub: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 14 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctaText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});
