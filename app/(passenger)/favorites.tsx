import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../src/api/client';
import { COLORS } from '../../src/config/colors';

interface Favorite { id: string; label: string; type: string; lat: number; lng: number; }

export default function Favorites() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data } = await apiClient.get('/api/passenger/favorites');
      if (data.success) setFavorites(data.favorites || []);
    } catch (e: any) {
      if (e.response?.status !== 401) {
        Alert.alert('Erro', e.response?.data?.error || 'Não foi possível carregar favoritos');
      }
    } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    Alert.alert('Remover', 'Remover este favorito?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        try {
          await apiClient.delete(`/api/passenger/favorites/${id}`);
          setFavorites(f => f.filter(x => x.id !== id));
        } catch { Alert.alert('Erro', 'Não foi possível remover'); }
      }},
    ]);
  };

  const icon = (type: string) => type === 'HOME' ? 'home' : type === 'WORK' ? 'briefcase' : 'location';

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Favoritos</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : favorites.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="heart-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyText}>Nenhum favorito salvo</Text>
          <Text style={s.emptyHint}>Seus endereços favoritos aparecerão aqui</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardIcon}>
                <Ionicons name={icon(item.type) as any} size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardLabel}>{item.label}</Text>
                <Text style={s.cardCoords}>{Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(item.id)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary, marginTop: 16 },
  emptyHint: { fontSize: 13, color: COLORS.textMuted, marginTop: 6, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  cardCoords: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
