import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../src/api/client';
import { COLORS } from '../../src/config/colors';

interface RideHistory {
  id: string;
  status: string;
  origin_text?: string;
  destination_text?: string;
  requested_at: string;
  final_price?: number;
  passenger?: { name: string };
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  completed: { text: 'Concluída', color: COLORS.success },
  canceled_by_passenger: { text: 'Cancelada', color: COLORS.danger },
  canceled_by_driver: { text: 'Cancelada', color: COLORS.danger },
  no_driver: { text: 'Sem motorista', color: COLORS.textMuted },
};

export default function DriverHistory() {
  const router = useRouter();
  const [rides, setRides] = useState<RideHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await apiClient.get('/api/v2/rides/history');
      setRides(res.data?.rides || res.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch { return iso; }
  };

  const renderRide = ({ item }: { item: RideHistory }) => {
    const st = STATUS_LABELS[item.status] || { text: item.status, color: COLORS.textMuted };
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.date}>{formatDate(item.requested_at)}</Text>
          <Text style={[s.status, { color: st.color }]}>{st.text}</Text>
        </View>
        {item.passenger?.name && <Text style={s.passengerName}>{item.passenger.name}</Text>}
        {item.origin_text && (
          <View style={s.route}>
            <View style={[s.dot, { backgroundColor: COLORS.success }]} />
            <Text style={s.routeText} numberOfLines={1}>{item.origin_text}</Text>
          </View>
        )}
        {item.destination_text && (
          <View style={s.route}>
            <View style={[s.dot, { backgroundColor: COLORS.danger }]} />
            <Text style={s.routeText} numberOfLines={1}>{item.destination_text}</Text>
          </View>
        )}
        {item.final_price != null && (
          <Text style={s.price}>R$ {Number(item.final_price).toFixed(2)}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Histórico de corridas</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : rides.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="car-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyText}>Nenhuma corrida ainda</Text>
        </View>
      ) : (
        <FlatList data={rides} keyExtractor={r => r.id} renderItem={renderRide} contentContainerStyle={{ padding: 20 }} />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 15, marginTop: 12 },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  passengerName: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  date: { fontSize: 12, color: COLORS.textMuted },
  status: { fontSize: 12, fontWeight: '700' },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  routeText: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  price: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginTop: 8, textAlign: 'right' },
});
