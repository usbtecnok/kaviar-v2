import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { passengerApi } from '../../src/api/passenger.api';
import { authStore } from '../../src/auth/auth.store';
import { Ride, RideStatus, RIDE_STATUS_LABEL } from '../../src/types/ride';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

const POLL_INTERVAL = 3000;

type Screen = 'idle' | 'requesting' | 'tracking';

export default function PassengerMap() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('idle');
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ride, setRide] = useState<Ride | null>(null);
  const [userName, setUserName] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const user = authStore.getUser();
    if (user?.name) setUserName(user.name);
    acquireLocation();
    return () => stopPolling();
  }, []);

  // --- Polling ---
  const startPolling = (rideId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const updated = await passengerApi.getRide(rideId);
        setRide(updated);
        if (['completed', 'canceled_by_passenger', 'canceled_by_driver', 'no_driver'].includes(updated.status)) {
          stopPolling();
          if (updated.status === 'completed') {
            Alert.alert('Corrida Finalizada!', 'Obrigado por usar o Kaviar.', [
              { text: 'Avaliar', onPress: () => router.push({ pathname: '/(passenger)/rating', params: { rideId: updated.id, driverName: updated.driver?.name || '', driverId: updated.driver?.id || '' } }) },
              { text: 'Fechar', onPress: resetToIdle },
            ]);
          } else if (updated.status === 'no_driver') {
            Alert.alert('Sem motoristas', 'Não encontramos motoristas disponíveis no momento.', [
              { text: 'Tentar novamente', onPress: () => handleRetry() },
              { text: 'Cancelar', style: 'cancel', onPress: resetToIdle },
            ]);
          }
        }
      } catch {
        // Polling silencioso — erros de rede transientes são esperados
      }
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const resetToIdle = () => {
    stopPolling();
    setRide(null);
    setScreen('idle');
    setOriginText('');
    setDestText('');
  };

  // --- Location ---
  const acquireLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Localização necessária', 'Ative a localização para solicitar corridas.');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      Alert.alert('Erro de GPS', 'Não foi possível obter sua localização. Tente novamente.');
    }
  };

  // --- Actions ---
  const handleRetry = () => {
    stopPolling();
    setRide(null);
    setScreen('idle');
    // Mantém originText e destText para o usuário não precisar redigitar
    setTimeout(() => handleRequest(), 100);
  };

  const handleRequest = async () => {
    if (!originText.trim() || !destText.trim()) {
      Alert.alert('Preencha os campos', 'Informe origem e destino.');
      return;
    }
    if (!userLocation) {
      Alert.alert('Localização indisponível', 'Aguarde o GPS ou verifique as permissões.');
      await acquireLocation();
      return;
    }
    setLoading(true);
    try {
      const result = await passengerApi.requestRide({
        origin: { lat: userLocation.lat, lng: userLocation.lng, text: originText.trim() },
        destination: { lat: userLocation.lat + 0.005, lng: userLocation.lng + 0.005, text: destText.trim() },
      });
      const rideData = await passengerApi.getRide(result.ride_id);
      setRide(rideData);
      setScreen('tracking');
      startPolling(result.ride_id);
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Não foi possível solicitar a corrida.'));
    } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!ride) return;
    Alert.alert('Cancelar corrida?', 'Deseja realmente cancelar?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim, cancelar', style: 'destructive', onPress: async () => {
        try {
          await passengerApi.cancelRide(ride.id);
          Alert.alert('Corrida cancelada');
          resetToIdle();
        } catch (e: any) {
          Alert.alert('Erro', friendlyError(e, 'Não foi possível cancelar.'));
        }
      }},
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => {
        stopPolling();
        await authStore.clearAuth();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  // --- Render: Idle ---
  if (screen === 'idle') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{userName ? `Olá, ${userName}` : 'Kaviar'}</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.subtitle}>Para onde você vai?</Text>
          <Input placeholder="Origem (ex: Lapa)" value={originText} onChangeText={setOriginText} />
          <Input placeholder="Destino (ex: Glória)" value={destText} onChangeText={setDestText} />
          <Button title="Solicitar Corrida" variant="primary" loading={loading} onPress={handleRequest} />
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Render: Tracking ---
  const status = ride?.status as RideStatus | undefined;
  const canCancel = status && ['requested', 'offered'].includes(status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sua Corrida</Text>
      </View>

      <View style={styles.center}>
        {!ride ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <View style={styles.card}>
            <View style={[styles.chip, { backgroundColor: chipColor(status!) }]}>
              <Text style={styles.chipText}>{RIDE_STATUS_LABEL[status!] || status}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>📍 Origem</Text>
              <Text style={styles.value}>{ride.origin_text || 'Carregando...'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>🏁 Destino</Text>
              <Text style={styles.value}>{ride.destination_text || 'Carregando...'}</Text>
            </View>

            {ride.driver && (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.label}>Motorista</Text>
                  <Text style={styles.value}>{ride.driver.name}</Text>
                </View>
                {ride.driver.phone && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Telefone</Text>
                    <Text style={styles.value}>{ride.driver.phone}</Text>
                  </View>
                )}
                {(ride.driver as any).vehicle_model && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Veículo</Text>
                    <Text style={styles.value}>{(ride.driver as any).vehicle_model} {(ride.driver as any).vehicle_color} • {(ride.driver as any).vehicle_plate}</Text>
                  </View>
                )}
              </>
            )}

            {['requested', 'offered'].includes(status!) && (
              <View style={styles.waitingRow}>
                <ActivityIndicator size="small" color={COLORS.textMuted} />
                <Text style={styles.waitingText}>Buscando motorista...</Text>
              </View>
            )}
          </View>
        )}

        {canCancel && (
          <Button title="Cancelar Corrida" variant="danger" onPress={handleCancel} style={{ marginTop: 16 }} />
        )}
      </View>
    </SafeAreaView>
  );
}

function chipColor(status: RideStatus): string {
  const map: Partial<Record<RideStatus, string>> = {
    requested: COLORS.warning, offered: COLORS.warning,
    accepted: COLORS.primary, arrived: COLORS.primary,
    in_progress: COLORS.success, completed: COLORS.success,
    canceled_by_passenger: COLORS.textMuted, canceled_by_driver: COLORS.textMuted, no_driver: COLORS.textMuted,
  };
  return map[status] || COLORS.textMuted;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, paddingBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 20, textAlign: 'center' },
  center: { flex: 1, padding: 20, justifyContent: 'center' },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 20, elevation: 2 },
  chip: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  chipText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  row: { marginBottom: 10 },
  label: { fontSize: 13, color: COLORS.textMuted },
  value: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 10 },
  waitingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  waitingText: { fontSize: 14, color: COLORS.textMuted, marginLeft: 8 },
  logoutBtn: { alignItems: 'center', padding: 16, marginHorizontal: 20 },
  logoutText: { color: COLORS.danger, fontSize: 16, fontWeight: '600' },
});
