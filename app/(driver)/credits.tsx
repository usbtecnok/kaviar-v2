import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driverApi } from '../../src/api/driver.api';
import { COLORS } from '../../src/config/colors';

export default function DriverCredits() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    driverApi.getCredits()
      .then(({ balance }) => setBalance(balance))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Créditos</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <View style={s.content}>
          <View style={s.balanceCard}>
            <Ionicons name="wallet-outline" size={32} color={COLORS.primary} />
            <Text style={s.balanceValue}>{balance ?? '—'}</Text>
            <Text style={s.balanceLabel}>crédito{balance !== 1 ? 's' : ''} disponíve{balance !== 1 ? 'is' : 'l'}</Text>
          </View>

          {balance !== null && balance === 0 && (
            <View style={s.alertCard}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.danger} />
              <Text style={s.alertText}>Sem créditos. Você não receberá ofertas de corrida até recarregar.</Text>
            </View>
          )}

          {balance !== null && balance > 0 && balance < 5 && (
            <View style={[s.alertCard, { backgroundColor: '#fff8e1' }]}>
              <Ionicons name="warning-outline" size={20} color={COLORS.warning} />
              <Text style={[s.alertText, { color: COLORS.warning }]}>Seus créditos estão acabando. Recarregue em breve.</Text>
            </View>
          )}

          <View style={s.infoCard}>
            <Text style={s.infoTitle}>Como funciona</Text>
            <Text style={s.infoText}>Cada corrida aceita consome créditos automaticamente. Corridas locais custam 1 crédito e corridas externas custam 2 créditos.</Text>
            <Text style={[s.infoText, { marginTop: 10 }]}>Para recarregar, entre em contato com o suporte Kaviar.</Text>
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
  balanceCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  balanceValue: { fontSize: 48, fontWeight: '900', color: COLORS.textPrimary, marginTop: 12 },
  balanceLabel: { fontSize: 14, color: COLORS.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  alertCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fde8e8',
    padding: 14, borderRadius: 12, gap: 10, marginBottom: 16,
  },
  alertText: { fontSize: 14, color: COLORS.danger, flex: 1 },
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  infoText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
});
