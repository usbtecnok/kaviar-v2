import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../src/api/client';
import { driverApi } from '../../src/api/driver.api';
import { COLORS } from '../../src/config/colors';

export default function DriverSummary() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [stats, setStats] = useState<{ today: number; week: number; total: number }>({ today: 0, week: 0, total: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [credRes, histRes] = await Promise.allSettled([
        driverApi.getCredits(),
        apiClient.get('/rides/history'),
      ]);
      if (credRes.status === 'fulfilled') setCredits(credRes.value.balance);
      if (histRes.status === 'fulfilled') {
        const rides = histRes.value.data?.rides || histRes.value.data || [];
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        const completed = rides.filter((r: any) => r.status === 'completed');
        setStats({
          today: completed.filter((r: any) => r.created_at?.slice(0, 10) === todayStr).length,
          week: completed.filter((r: any) => new Date(r.created_at) >= weekAgo).length,
          total: completed.length,
        });
      }
    } catch {}
    finally { setLoading(false); }
  };

  const card = (icon: string, label: string, value: string, color: string) => (
    <View style={s.statCard}>
      <Ionicons name={icon as any} size={24} color={color} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Resumo</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <View style={s.content}>
          <View style={s.row}>
            {card('today-outline', 'Hoje', String(stats.today), COLORS.accent)}
            {card('calendar-outline', 'Semana', String(stats.week), COLORS.primary)}
          </View>
          <View style={s.row}>
            {card('car-outline', 'Total', String(stats.total), COLORS.success)}
            {card('wallet-outline', 'Créditos', credits != null ? String(credits) : '—', COLORS.warning)}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginTop: 10 },
  statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
});
