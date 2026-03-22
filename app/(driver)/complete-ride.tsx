import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';
import { Ride, RideStatus } from '../../src/types/ride';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  accepted:    { label: 'Indo ao passageiro', color: COLORS.primary, icon: '🚗' },
  arrived:     { label: 'Aguardando embarque', color: COLORS.warning, icon: '📍' },
  in_progress: { label: 'Corrida em andamento', color: COLORS.success, icon: '🛣️' },
};

export default function CompleteRide() {
  const router = useRouter();
  const params = useLocalSearchParams<{ rideId: string; status?: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [rideStatus, setRideStatus] = useState<RideStatus>((params.status as RideStatus) || 'accepted');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { loadRide(); }, []);

  const loadRide = async () => {
    try {
      const current = await driverApi.getCurrentRide();
      if (current) {
        setRide(current);
        setRideStatus(current.status as RideStatus);
      }
    } catch (e: any) {
      if (e.response?.status !== 401) {
        Alert.alert('Erro', 'Não foi possível carregar a corrida. Verifique sua conexão.');
      }
    } finally { setFetching(false); }
  };

  const handleArrived = async () => {
    setLoading(true);
    try {
      await driverApi.arrived(params.rideId!);
      setRideStatus('arrived');
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Não foi possível confirmar chegada'));
    } finally { setLoading(false); }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await driverApi.startRide(params.rideId!);
      setRideStatus('in_progress');
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Não foi possível iniciar a corrida'));
    } finally { setLoading(false); }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await driverApi.completeRide(params.rideId!);
      Alert.alert('Corrida finalizada!', 'Obrigado pela viagem.', [
        { text: 'OK', onPress: () => router.replace('/(driver)/online') }
      ]);
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Não foi possível finalizar a corrida'));
    } finally { setLoading(false); }
  };

  if (fetching) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const info = STATUS_LABELS[rideStatus] || STATUS_LABELS.accepted;

  return (
    <View style={styles.container}>
      <View style={styles.statusBadge}>
        <Text style={styles.statusIcon}>{info.icon}</Text>
        <Text style={[styles.statusLabel, { color: info.color }]}>{info.label}</Text>
      </View>

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
      </View>

      {rideStatus === 'accepted' && (
        <Button title={loading ? 'Aguarde...' : 'Cheguei no local'} onPress={handleArrived} disabled={loading} style={{ backgroundColor: COLORS.primary }} />
      )}
      {rideStatus === 'arrived' && (
        <Button title={loading ? 'Aguarde...' : 'Iniciar corrida'} onPress={handleStart} disabled={loading} style={{ backgroundColor: COLORS.warning }} />
      )}
      {rideStatus === 'in_progress' && (
        <Button title={loading ? 'Finalizando...' : 'Finalizar corrida'} onPress={handleComplete} disabled={loading} style={{ backgroundColor: COLORS.success }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.background, justifyContent: 'center' },
  statusBadge: { alignItems: 'center', marginBottom: 24 },
  statusIcon: { fontSize: 48 },
  statusLabel: { fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', marginTop: 12 },
  address: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 4 },
  arrow: { fontSize: 24, textAlign: 'center', color: COLORS.statusOffline, marginVertical: 8 },
  passengerName: { fontSize: 16, color: COLORS.textPrimary, marginTop: 4 },
});
