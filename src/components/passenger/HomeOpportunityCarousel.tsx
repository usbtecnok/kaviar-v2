import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.72;

const OPPORTUNITIES = [
  { icon: '💼', title: 'Seja um Consultor', sub: 'Ajude o KAVIAR a crescer na sua região e ganhe por isso.', cta: 'Saiba mais', action: 'consultor' },
  { icon: '🚘', title: 'KAVIAR Particular', sub: 'Reserve um motorista para consultas, compras, escola ou aeroporto.', cta: 'Solicitar', action: 'particular' },
  { icon: '🚗', title: 'Trabalhe como motorista', sub: 'Dirija na sua comunidade com segurança e autonomia.', cta: 'Quero dirigir', action: 'refer' },
  { icon: '🤝', title: 'Indique e ganhe', sub: 'Indique motoristas e passageiros e receba benefícios KAVIAR.', cta: 'Indicar agora', action: 'refer' },
  { icon: '🐾', title: 'KAVIAR Pet', sub: 'Transporte pet com motoristas certificados e operação assistida.', cta: 'Conhecer', action: 'pet' },
] as const;

export function HomeOpportunityCarousel() {
  const router = useRouter();

  const handlePress = (action: string) => {
    if (action === 'refer') router.push('/(passenger)/refer-driver');
    else if (action === 'consultor') Linking.openURL('https://kaviar.com.br/#consultor');
    else if (action === 'particular') Linking.openURL('https://kaviar.com.br/particular');
    else if (action === 'regiao') Linking.openURL('https://kaviar.com.br/regiao/alto-da-boa-vista');
    else if (action === 'pet') Linking.openURL('https://kaviar.com.br/pet');
  };

  return (
    <View>
      {/* Ofertas Locais — link para tela real */}
      <TouchableOpacity onPress={() => router.push('/(passenger)/local')} style={s.localEmptyCard} activeOpacity={0.8}>
        <Ionicons name="storefront-outline" size={22} color={COLORS.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.localEmptyTitle}>KAVIAR Local</Text>
          <Text style={s.localEmptySub}>Veja comércios e ofertas da sua região</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>

      {/* Destaques KAVIAR */}
      <Text style={[s.sectionTitle, { marginTop: 18 }]}>Destaques para você</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + 12}
        decelerationRate="fast"
        contentContainerStyle={s.scroll}
        style={s.carouselMargin}
      >
        {OPPORTUNITIES.map((slide, i) => (
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#333', letterSpacing: 0.2 },
  sectionSub: { fontSize: 11, color: '#888', marginTop: 2 },
  seeAll: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  scroll: { paddingRight: 20 },
  carouselMargin: { marginBottom: 4 },

  // KAVIAR Local card
  localEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFDF5',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(214,169,40,0.2)',
  },
  localEmptyTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  localEmptySub: { fontSize: 12, color: '#666', marginTop: 2 },

  // Opportunity cards
  card: {
    width: CARD_W,
    backgroundColor: '#FBFAF5',
    borderRadius: 16,
    padding: 18,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#DDD8C4',
  },
  icon: { fontSize: 28, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 6 },
  cardSub: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 14 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctaText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});
