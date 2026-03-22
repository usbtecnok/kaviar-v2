import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';
import { friendlyError } from '../../src/utils/errorMessage';

export default function AcceptRide() {
  const router = useRouter();
  const { offerId, rideId } = useLocalSearchParams<{ offerId: string; rideId: string }>();
  const [loading, setLoading] = useState(false);
  const [offerData, setOfferData] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    loadOffer();
  }, []);

  const loadOffer = async () => {
    try {
      const offers = await driverApi.getOffers();
      const offer = offers.find(o => o.id === offerId);
      if (offer) {
        setOfferData(offer);
      }
    } catch {} finally { setFetching(false); }
  };

  const handleAccept = async () => {
    if (!offerId) return;
    setLoading(true);
    try {
      const result = await driverApi.acceptOffer(offerId);
      Alert.alert('Corrida aceita!', 'Dirija-se ao local de embarque.', [
        { text: 'OK', onPress: () => router.replace(`/(driver)/complete-ride?rideId=${result.ride_id}&status=accepted`) }
      ]);
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
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const ride = offerData?.ride;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nova Corrida</Text>

      <View style={styles.card}>
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
  container: { flex: 1, padding: 20, backgroundColor: '#F5F5F5', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 12, color: '#999', textTransform: 'uppercase', marginTop: 12 },
  address: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 4 },
  arrow: { fontSize: 24, textAlign: 'center', color: '#CCC', marginVertical: 8 },
  passengerName: { fontSize: 16, color: '#333', marginTop: 4 },
  type: { fontSize: 14, color: '#666', marginTop: 16, textAlign: 'right' },
  acceptBtn: { backgroundColor: '#4CAF50' },
  rejectBtn: { backgroundColor: '#F44336' },
});
