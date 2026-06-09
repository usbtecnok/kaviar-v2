import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../src/api/client';
import { COLORS } from '../../src/config/colors';

interface Commerce {
  id: string;
  slug: string | null;
  name: string;
  logo_url: string | null;
  category: string;
  address: string | null;
  phone: string | null;
  has_products: boolean;
}

function normalizeBrazilianWhatsApp(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return null;
}

export default function LocalCommerce() {
  const router = useRouter();
  const [items, setItems] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await apiClient.get('/api/passengers/me/local-commerce');
      if (data.success) setItems(data.data);
      else setError(true);
    } catch { setError(true); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openVitrine = (slug: string | null) => {
    if (!slug) return;
    Linking.openURL(`https://kaviar.com.br/comercio/${encodeURIComponent(slug)}`);
  };

  const openWhatsApp = (phone: string | null) => {
    const n = normalizeBrazilianWhatsApp(phone);
    if (n) Linking.openURL(`https://wa.me/${n}`);
  };

  const renderItem = ({ item }: { item: Commerce }) => {
    const whatsapp = normalizeBrazilianWhatsApp(item.phone);
    return (
      <View style={s.card}>
        <View style={s.cardRow}>
          {item.logo_url ? (
            <Image source={{ uri: item.logo_url }} style={s.logo} />
          ) : (
            <View style={[s.logo, s.logoPlaceholder]}><Ionicons name="storefront" size={24} color={COLORS.textMuted} /></View>
          )}
          <View style={s.cardInfo}>
            <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={s.cardCategory}>{item.category}</Text>
            {item.address ? <Text style={s.cardAddress} numberOfLines={1}>{item.address}</Text> : null}
            {item.has_products && <Text style={s.cardProducts}>✦ Produtos disponíveis</Text>}
          </View>
        </View>
        <View style={s.cardActions}>
          {item.slug && (
            <TouchableOpacity style={s.btnVitrine} onPress={() => openVitrine(item.slug)} activeOpacity={0.7}>
              <Ionicons name="storefront-outline" size={16} color="#1A1A2E" />
              <Text style={s.btnVitrineText}>Ver vitrine</Text>
            </TouchableOpacity>
          )}
          {whatsapp && (
            <TouchableOpacity style={s.btnWhatsapp} onPress={() => openWhatsApp(item.phone)} activeOpacity={0.7}>
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
              <Text style={s.btnWhatsappText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>KAVIAR Local</Text>
          <Text style={s.subtitle}>Comércios e ofertas da sua região</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {loading && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />}

      {error && !loading && (
        <View style={s.empty}>
          <Text style={s.emptyText}>Não foi possível carregar os comércios.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load}><Text style={s.retryText}>Tentar novamente</Text></TouchableOpacity>
        </View>
      )}

      {!loading && !error && items.length === 0 && (
        <View style={s.empty}>
          <Ionicons name="storefront-outline" size={48} color={COLORS.textMuted} style={{ marginBottom: 16 }} />
          <Text style={s.emptyTitle}>Ainda não encontramos comércios parceiros disponíveis na sua região.</Text>
          <Text style={s.emptyText}>O KAVIAR Local está chegando a novos bairros e cidades.</Text>
        </View>
      )}

      {!loading && !error && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  subtitle: { fontSize: 11, color: COLORS.textSecondary },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: COLORS.primary, borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  logo: { width: 52, height: 52, borderRadius: 12 },
  logoPlaceholder: { backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardCategory: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardAddress: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  cardProducts: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 10 },
  btnVitrine: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 9 },
  btnVitrineText: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  btnWhatsapp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#25D366', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  btnWhatsappText: { fontSize: 13, fontWeight: '600', color: '#25D366' },
});
