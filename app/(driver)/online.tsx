import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';
import { authStore } from '../../src/auth/auth.store';
import { RideOffer } from '../../src/types/ride';

const POLL_INTERVAL = 5000;
const LOCATION_INTERVAL = 15000;

export default function DriverOnline() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [pendingOffer, setPendingOffer] = useState<RideOffer | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const locationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadUser();
    checkCurrentRide();
    return () => { stopAll(); };
  }, []);

  const loadUser = async () => {
    const user = await authStore.getUser();
    if (user?.name) setUserName(user.name);
  };

  const checkCurrentRide = async () => {
    try {
      const ride = await driverApi.getCurrentRide();
      if (ride) {
        router.replace(`/(driver)/complete-ride?rideId=${ride.id}&status=${ride.status}`);
      }
    } catch {}
  };

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const offers = await driverApi.getOffers();
        if (offers.length > 0 && !pendingOffer) {
          setPendingOffer(offers[0]);
        }
      } catch {}
    }, POLL_INTERVAL);
  };

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão de localização negada');
      return;
    }
    const send = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        await driverApi.sendLocation(loc.coords.latitude, loc.coords.longitude);
      } catch {}
    };
    await send();
    locationRef.current = setInterval(send, LOCATION_INTERVAL);
  };

  const stopAll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (locationRef.current) clearInterval(locationRef.current);
    pollRef.current = null;
    locationRef.current = null;
  };

  const handleGoOnline = async () => {
    setLoading(true);
    try {
      await driverApi.setAvailability('online');
      setIsOnline(true);
      await startLocationTracking();
      startPolling();
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Erro ao ficar online');
    } finally { setLoading(false); }
  };

  const handleGoOffline = async () => {
    setLoading(true);
    try {
      stopAll();
      await driverApi.setAvailability('offline');
      setIsOnline(false);
      setPendingOffer(null);
    } catch (e: any) {
      Alert.alert('Erro', e.message === 'Network Error' ? 'Sem conexão' : 'Erro ao ficar offline');
    } finally { setLoading(false); }
  };

  const handleAcceptOffer = () => {
    if (!pendingOffer) return;
    router.push(`/(driver)/accept-ride?offerId=${pendingOffer.id}&rideId=${pendingOffer.ride.id}`);
  };

  const handleRejectOffer = async () => {
    if (!pendingOffer) return;
    try {
      await driverApi.rejectOffer(pendingOffer.id);
      setPendingOffer(null);
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível recusar a oferta');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => {
        stopAll();
        await authStore.clearAuth();
        router.replace('/(auth)/login');
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kaviar Motorista</Text>
      {userName ? <Text style={styles.userName}>{userName}</Text> : null}

      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
        <Text style={[styles.statusText, isOnline && styles.statusOnline]}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>
      </View>

      {pendingOffer && (
        <View style={styles.offerCard}>
          <Text style={styles.offerTitle}>🚗 Nova corrida!</Text>
          <Text style={styles.offerText}>
            {pendingOffer.ride.origin_text || 'Origem não informada'}
          </Text>
          <Text style={styles.offerArrow}>↓</Text>
          <Text style={styles.offerText}>
            {pendingOffer.ride.destination_text || 'Destino não informado'}
          </Text>
          {pendingOffer.ride.passenger?.name && (
            <Text style={styles.offerPassenger}>Passageiro: {pendingOffer.ride.passenger.name}</Text>
          )}
          <View style={styles.offerButtons}>
            <Button title="Aceitar" onPress={handleAcceptOffer} style={styles.acceptBtn} />
            <Button title="Recusar" onPress={handleRejectOffer} style={styles.rejectBtn} />
          </View>
        </View>
      )}

      {!isOnline ? (
        <Button title={loading ? 'Conectando...' : 'Ficar Online'} onPress={handleGoOnline} disabled={loading} />
      ) : !pendingOffer ? (
        <>
          <Text style={styles.waitingText}>Aguardando corridas...</Text>
          <Button title="Ficar Offline" onPress={handleGoOffline} style={styles.offlineBtn} disabled={loading} />
        </>
      ) : null}

      <Button title="Sair" onPress={handleLogout} style={styles.logoutBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F5F5F5', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  userName: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#CCC', marginRight: 8 },
  statusDotOnline: { backgroundColor: '#4CAF50' },
  statusText: { fontSize: 28, fontWeight: 'bold', color: '#999' },
  statusOnline: { color: '#4CAF50' },
  waitingText: { fontSize: 16, color: '#999', textAlign: 'center', marginBottom: 24 },
  offerCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  offerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  offerText: { fontSize: 16, color: '#333' },
  offerArrow: { fontSize: 20, textAlign: 'center', color: '#999', marginVertical: 4 },
  offerPassenger: { fontSize: 14, color: '#666', marginTop: 8 },
  offerButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  acceptBtn: { flex: 1, backgroundColor: '#4CAF50' },
  rejectBtn: { flex: 1, backgroundColor: '#F44336' },
  offlineBtn: { backgroundColor: '#FF9800' },
  logoutBtn: { backgroundColor: '#FF3B30', marginTop: 20 },
});
