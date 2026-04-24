import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';
import { groupLabel } from '../../src/utils/tripLabel';

const ADJUSTMENTS = [
  { value: 5,  label: '+R$ 5',  tag: 'Ajuste leve' },
  { value: 8,  label: '+R$ 8',  tag: 'Ajuste moderado' },
  { value: 10, label: '+R$ 10', tag: 'Ajuste especial' },
] as const;

export default function AcceptRide() {
  const router = useRouter();
  const { offerId, rideId } = useLocalSearchParams<{ offerId: string; rideId: string }>();
  const [loading, setLoading] = useState(false);
  const [offerData, setOfferData] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [expired, setExpired] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<number | null>(null);

  useEffect(() => { loadOffer(); }, []);

  const loadOffer = async () => {
    try {
      const offers = await driverApi.getOffers();
      const offer = offers.find(o => o.id === offerId);
      if (offer) setOfferData(offer);
      else setExpired(true);
    } catch { setExpired(true); }
    finally { setFetching(false); }
  };

  const handleAccept = async () => {
    if (!offerId) return;
    setLoading(true);
    try {
      const result = await driverApi.acceptOffer(offerId, selectedAdjustment ?? undefined);
      setAccepted(true);
      setTimeout(() => router.replace(`/(driver)/complete-ride?rideId=${result.ride_id}&status=accepted`), 1500);
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Erro ao aceitar corrida'));
    } finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!offerId) return;
    setLoading(true);
    try { await driverApi.rejectOffer(offerId); router.back(); }
    catch { router.back(); }
  };

  if (fetching) return <View style={s.container}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  if (expired) return (
    <View style={s.container}>
      <Text style={s.bigIcon}>⏰</Text>
      <Text style={s.centeredTitle}>Oferta expirada</Text>
      <Text style={s.centeredSub}>Esta corrida não está mais disponível.</Text>
      <Button title="Voltar" onPress={() => router.replace('/(driver)/online')} style={{ marginTop: 24 }} />
    </View>
  );

  if (accepted) return (
    <View style={s.container}>
      <Text style={s.bigIcon}>✅</Text>
      <Text style={s.centeredTitle}>Corrida aceita!</Text>
      <Text style={s.centeredSub}>Dirija-se ao local de embarque.</Text>
    </View>
  );

  const ride = offerData?.ride;
  const quotedPrice = ride?.quoted_price != null ? Number(ride.quoted_price) : null;
  const finalPrice = quotedPrice != null && selectedAdjustment ? quotedPrice + selectedAdjustment : null;

  return (
    <View style={s.container}>
      <Text style={s.title}>Nova Corrida</Text>

      <View style={s.card}>
        {/* Territory badges */}
        {ride?.is_homebound ? (
          <View style={[s.badge, { backgroundColor: '#e8f5e9' }]}>
            <Text style={[s.badgeText, { color: '#2e7d32' }]}>🏠 Retorno para casa</Text>
            <Text style={s.badgeSub}>Taxa reduzida — passageiro da sua região voltando para casa</Text>
          </View>
        ) : offerData?.territory_tier === 'COMMUNITY' ? (
          <View style={[s.badge, { backgroundColor: '#e3f2fd' }]}>
            <Text style={[s.badgeText, { color: '#1565c0' }]}>Da sua comunidade</Text>
            <Text style={s.badgeSub}>Prioridade territorial por comunidade</Text>
          </View>
        ) : offerData?.territory_tier === 'NEIGHBORHOOD' ? (
          <View style={[s.badge, { backgroundColor: '#fff3e0' }]}>
            <Text style={[s.badgeText, { color: '#e65100' }]}>Do seu bairro</Text>
            <Text style={s.badgeSub}>Prioridade territorial por bairro</Text>
          </View>
        ) : offerData?.territory_tier === 'OUTSIDE' ? (
          <View style={[s.badge, { backgroundColor: '#f5f5f5' }]}>
            <Text style={[s.badgeText, { color: '#616161' }]}>Região próxima</Text>
            <Text style={s.badgeSub}>Corrida fora do seu território principal</Text>
          </View>
        ) : null}

        <Text style={s.sectionLabel}>Origem</Text>
        <Text style={s.address}>{ride?.origin_text || 'Não informada'}</Text>
        <Text style={s.arrow}>↓</Text>
        <Text style={s.sectionLabel}>Destino</Text>
        <Text style={s.address}>{ride?.destination_text || 'Não informado'}</Text>

        {ride?.passenger?.name && (
          <>
            <Text style={s.sectionLabel}>Passageiro</Text>
            <Text style={s.passengerName}>{ride.passenger.name}</Text>
          </>
        )}

        <Text style={s.type}>Tipo: {ride?.ride_type || 'normal'}</Text>

        {ride?.wait_requested && (
          <View style={[s.badge, { backgroundColor: '#fff8e1', marginTop: 10 }]}>
            <Text style={[s.badgeText, { color: '#f57f17' }]}>
              ⏳ Espera solicitada{ride.wait_estimated_min ? `: ~${ride.wait_estimated_min} min` : ''}
            </Text>
            {ride.wait_estimated_min ? (
              <Text style={s.badgeSub}>
                + R$ {(ride.wait_estimated_min * 0.50).toFixed(2)} estimado · cobrança pelo tempo real
              </Text>
            ) : (
              <Text style={s.badgeSub}>Passageiro vai precisar que você aguarde no destino</Text>
            )}
            <Text style={[s.badgeSub, { color: '#e65100', fontWeight: '700', marginTop: 4 }]}>
              Consome 2 créditos
            </Text>
          </View>
        )}

        {ride?.trip_details && (
          <View style={s.groupCard}>
            <Ionicons name="people" size={16} color={COLORS.accent} />
            <Text style={s.groupText}>
              {groupLabel(ride.trip_details.passengers || 1, !!ride.trip_details.has_luggage)}
            </Text>
          </View>
        )}

        {quotedPrice != null && (
          <View style={s.priceRow}>
            <Ionicons name="cash-outline" size={16} color={COLORS.primary} />
            <Text style={s.priceText}>Valor base R$ {quotedPrice.toFixed(2)}</Text>
          </View>
        )}
      </View>

      {/* Adjustment cards — only show if ride has a quoted price */}
      {quotedPrice != null && (
        <View style={s.adjustSection}>
          <Text style={s.adjustTitle}>Sugerir ajuste de valor?</Text>
          <View style={s.adjustRow}>
            {ADJUSTMENTS.map(adj => {
              const active = selectedAdjustment === adj.value;
              return (
                <TouchableOpacity
                  key={adj.value}
                  style={[s.adjustCard, active && s.adjustCardActive]}
                  onPress={() => setSelectedAdjustment(active ? null : adj.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.adjustValue, active && s.adjustValueActive]}>{adj.label}</Text>
                  <Text style={[s.adjustTag, active && s.adjustTagActive]}>{adj.tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {finalPrice != null && (
            <View style={s.finalPriceRow}>
              <Text style={s.finalPriceLabel}>Valor final</Text>
              <Text style={s.finalPriceValue}>R$ {finalPrice.toFixed(2)}</Text>
            </View>
          )}
        </View>
      )}

      <Button
        title={loading ? 'Aceitando...' : selectedAdjustment ? 'Aceitar com ajuste' : 'Aceitar corrida'}
        onPress={handleAccept}
        disabled={loading}
        style={s.acceptBtn}
      />
      <Button title="Recusar" onPress={handleReject} disabled={loading} style={s.rejectBtn} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.background, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 20, marginBottom: 16 },
  badge: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 12 },
  badgeText: { fontSize: 15, fontWeight: '700' },
  badgeSub: { fontSize: 12, color: '#666', marginTop: 2 },
  sectionLabel: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', marginTop: 12 },
  address: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 4 },
  arrow: { fontSize: 24, textAlign: 'center', color: COLORS.statusOffline, marginVertical: 8 },
  passengerName: { fontSize: 16, color: COLORS.textPrimary, marginTop: 4 },
  type: { fontSize: 14, color: COLORS.textSecondary, marginTop: 16, textAlign: 'right' },
  tripInfo: { fontSize: 14, color: COLORS.textPrimary, marginTop: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, overflow: 'hidden' },
  groupCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: COLORS.surfaceLight, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border },
  groupText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  priceText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  // Adjustment section
  adjustSection: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  adjustTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12, textAlign: 'center' },
  adjustRow: { flexDirection: 'row', gap: 8 },
  adjustCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  adjustCardActive: { borderColor: COLORS.primary, backgroundColor: '#1a1a0a' },
  adjustValue: { fontSize: 18, fontWeight: '800', color: COLORS.textSecondary },
  adjustValueActive: { color: COLORS.primary },
  adjustTag: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  adjustTagActive: { color: COLORS.primary },
  finalPriceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  finalPriceLabel: { fontSize: 14, color: COLORS.textSecondary },
  finalPriceValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },

  acceptBtn: { backgroundColor: COLORS.success },
  rejectBtn: { backgroundColor: COLORS.danger },
  bigIcon: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  centeredTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: COLORS.textPrimary },
  centeredSub: { fontSize: 16, textAlign: 'center', color: COLORS.textSecondary, marginTop: 8 },
});
