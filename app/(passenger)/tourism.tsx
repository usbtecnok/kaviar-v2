import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/config/colors';

const TOURISM_WHATSAPP = 'https://wa.me/5521999999999?text=Ol%C3%A1%2C%20tenho%20interesse%20no%20Turismo%20Premium%20Kaviar';

export default function TourismPremium() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Turismo Premium</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <Text style={s.heroIcon}>✦</Text>
          <Text style={s.heroTitle}>Kaviar Turismo Premium</Text>
          <Text style={s.heroSub}>Experiências exclusivas com guias locais selecionados</Text>
        </View>

        <View style={s.card}>
          <View style={s.feature}>
            <Ionicons name="diamond-outline" size={20} color={COLORS.primary} />
            <Text style={s.featureText}>Roteiros personalizados</Text>
          </View>
          <View style={s.feature}>
            <Ionicons name="car-sport-outline" size={20} color={COLORS.primary} />
            <Text style={s.featureText}>Transporte premium incluso</Text>
          </View>
          <View style={s.feature}>
            <Ionicons name="people-outline" size={20} color={COLORS.primary} />
            <Text style={s.featureText}>Guias turísticos certificados</Text>
          </View>
          <View style={s.feature}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
            <Text style={s.featureText}>Segurança e conforto garantidos</Text>
          </View>
        </View>

        <TouchableOpacity style={s.cta} onPress={() => Linking.openURL(TOURISM_WHATSAPP)} activeOpacity={0.7}>
          <Ionicons name="logo-whatsapp" size={20} color={COLORS.textDark} />
          <Text style={s.ctaText}>Quero saber mais</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  content: { padding: 20 },
  hero: { alignItems: 'center', paddingVertical: 32 },
  heroIcon: { fontSize: 40, color: COLORS.primary, marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  heroSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  feature: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  featureText: { fontSize: 15, color: COLORS.textPrimary, marginLeft: 14 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, gap: 10 },
  ctaText: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
});
