import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
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

const LOCATION_INTERVAL = 5000; // 5s

export default function CompleteRide() {
  const router = useRouter();
  const params = useLocalSearchParams<{ rideId: string; status?: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [rideStatus, setRideStatus] = useState<RideStatus>((params.status as RideStatus) || 'accepted');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    loadRide();
    startLocationTracking();
    return () => { locationSubRef.current?.remove(); };
  }, []);

  const loadRide = async () => {
    try {
      const current = await driverApi.getCurrentRide();
      if (current) {
        setRide(current);
        setRideStatus(current.status as RideStatus);
      }
    } catch (e: any) {
      if (e.response?.status !== 401) {
        Alert.alert('Erro', 'Não foi possível carregar a corrida.');
      }
    } finally { setFetching(false); }
  };

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    locationSubRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 20, timeInterval: LOCATION_INTERVAL },
      (loc) => {
        const { latitude: lat, longitude: lng } = loc.coords;
        setDriverLocation({ lat, lng });
        if (params.rideId) {
          driverApi.sendRideLocation(params.rideId, lat, lng).catch(() => {});
        }
      }
    );
  };

  // Target: passenger origin when going to pickup, destination when in_progress
  const getTarget = (): { lat: number; lng: number; label: string } | null => {
    if (!ride) return null;
    if (rideStatus === 'in_progress') {
      return { lat: ride.dest_lat, lng: ride.dest_lng, label: ride.destination_text || 'Destino' };
    }
    return { lat: ride.origin_lat, lng: ride.origin_lng, label: ride.origin_text || 'Passageiro' };
  };

  const openNavigation = () => {
    const target = getTarget();
    if (!target) return;
    const url = Platform.select({
      android: `google.navigation:q=${target.lat},${target.lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`);
    });
  };

  const fitMarkers = () => {
    const target = getTarget();
    if (!target || !driverLocation || !mapRef.current) return;
    mapRef.current.fitToCoordinates(
      [{ latitude: driverLocation.lat, longitude: driverLocation.lng }, { latitude: target.lat, longitude: target.lng }],
      { edgePadding: { top: 80, right: 80, bottom: 200, left: 80 }, animated: true }
    );
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
      const result = await driverApi.completeRide(params.rideId!);
      const credit = result?.credit;
      const creditMsg = credit
        ? `\n${credit.cost} crédito${credit.cost > 1 ? 's' : ''} consumido${credit.cost > 1 ? 's' : ''} (corrida ${credit.matchType === 'LOCAL' ? 'local' : 'externa'})`
        : '';
      Alert.alert('Corrida finalizada!', `Obrigado pela viagem.${creditMsg}`, [
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
  const target = getTarget();

  const initialRegion: Region | undefined = target ? {
    latitude: target.lat,
    longitude: target.lng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : undefined;

  return (
    <View style={styles.container}>
      {/* Status bar */}
      <View style={[styles.statusBar, { backgroundColor: info.color }]}>
        <Text style={styles.statusText}>{info.icon} {info.label}</Text>
      </View>

      {/* Map */}
      {initialRegion ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          onMapReady={fitMarkers}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {/* Passenger/destination pin */}
          {target && (
            <Marker
              coordinate={{ latitude: target.lat, longitude: target.lng }}
              title={rideStatus === 'in_progress' ? 'Destino' : 'Passageiro'}
              description={target.label}
              pinColor={rideStatus === 'in_progress' ? COLORS.success : COLORS.primary}
            />
          )}
          {/* Driver pin */}
          {driverLocation && (
            <Marker
              coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
              title="Você"
              pinColor={COLORS.warning}
            />
          )}
        </MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>Carregando mapa...</Text>
        </View>
      )}

      {/* Info + actions */}
      <View style={styles.bottomSheet}>
        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>{rideStatus === 'in_progress' ? 'Destino' : 'Origem'}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{target?.label || '—'}</Text>
          </View>
          {ride?.passenger?.name && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Passageiro</Text>
              <Text style={styles.infoValue}>{ride.passenger.name}</Text>
            </View>
          )}
        </View>

        <Button
          title="📍 Abrir Navegação"
          onPress={openNavigation}
          style={{ backgroundColor: '#1a73e8', marginBottom: 8 }}
        />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  statusBar: { paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapPlaceholderText: { color: COLORS.textMuted, fontSize: 16 },
  bottomSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  infoRow: { flexDirection: 'row', marginBottom: 12, gap: 12 },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
});
