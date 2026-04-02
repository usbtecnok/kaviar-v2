import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { passengerApi } from '../../src/api/passenger.api';
import { authStore } from '../../src/auth/auth.store';
import { Ride, RideStatus } from '../../src/types/ride';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';
import { ENV } from '../../src/config/env';

const POLL_INTERVAL = 3000;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  requested:  { label: 'Buscando motorista...', color: COLORS.warning, icon: '🔍' },
  offered:    { label: 'Buscando motorista...', color: COLORS.warning, icon: '🔍' },
  accepted:   { label: 'Motorista a caminho',   color: COLORS.accent,  icon: '🚗' },
  arrived:    { label: 'Motorista chegou!',      color: COLORS.primary, icon: '📍' },
  in_progress:{ label: 'Corrida em andamento',   color: COLORS.success, icon: '🛣️' },
};

type Screen = 'idle' | 'tracking';

export default function PassengerMap() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('idle');
  const [originText, setOriginText] = useState('');
  const [destText, setDestText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ride, setRide] = useState<Ride | null>(null);
  const [userName, setUserName] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<any>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const user = authStore.getUser();
    if (user?.name) setUserName(user.name);
    acquireLocation();
    return () => stopAll();
  }, []);

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

  const startPolling = (rideId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const updated = await passengerApi.getRide(rideId);
        setRide(updated);
        if (['completed', 'canceled_by_passenger', 'canceled_by_driver', 'no_driver'].includes(updated.status)) {
          stopAll();
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
      } catch {}
    }, POLL_INTERVAL);
  };

  const startSSE = async (rideId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;
      const url = `${ENV.API_URL}/api/realtime/rides/${rideId}`;
      const es = new EventSource(url, { headers: { Authorization: `Bearer ${token}` } } as any);
      es.onmessage = (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'driver_location' && data.lat && data.lng) {
            setDriverLocation({ lat: Number(data.lat), lng: Number(data.lng) });
          }
        } catch {}
      };
      es.onerror = () => {};
      sseRef.current = es;
    } catch {}
  };

  const stopSSE = () => { if (sseRef.current) { sseRef.current.close(); sseRef.current = null; } setDriverLocation(null); };
  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  const stopAll = () => { stopPolling(); stopSSE(); };

  const resetToIdle = () => { stopAll(); setRide(null); setScreen('idle'); setOriginText(''); setDestText(''); };

  const handleRetry = () => { stopPolling(); setRide(null); setScreen('idle'); setTimeout(() => handleRequest(), 100); };

  const handleRequest = async () => {
    if (!originText.trim() || !destText.trim()) { Alert.alert('Preencha os campos', 'Informe origem e destino.'); return; }
    if (!userLocation) { Alert.alert('Localização indisponível', 'Aguarde o GPS ou verifique as permissões.'); await acquireLocation(); return; }
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
      startSSE(result.ride_id);
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Não foi possível solicitar a corrida.'));
    } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!ride) return;
    Alert.alert('Cancelar corrida?', 'Deseja realmente cancelar?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim, cancelar', style: 'destructive', onPress: async () => {
        try { await passengerApi.cancelRide(ride.id); Alert.alert('Corrida cancelada'); resetToIdle(); }
        catch (e: any) { Alert.alert('Erro', friendlyError(e, 'Não foi possível cancelar.')); }
      }},
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { stopAll(); await authStore.clearAuth(); router.replace('/(auth)/login'); }},
    ]);
  };

  // --- Map region ---
  const status = ride?.status as RideStatus | undefined;
  const mapTarget = ride ? (
    status === 'in_progress'
      ? { lat: Number(ride.dest_lat), lng: Number(ride.dest_lng), label: ride.destination_text || 'Destino' }
      : { lat: Number(ride.origin_lat), lng: Number(ride.origin_lng), label: ride.origin_text || 'Origem' }
  ) : null;

  const regionCenter = mapTarget || userLocation;
  const region: Region | undefined = regionCenter ? {
    latitude: regionCenter.lat, longitude: regionCenter.lng,
    latitudeDelta: 0.015, longitudeDelta: 0.015,
  } : undefined;

  const fitMarkers = () => {
    if (!mapRef.current || !driverLocation || !mapTarget) return;
    mapRef.current.fitToCoordinates(
      [{ latitude: driverLocation.lat, longitude: driverLocation.lng }, { latitude: mapTarget.lat, longitude: mapTarget.lng }],
      { edgePadding: { top: 80, right: 80, bottom: 260, left: 80 }, animated: true }
    );
  };

  useEffect(() => { if (driverLocation && mapTarget) fitMarkers(); }, [driverLocation]);

  // --- Tracking UI pieces ---
  const canCancel = status && ['requested', 'offered'].includes(status);
  const info = status ? STATUS_CONFIG[status] || STATUS_CONFIG.requested : STATUS_CONFIG.requested;

  return (
    <View style={styles.container}>
      {/* Map — always visible */}
      {region ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {screen === 'tracking' && mapTarget && (
            <Marker coordinate={{ latitude: mapTarget.lat, longitude: mapTarget.lng }}
              title={status === 'in_progress' ? 'Destino' : 'Embarque'} description={mapTarget.label}
              pinColor={status === 'in_progress' ? COLORS.success : COLORS.primary} />
          )}
          {driverLocation && (
            <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
              title="Motorista" pinColor={COLORS.warning} />
          )}
        </MapView>
      ) : (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.mapLoadingText}>Obtendo localização...</Text>
        </View>
      )}

      {/* Overlay: idle */}
      {screen === 'idle' && (
        <>
          <SafeAreaView edges={['top']} style={styles.topBar}>
            <View style={styles.header}>
              <View>
                <Text style={styles.brand}>KAVIAR</Text>
                <Text style={styles.greeting}>{userName ? `Olá, ${userName}` : 'Passageiro'}</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="log-out-outline" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <View style={styles.bottomCard}>
            <Text style={styles.question}>Para onde você vai?</Text>
            <View style={styles.routeInputs}>
              <View style={styles.routeDots}>
                <View style={[styles.dot, { backgroundColor: COLORS.statusOnline }]} />
                <View style={styles.dotLine} />
                <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
              </View>
              <View style={styles.inputsCol}>
                <Input placeholder="Origem (ex: Lapa)" value={originText} onChangeText={setOriginText} icon="ellipse" />
                <Input placeholder="Destino (ex: Glória)" value={destText} onChangeText={setDestText} icon="location" />
              </View>
            </View>
            <Button title="Solicitar Corrida" loading={loading} onPress={handleRequest} />
          </View>
        </>
      )}

      {/* Overlay: tracking */}
      {screen === 'tracking' && (
        <>
          <SafeAreaView edges={['top']} style={[styles.statusBar, { backgroundColor: info.color }]}>
            <Text style={styles.statusText}>{info.icon} {info.label}</Text>
          </SafeAreaView>

          <View style={styles.bottomSheet}>
            {ride?.driver && (
              <View style={styles.driverRow}>
                <View style={styles.driverAvatar}>
                  <Ionicons name="person" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{ride.driver.name}</Text>
                  {ride.driver.vehicle_model && (
                    <Text style={styles.driverVehicle}>
                      {ride.driver.vehicle_model} {ride.driver.vehicle_color} • {ride.driver.vehicle_plate}
                    </Text>
                  )}
                </View>
              </View>
            )}
            <View style={styles.routeCompact}>
              <Text style={styles.label}>{status === 'in_progress' ? 'Destino' : 'Origem'}</Text>
              <Text style={styles.value} numberOfLines={1}>{mapTarget?.label || '—'}</Text>
            </View>
            {canCancel && (
              <Button title="Cancelar Corrida" variant="danger" onPress={handleCancel} style={{ marginTop: 12 }} />
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Map loading fallback
  map: { flex: 1 },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  mapLoadingText: { color: COLORS.textMuted, fontSize: 14, marginTop: 12 },

  // Idle overlay
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.92)' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
  },
  brand: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 4 },
  greeting: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 10,
  },
  question: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  routeInputs: { flexDirection: 'row', marginBottom: 8 },
  routeDots: { alignItems: 'center', marginRight: 12, paddingTop: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLine: { width: 2, height: 24, backgroundColor: COLORS.border, marginVertical: 2 },
  inputsCol: { flex: 1 },

  // Tracking overlay
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 48, paddingBottom: 10, paddingHorizontal: 16, alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16, paddingBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  routeCompact: { marginBottom: 4 },
  label: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  driverAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  driverName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  driverVehicle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
