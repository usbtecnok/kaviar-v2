import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

export default function AcceptRide() {
  const router = useRouter();
  const { offerId, rideId } = useLocalSearchParams<{ offerId: string; rideId: string }>();
  const [loading, setLoading] = useState(false);
  const [offerData, setOfferData] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [expired, setExpired] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedRideId, setAcceptedRideId] = useState('');

  useEffect(() => {
    loadOffer();
  }, []);

  const loadOffer = async () => {
    try {
      const offers = await driverApi.getOffers();
      const offer = offers.find(o => o.id === offerId);
      if (offer) {
        setOfferData(offer);
      } else {
        setExpired(true);
      }
    } catch {
      setExpired(true);
    } finally { setFetching(false); }
  };

  const handleAccept = async () => {
    if (!offerId) return;
    setLoading(true);
    try {
      const result = await driverApi.acceptOffer(offerId);
      setAcceptedRideId(result.ride_id);
      setAccepted(true);
      setTimeout(() => router.replace(`/(driver)/complete-ride?rideId=${result.ride_id}&status=accepted`), 1500);
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Erro ao aceitar corrida'));
    } finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!offerId) return;
    setLoading(true);
    try {
      await driverApi.rejectOffer(offerId);
      router.back();
    } catch {
      router.back();
    }
  };

  if (fetching) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (expired) {
    return (
      <View style={styles.container}>
        <Text style={styles.expiredIcon}>⏰</Text>
        <Text style={styles.expiredTitle}>Oferta expirada</Text>
        <Text style={styles.expiredText}>Esta corrida não está mais disponível.</Text>
        <Button title="Voltar" onPress={() => router.replace('/(driver)/online')} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (accepted) {
    return (
      <View style={styles.container}>
        <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>✅</Text>
        <Text style={styles.expiredTitle}>Corrida aceita!</Text>
        <Text style={styles.expiredText}>Dirija-se ao local de embarque.</Text>
      </View>
    );
  }

  const ride = offerData?.ride;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nova Corrida</Text>

      <View style={styles.card}>
        {ride?.is_homebound ? (
          <View style={styles.homeboundBadge}>
            <Text style={styles.homeboundText}>🏠 Retorno para casa</Text>
            <Text style={styles.homeboundSubtext}>Taxa reduzida — passageiro da sua região voltando para casa</Text>
          </View>
        ) : offerData?.territory_tier === 'COMMUNITY' ? (
          <View style={[styles.homeboundBadge, { backgroundColor: '#e3f2fd' }]}>
            <Text style={[styles.homeboundText, { color: '#1565c0' }]}>Da sua comunidade</Text>
            <Text style={styles.homeboundSubtext}>Prioridade territorial por comunidade</Text>
          </View>
        ) : offerData?.territory_tier === 'NEIGHBORHOOD' ? (
          <View style={[styles.homeboundBadge, { backgroundColor: '#fff3e0' }]}>
            <Text style={[styles.homeboundText, { color: '#e65100' }]}>Do seu bairro</Text>
            <Text style={styles.homeboundSubtext}>Prioridade territorial por bairro</Text>
          </View>
        ) : offerData?.territory_tier === 'OUTSIDE' ? (
          <View style={[styles.homeboundBadge, { backgroundColor: '#f5f5f5' }]}>
            <Text style={[styles.homeboundText, { color: '#616161' }]}>Região próxima</Text>
            <Text style={styles.homeboundSubtext}>Corrida fora do seu território principal</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Origem</Text>
        <Text style={styles.address}>{ride?.origin_text || 'Não informada'}</Text>

        <Text style={styles.arrow}>↓</Text>

        <Text style={styles.sectionTitle}>Destino</Text>
        <Text style={styles.address}>{ride?.destination_text || 'Não informado'}</Text>

        {ride?.passenger?.name && (
          <>
            <Text style={styles.sectionTitle}>Passageiro</Text>
            <Text style={styles.passengerName}>{ride.passenger.name}</Text>
          </>
        )}

        <Text style={styles.type}>Tipo: {ride?.ride_type || 'normal'}</Text>

        {ride?.quoted_price != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary }}>Estimativa R$ {Number(ride.quoted_price).toFixed(2)}</Text>
          </View>
        )}
      </View>

      <Button
        title={loading ? 'Aceitando...' : 'Aceitar Corrida'}
        onPress={handleAccept}
        disabled={loading}
        style={styles.acceptBtn}
      />
      <Button
        title="Recusar"
        onPress={handleReject}
        disabled={loading}
        style={styles.rejectBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.background, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 20, marginBottom: 24 },
  homeboundBadge: { backgroundColor: '#e8f5e9', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 12 },
  homeboundText: { fontSize: 15, fontWeight: '700', color: '#2e7d32' },
  homeboundSubtext: { fontSize: 12, color: '#666', marginTop: 2 },
  sectionTitle: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', marginTop: 12 },
  address: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 4 },
  arrow: { fontSize: 24, textAlign: 'center', color: COLORS.statusOffline, marginVertical: 8 },
  passengerName: { fontSize: 16, color: COLORS.textPrimary, marginTop: 4 },
  type: { fontSize: 14, color: COLORS.textSecondary, marginTop: 16, textAlign: 'right' },
  acceptBtn: { backgroundColor: COLORS.success },
  rejectBtn: { backgroundColor: COLORS.danger },
  expiredIcon: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  expiredTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: COLORS.textPrimary },
  expiredText: { fontSize: 16, textAlign: 'center', color: COLORS.textSecondary, marginTop: 8 },
});
