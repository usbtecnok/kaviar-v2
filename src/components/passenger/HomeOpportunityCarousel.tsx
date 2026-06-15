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

const LOCAL_OFFERS = [
  { icon: '🥐', name: 'Padaria Bella Tijuca', category: 'Alimentação', offer: 'Café + pão de queijo com desconto', region: 'Tijuca', cta: 'Ver oferta' },
  { icon: '🛒', name: 'Mercado Local', category: 'Supermercado', offer: 'Entrega rápida na sua região', region: 'Alto da Boa Vista', cta: 'Explorar' },
  { icon: '💇', name: 'Studio Hair Premium', category: 'Beleza', offer: 'Corte + escova com 20% off', region: 'Grajaú', cta: 'Ver oferta' },
  { icon: '🍕', name: 'Pizzaria do Bairro', category: 'Alimentação', offer: 'Pizza grande a partir de R$39,90', region: 'Andaraí', cta: 'Ver oferta' },
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
      {/* Ofertas Locais */}
      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>Ofertas perto de você</Text>
          <Text style={s.sectionSub}>Comércios locais da sua região</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(passenger)/local')}>
          <Text style={s.seeAll}>Ver todos</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + 12}
        decelerationRate="fast"
        contentContainerStyle={s.scroll}
        style={s.carouselMargin}
      >
        {LOCAL_OFFERS.map((offer, i) => (
          <View key={i} style={s.offerCard}>
            <View style={s.offerHeader}>
              <Text style={s.offerIcon}>{offer.icon}</Text>
              <View style={s.offerCategoryBadge}>
                <Text style={s.offerCategoryText}>{offer.category}</Text>
              </View>
            </View>
            <Text style={s.offerName}>{offer.name}</Text>
            <Text style={s.offerDesc}>{offer.offer}</Text>
            <Text style={s.offerRegion}>📍 {offer.region}</Text>
            <TouchableOpacity style={s.offerCta} activeOpacity={0.7}>
              <Text style={s.offerCtaText}>{offer.cta}</Text>
              <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Destaques KAVIAR */}
      <Text style={[s.sectionTitle, { marginTop: 22 }]}>Destaques para você</Text>

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

  // Offer cards — maiores e mais visíveis
  offerCard: {
    width: CARD_W,
    backgroundColor: '#FFFDF5',
    borderRadius: 18,
    padding: 18,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(214,169,40,0.25)',
    shadowColor: '#D6A928',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  offerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  offerIcon: { fontSize: 32 },
  offerCategoryBadge: { backgroundColor: 'rgba(214,169,40,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  offerCategoryText: { fontSize: 10, fontWeight: '700', color: '#A08020', letterSpacing: 0.3 },
  offerName: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  offerDesc: { fontSize: 12, color: '#555', lineHeight: 17, marginBottom: 8 },
  offerRegion: { fontSize: 11, color: '#888', marginBottom: 12 },
  offerCta: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(214,169,40,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  offerCtaText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

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
