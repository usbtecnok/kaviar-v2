import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, TextInput, Keyboard, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';
import { Button } from '../../src/components/Button';
import { passengerApi } from '../../src/api/passenger.api';
import { authStore } from '../../src/auth/auth.store';
import { Ride, RideStatus } from '../../src/types/ride';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

const POLL_INTERVAL = 3000;
const PLACES_KEY = 'AIzaSyA50GYLlH7L5Iq5HpJ1MAALYOXN4PYlswc';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  requested:  { label: 'Buscando motorista...', color: COLORS.warning, icon: '🔍' },
  offered:    { label: 'Buscando motorista...', color: COLORS.warning, icon: '🔍' },
  accepted:   { label: 'Motorista a caminho',   color: COLORS.accent,  icon: '🚗' },
  arrived:    { label: 'Motorista chegou!',      color: COLORS.primary, icon: '📍' },
  in_progress:{ label: 'Corrida em andamento',   color: COLORS.success, icon: '🛣️' },
};

interface Place { text: string; lat: number; lng: number; placeId: string }
interface Prediction { place_id: string; description: string }

type Screen = 'idle' | 'search' | 'tracking';

export default function PassengerMap() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('idle');
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [ride, setRide] = useState<Ride | null>(null);
  const [userName, setUserName] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userAddress, setUserAddress] = useState('Minha localização');
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Search state
  const [searchText, setSearchText] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searchingFor, setSearchingFor] = useState<'origin' | 'destination'>('destination');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<MapView>(null);
  const searchRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const user = authStore.getUser();
    if (user?.name) setUserName(user.name);
    acquireLocation();
    return () => stopAll();
  }, []);

  const acquireLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Localização necessária', 'Ative a localização para solicitar corridas.'); return; }
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(coords);
      // Set origin to current location by default
      setOrigin({ text: 'Minha localização', lat: coords.lat, lng: coords.lng, placeId: 'current' });
      // Reverse geocode for display
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${PLACES_KEY}&language=pt-BR`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK' && data.results[0]) {
          const addr = data.results[0].formatted_address.split(',').slice(0, 2).join(',');
          setUserAddress(addr);
          setOrigin(prev => prev ? { ...prev, text: addr } : null);
        }
      } catch {}
    } catch { Alert.alert('Erro de GPS', 'Não foi possível obter sua localização.'); }
  };

  // --- Search ---
  const openSearch = (target: 'origin' | 'destination') => {
    setSearchingFor(target);
    setSearchText('');
    setPredictions([]);
    setScreen('search');
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const searchPlaces = useCallback((input: string) => {
    setSearchText(input);
    if (input.length < 3) { setPredictions([]); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const loc = userLocation ? `&location=${userLocation.lat},${userLocation.lng}&radius=30000` : '';
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${PLACES_KEY}&components=country:br&language=pt-BR${loc}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK') setPredictions(data.predictions);
      } catch {}
    }, 300);
  }, [userLocation]);

  const selectPlace = useCallback(async (p: Prediction) => {
    Keyboard.dismiss();
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=geometry&key=${PLACES_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK') {
        const loc = data.result.geometry.location;
        const place: Place = { text: p.description, lat: loc.lat, lng: loc.lng, placeId: p.place_id };
        if (searchingFor === 'origin') setOrigin(place);
        else setDestination(place);
      }
    } catch {}
    setScreen('idle');
  }, [searchingFor]);

  const useCurrentLocation = () => {
    if (userLocation) {
      setOrigin({ text: userAddress, lat: userLocation.lat, lng: userLocation.lng, placeId: 'current' });
    }
    setScreen('idle');
  };

  // --- Ride ---
  const startPolling = (rideId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const updated = await passengerApi.getRide(rideId);
        setRide(updated);
        // Update driver location from polling
        if (updated.driver?.last_lat && updated.driver?.last_lng) {
          setDriverLocation({ lat: updated.driver.last_lat, lng: updated.driver.last_lng });
        }
        if (['completed', 'canceled_by_passenger', 'canceled_by_driver', 'no_driver'].includes(updated.status)) {
          stopAll();
          if (updated.status === 'completed') {
            Alert.alert('Corrida Finalizada!', 'Obrigado por usar o Kaviar.', [
              { text: 'Avaliar', onPress: () => router.push({ pathname: '/(passenger)/rating', params: { rideId: updated.id, driverName: updated.driver?.name || '', driverId: updated.driver?.id || updated.driver_id || '' } }) },
              { text: 'Fechar', onPress: resetToIdle },
            ]);
          } else if (updated.status === 'no_driver') {
            Alert.alert(
              'Ainda não encontramos um motorista',
              'Estamos procurando por motoristas próximos, mas no momento ninguém está disponível na sua região. Conhece alguém que dirige por aí? Toque em "Indicar motorista".',
              [
                { text: 'Tentar novamente', onPress: () => handleRetry() },
                { text: 'Indicar motorista', onPress: () => Linking.openURL('https://kaviar.com.br/#motoristas') },
                { text: 'Fechar', style: 'cancel', onPress: resetToIdle },
              ],
            );
          }
        }
      } catch {}
    }, POLL_INTERVAL);
  };

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  const stopAll = () => { stopPolling(); setDriverLocation(null); };
  const resetToIdle = () => { stopAll(); setRide(null); setScreen('idle'); setDestination(null); };
  const handleRetry = () => { stopPolling(); setRide(null); setScreen('idle'); setTimeout(() => handleRequest(), 100); };

  const handleRequest = async () => {
    if (!origin) { Alert.alert('Origem indisponível', 'Aguarde o GPS ou selecione um endereço.'); return; }
    if (!destination) { Alert.alert('Selecione o destino', 'Para onde você vai?'); return; }
    setLoading(true);
    try {
      const result = await passengerApi.requestRide({
        origin: { lat: origin.lat, lng: origin.lng, text: origin.text },
        destination: { lat: destination.lat, lng: destination.lng, text: destination.text },
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
  const rideStatus = ride?.status as RideStatus | undefined;
  const mapTarget = ride ? (
    rideStatus === 'in_progress'
      ? { lat: Number(ride.dest_lat), lng: Number(ride.dest_lng), label: ride.destination_text || 'Destino' }
      : { lat: Number(ride.origin_lat), lng: Number(ride.origin_lng), label: ride.origin_text || 'Origem' }
  ) : null;

  const regionCenter = mapTarget || (destination ? { lat: destination.lat, lng: destination.lng } : null) || userLocation;
  const region: Region | undefined = regionCenter ? {
    latitude: regionCenter.lat, longitude: regionCenter.lng,
    latitudeDelta: 0.015, longitudeDelta: 0.015,
  } : undefined;

  useEffect(() => {
    if (driverLocation && mapTarget && mapRef.current) {
      mapRef.current.fitToCoordinates(
        [{ latitude: driverLocation.lat, longitude: driverLocation.lng }, { latitude: mapTarget.lat, longitude: mapTarget.lng }],
        { edgePadding: { top: 80, right: 80, bottom: 260, left: 80 }, animated: true }
      );
    }
  }, [driverLocation]);

  useEffect(() => {
    if (origin && destination && mapRef.current && screen === 'idle') {
      mapRef.current.fitToCoordinates(
        [{ latitude: origin.lat, longitude: origin.lng }, { latitude: destination.lat, longitude: destination.lng }],
        { edgePadding: { top: 120, right: 60, bottom: 280, left: 60 }, animated: true }
      );
    }
  }, [origin, destination]);

  const canCancel = rideStatus && ['requested', 'offered'].includes(rideStatus);
  const info = rideStatus ? STATUS_CONFIG[rideStatus] || STATUS_CONFIG.requested : STATUS_CONFIG.requested;

  // === SEARCH SCREEN ===
  if (screen === 'search') {
    return (
      <SafeAreaView style={s.searchContainer}>
        {/* Header */}
        <View style={s.searchHeader}>
          <TouchableOpacity onPress={() => setScreen('idle')} style={s.searchBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={s.searchTitle}>{searchingFor === 'destination' ? 'Para onde?' : 'Ponto de embarque'}</Text>
        </View>

        {/* Input */}
        <View style={s.searchInputWrap}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            ref={searchRef}
            style={s.searchInput}
            placeholder="Digite o endereço..."
            placeholderTextColor={COLORS.textMuted}
            value={searchText}
            onChangeText={searchPlaces}
            autoFocus
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchText(''); setPredictions([]); }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Current location option (only for origin) */}
        {searchingFor === 'origin' && userLocation && (
          <TouchableOpacity style={s.searchItem} onPress={useCurrentLocation}>
            <Ionicons name="navigate" size={20} color={COLORS.primary} style={s.searchItemIcon} />
            <View style={{ flex: 1 }}>
              <Text style={s.searchItemTitle}>Minha localização atual</Text>
              <Text style={s.searchItemSub} numberOfLines={1}>{userAddress}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Results */}
        <ScrollView style={s.searchResults} keyboardShouldPersistTaps="handled">
          {predictions.map((p) => (
            <TouchableOpacity key={p.place_id} style={s.searchItem} onPress={() => selectPlace(p)}>
              <Ionicons name="location-outline" size={20} color={COLORS.textMuted} style={s.searchItemIcon} />
              <Text style={s.searchItemTitle} numberOfLines={2}>{p.description}</Text>
            </TouchableOpacity>
          ))}
          {searchText.length >= 3 && predictions.length === 0 && (
            <Text style={s.searchEmpty}>Nenhum resultado encontrado</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // === MAP + IDLE/TRACKING ===
  return (
    <View style={s.container}>
      {/* Map */}
      {region ? (
        <MapView ref={mapRef} style={s.map} initialRegion={region} showsUserLocation showsMyLocationButton={false}>
          {screen === 'idle' && origin && origin.placeId !== 'current' && (
            <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} title="Origem" pinColor={COLORS.success} />
          )}
          {screen === 'idle' && destination && (
            <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title="Destino" description={destination.text} pinColor={COLORS.danger} />
          )}
          {screen === 'tracking' && mapTarget && (
            <Marker coordinate={{ latitude: mapTarget.lat, longitude: mapTarget.lng }}
              title={rideStatus === 'in_progress' ? 'Destino' : 'Embarque'} description={mapTarget.label}
              pinColor={rideStatus === 'in_progress' ? COLORS.success : COLORS.primary} />
          )}
          {driverLocation && (
            <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }} title="Motorista" pinColor={COLORS.warning} />
          )}
        </MapView>
      ) : (
        <View style={s.mapLoading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.mapLoadingText}>Obtendo localização...</Text>
        </View>
      )}

      {/* IDLE overlay */}
      {screen === 'idle' && (
        <>
          <SafeAreaView edges={['top']} style={s.topBar}>
            <View style={s.header}>
              <View>
                <Text style={s.brand}>KAVIAR</Text>
                <Text style={s.greeting}>{userName ? `Olá, ${userName}` : 'Passageiro'}</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="log-out-outline" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <View style={s.bottomCard}>
            <Text style={s.question}>Para onde você vai?</Text>

            {/* Origin row — tap to change */}
            <TouchableOpacity style={s.addressRow} onPress={() => openSearch('origin')}>
              <View style={[s.dot, { backgroundColor: COLORS.success }]} />
              <View style={s.addressInfo}>
                <Text style={s.addressLabel}>EMBARQUE</Text>
                <Text style={s.addressText} numberOfLines={1}>{origin?.text || 'Obtendo localização...'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* Destination row — tap to search */}
            <TouchableOpacity style={[s.addressRow, s.addressRowLast]} onPress={() => openSearch('destination')}>
              <View style={[s.dot, { backgroundColor: COLORS.danger }]} />
              <View style={s.addressInfo}>
                <Text style={s.addressLabel}>DESTINO</Text>
                <Text style={[s.addressText, !destination && s.addressPlaceholder]} numberOfLines={1}>
                  {destination?.text || 'Toque para buscar endereço'}
                </Text>
              </View>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <Button title="Solicitar Corrida" loading={loading} onPress={handleRequest} style={{ marginTop: 14 }} />
          </View>
        </>
      )}

      {/* TRACKING overlay */}
      {screen === 'tracking' && (
        <>
          <SafeAreaView edges={['top']} style={[s.statusBar, { backgroundColor: info.color }]}>
            <Text style={s.statusText}>{info.icon} {info.label}</Text>
          </SafeAreaView>

          <View style={s.bottomSheet}>
            {ride?.driver && (
              <View style={s.driverRow}>
                <View style={s.driverAvatar}>
                  <Ionicons name="person" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.driverName}>{ride.driver.name}</Text>
                  {ride.driver.vehicle_model && (
                    <Text style={s.driverVehicle}>
                      {ride.driver.vehicle_model} {ride.driver.vehicle_color} • {ride.driver.vehicle_plate}
                    </Text>
                  )}
                </View>
              </View>
            )}
            <View style={s.routeCompact}>
              <Text style={s.label}>{rideStatus === 'in_progress' ? 'Destino' : 'Origem'}</Text>
              <Text style={s.value} numberOfLines={1}>{mapTarget?.label || '—'}</Text>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { flex: 1 },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  mapLoadingText: { color: COLORS.textMuted, fontSize: 14, marginTop: 12 },

  // Top bar
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.92)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  brand: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 4 },
  greeting: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  // Bottom card (idle)
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 10,
  },
  question: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },

  // Address rows
  addressRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  addressRowLast: { borderBottomWidth: 0 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 2 },
  addressText: { fontSize: 15, color: COLORS.textPrimary },
  addressPlaceholder: { color: COLORS.textMuted },

  // Search screen
  searchContainer: { flex: 1, backgroundColor: COLORS.surface },
  searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  searchBack: { marginRight: 12, padding: 4 },
  searchTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.surfaceLight, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 16, color: COLORS.textPrimary },
  searchResults: { flex: 1 },
  searchItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchItemIcon: { marginRight: 14 },
  searchItemTitle: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  searchItemSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  searchEmpty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40, fontSize: 15 },

  // Tracking
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
  driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  driverName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  driverVehicle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
