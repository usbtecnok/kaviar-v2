import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driverApi } from '../../src/api/driver.api';
import { COLORS } from '../../src/config/colors';

type Period = 'today' | '7d' | '30d';
const PERIOD_LABELS: Record<Period, string> = { today: 'Hoje', '7d': '7 dias', '30d': '30 dias' };

const TERRITORY_LABELS: Record<string, string> = {
  COMMUNITY: 'Da comunidade',
  NEIGHBORHOOD: 'Do bairro',
  OUTSIDE: 'Fora do território',
  local: 'Do território',
  adjacent: 'Bairro vizinho',
  external: 'Fora do território',
  UNKNOWN: 'Não classificada',
};

export default function DriverSummary() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [data, setData] = useState<any>(null);

  const load = useCallback(async (p: Period) => {
    try {
      setError(false);
      const result = await driverApi.getFinancialSummary(p);
      setData(result);
    } catch {
      setError(true);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { setLoading(true); load(period); }, [period]);

  const onRefresh = () => { setRefreshing(true); load(period); };

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Resumo Financeiro</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Period tabs */}
      <View style={s.tabs}>
        {(['today', '7d', '30d'] as Period[]).map(p => (
          <TouchableOpacity key={p} style={[s.tab, period === p && s.tabActive]} onPress={() => setPeriod(p)}>
            <Text style={[s.tabText, period === p && s.tabTextActive]}>{PERIOD_LABELS[p]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.errorText}>Não foi possível carregar</Text>
          <TouchableOpacity onPress={() => { setLoading(true); load(period); }}>
            <Text style={s.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
          {/* Financial highlight */}
          <View style={s.highlightCard}>
            <Text style={s.highlightLabel}>Ganho líquido</Text>
            <Text style={s.highlightValue}>{fmt(data.financial.net)}</Text>
          </View>

          {/* Financial breakdown */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Financeiro</Text>
            <Row label="Bruto" value={fmt(data.financial.gross)} />
            <Row label="Taxa plataforma" value={`- ${fmt(data.financial.platform_fee)}`} color={COLORS.danger} />
            <Row label="Líquido" value={fmt(data.financial.net)} color={COLORS.success} bold />
            <Row label="Ticket médio" value={fmt(data.financial.avg_ticket)} />
          </View>

          {/* Rides */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Corridas</Text>
            <Row label="Concluídas" value={String(data.rides.completed)} />
            <Row label="Canceladas" value={String(data.rides.canceled)} />
            <Row label="Retorno p/ casa" value={String(data.homebound)} icon="home-outline" />
          </View>

          {/* Credits */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Créditos</Text>
            <Row label="Consumidos no período" value={String(data.credits.consumed)} />
            <Row label="Saldo atual" value={String(data.credits.balance)} color={COLORS.primary} bold />
          </View>

          {/* Territory */}
          {Object.keys(data.territory).length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Corridas por território</Text>
              {Object.entries(data.territory).map(([key, count]) => (
                <Row key={key} label={TERRITORY_LABELS[key] || key} value={String(count)} />
              ))}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function Row({ label, value, color, bold, icon }: { label: string; value: string; color?: string; bold?: boolean; icon?: string }) {
  return (
    <View style={s.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon && <Ionicons name={icon as any} size={15} color={COLORS.textMuted} />}
        <Text style={s.rowLabel}>{label}</Text>
      </View>
      <Text style={[s.rowValue, color ? { color } : null, bold ? { fontWeight: '800' } : null]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.textMuted, fontSize: 15, marginTop: 12 },
  retryText: { color: COLORS.primary, fontWeight: '600', marginTop: 12 },

  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.textDark },

  content: { paddingHorizontal: 20 },

  highlightCard: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  highlightLabel: { fontSize: 13, color: COLORS.textDark, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 },
  highlightValue: { fontSize: 36, fontWeight: '900', color: COLORS.textDark, marginTop: 4 },

  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 15, color: COLORS.textSecondary },
  rowValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
});
