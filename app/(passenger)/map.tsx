import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, TextInput, Keyboard, ScrollView, KeyboardAvoidingView, Platform, Linking, Modal, Share, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';
import { Button } from '../../src/components/Button';
import { passengerApi } from '../../src/api/passenger.api';
import { authStore } from '../../src/auth/auth.store';
import { Ride, RideStatus } from '../../src/types/ride';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';
import { DrawerMenu, DrawerItem } from '../../src/components/DrawerMenu';

import { ENV } from '../../src/config/env';
import { apiClient } from '../../src/api/client';

const POLL_INTERVAL = 3000;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  requested:  { label: 'Buscando motorista...', color: COLORS.warning, icon: '🔍' },
  offered:    { label: 'Buscando motorista...', color: COLORS.warning, icon: '🔍' },
  accepted:   { label: 'Motorista a caminho',   color: COLORS.accent,  icon: '🚗' },
  arrived:    { label: 'Motorista chegou!',      color: COLORS.primary, icon: '📍' },
  in_progress:{ label: 'Corrida em andamento',   color: COLORS.success, icon: '🛣️' },
  completed:  { label: 'Corrida finalizada',     color: COLORS.success, icon: '✅' },
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
  const [showNoDriver, setShowNoDriver] = useState(false);

  // Price estimate
  const [estimate, setEstimate] = useState<{ price: number; distance_km: number } | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  // Accepted banner
  const [showAcceptedBanner, setShowAcceptedBanner] = useState(false);
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  // Completed modal
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedRide, setCompletedRide] = useState<Ride | null>(null);

  // Emergency
  const [showEmergency, setShowEmergency] = useState(false);

  // Search microcopy rotation
  const SEARCH_PHRASES = [
    'Procurando motoristas da sua região...',
    'Priorizando quem conhece seu bairro...',
    'Conectando você à comunidade...',
    'Quase lá...',
  ];
  const [searchPhraseIdx, setSearchPhraseIdx] = useState(0);

  // ETA helper
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userPhone, setUserPhone] = useState('');

  const drawerItems: DrawerItem[] = [
    { key: 'profile', label: 'Perfil', icon: 'person-outline', onPress: () => router.push('/(passenger)/profile') },
    { key: 'history', label: 'Histórico de corridas', icon: 'time-outline', onPress: () => router.push('/(passenger)/history') },
    { key: 'favorites', label: 'Favoritos', icon: 'heart-outline', onPress: () => router.push('/(passenger)/favorites') },
    { key: 'tourism', label: 'Turismo Premium', icon: 'diamond-outline', badge: '✦', onPress: () => router.push('/(passenger)/tourism') },
    { key: 'refer', label: 'Indique um motorista', icon: 'people-outline', onPress: () => router.push('/(passenger)/refer-driver') },
    { key: 'help', label: 'Ajuda', icon: 'help-circle-outline', onPress: () => router.push('/(passenger)/help') },
    { key: 'logout', label: 'Sair', icon: 'log-out-outline', danger: true, onPress: () => handleLogout() },
  ];

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
    if (user?.phone) setUserPhone(user.phone);
    acquireLocation();
    return () => stopAll();
  }, []);

  // Q2: Rotate search phrases while looking for driver
  useEffect(() => {
    const rideStatus = ride?.status as RideStatus | undefined;
    if (screen === 'tracking' && (rideStatus === 'requested' || rideStatus === 'offered')) {
      const id = setInterval(() => setSearchPhraseIdx(i => (i + 1) % SEARCH_PHRASES.length), 4000);
      return () => clearInterval(id);
    }
    setSearchPhraseIdx(0);
  }, [screen, ride?.status]);

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
        const url = `/api/geo-proxy/reverse?lat=${coords.lat}&lng=${coords.lng}`;
        const res = await apiClient.get(url);
        const data = res.data;
        if (data.status === 'OK' && data.results[0]) {
          const addr = data.results[0].formatted_address.split(',').slice(0, 2).join(',');
          setUserAddress(addr);
          setOrigin(prev => prev ? { ...prev, text: addr } : null);
        }
      } catch (e) {
        console.warn('[Map] reverse geocode failed, using default label:', e);
      }
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
        const loc = userLocation ? `&lat=${userLocation.lat}&lng=${userLocation.lng}` : '';
        const url = `/api/geo-proxy/autocomplete?input=${encodeURIComponent(input)}${loc}`;
        const res = await apiClient.get(url);
        const data = res.data;
        if (data.status === 'OK') setPredictions(data.predictions);
      } catch (e) {
        console.warn('[Map] autocomplete failed:', e);
        setPredictions([]);
      }
    }, 300);
  }, [userLocation]);

  const selectPlace = useCallback(async (p: Prediction) => {
    Keyboard.dismiss();
    try {
      const url = `/api/geo-proxy/place-details?place_id=${p.place_id}`;
      const res = await apiClient.get(url);
      const data = res.data;
      if (data.status === 'OK') {
        const loc = data.result.geometry.location;
        const place: Place = { text: p.description, lat: loc.lat, lng: loc.lng, placeId: p.place_id };
        if (searchingFor === 'origin') setOrigin(place);
        else setDestination(place);
      }
    } catch (e) {
      console.warn('[Map] selectPlace failed:', e);
      Alert.alert('Erro', friendlyError(e, 'Não foi possível selecionar o endereço. Tente novamente.'));
    }
    setScreen('idle');
  }, [searchingFor]);

  const useCurrentLocation = () => {
    if (userLocation) {
      setOrigin({ text: userAddress, lat: userLocation.lat, lng: userLocation.lng, placeId: 'current' });
    }
    setScreen('idle');
  };

  // --- Estimate ---
  useEffect(() => {
    if (!origin || !destination) { setEstimate(null); return; }
    setEstimateLoading(true);
    apiClient.post('/api/v2/rides/estimate', {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
    }).then(r => setEstimate(r.data?.data || null))
      .catch(() => {})
      .finally(() => setEstimateLoading(false));
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  // --- Ride ---
  const lastStatusRef = useRef('');

  const startPolling = (rideId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const updated = await passengerApi.getRide(rideId);
        setRide(updated);
        // Update driver location from polling
        if (updated.driver?.last_lat && updated.driver?.last_lng) {
          setDriverLocation({ lat: updated.driver.last_lat, lng: updated.driver.last_lng });
        }
        // Feedback tátil nas transições importantes
        if (updated.status !== lastStatusRef.current) {
          if (['accepted', 'arrived', 'in_progress'].includes(updated.status)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          if (updated.status === 'accepted') {
            setShowAcceptedBanner(true);
            Animated.sequence([
              Animated.timing(bannerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.delay(4000),
              Animated.timing(bannerOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]).start(() => setShowAcceptedBanner(false));
          }
          lastStatusRef.current = updated.status;
        }
        if (['completed', 'canceled_by_passenger', 'canceled_by_driver', 'no_driver'].includes(updated.status)) {
          stopAll();
          if (updated.status === 'completed') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCompletedRide(updated);
            setShowCompleted(true);
          } else if (updated.status === 'no_driver') {
            setShowNoDriver(true);
          }
        }
      } catch (e) {
        console.warn('[Map] ride polling failed:', e);
      }
    }, POLL_INTERVAL);
  };

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  const stopAll = () => { stopPolling(); setDriverLocation(null); };
  const resetToIdle = () => { stopAll(); setRide(null); setScreen('idle'); setDestination(null); setEstimate(null); };
  const handleRetry = () => { stopPolling(); setRide(null); setScreen('idle'); };

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

  const canCancel = rideStatus && ['requested', 'offered', 'accepted', 'arrived'].includes(rideStatus);
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
              <TouchableOpacity onPress={() => setDrawerOpen(true)} style={s.menuBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="menu" size={26} color={COLORS.textDark} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.brand}>KAVIAR</Text>
                <Text style={s.greeting}>{userName ? `Olá, ${userName}` : 'Passageiro'}</Text>
              </View>
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

            {estimate && (
              <View style={s.estimateRow}>
                <Text style={s.estimateText}>~{estimate.distance_km.toFixed(1)} km</Text>
                <Text style={s.estimatePrice}>Estimativa R$ {estimate.price.toFixed(2)}</Text>
              </View>
            )}
            {estimateLoading && !estimate && destination && (
              <Text style={s.estimateLoading}>Calculando estimativa...</Text>
            )}
            <Button title="Pedir Kaviar" loading={loading} onPress={handleRequest} style={{ marginTop: 14 }} />
          </View>
        </>
      )}

      {/* TRACKING overlay */}
      {screen === 'tracking' && (
        <>
          <SafeAreaView edges={['top']} style={[s.statusBar, { backgroundColor: info.color }]}>
            <Text style={s.statusText}>
              {rideStatus === 'requested' || rideStatus === 'offered'
                ? `🔍 ${SEARCH_PHRASES[searchPhraseIdx]}`
                : rideStatus === 'arrived' && ride?.driver
                  ? `📍 Seu motorista chegou! Procure o ${ride.driver.vehicle_model || 'veículo'} ${ride.driver.vehicle_color || ''}`
                  : `${info.icon} ${info.label}`}
            </Text>
          </SafeAreaView>

          <View style={s.bottomSheet}>
            {ride?.driver && (
              <View style={s.driverCard}>
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
                <View style={s.safetyTip}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.accent} />
                  <Text style={s.safetyTipText}>Confira a placa e a cor do veículo antes de entrar. Em caso de emergência, use o botão abaixo.</Text>
                </View>
              </View>
            )}
            {/* Q3: ETA do motorista */}
            {rideStatus === 'accepted' && driverLocation && ride && (
              <View style={s.etaRow}>
                <Ionicons name="time-outline" size={15} color={COLORS.accent} />
                <Text style={s.etaText}>
                  {(() => {
                    const km = haversineKm(driverLocation.lat, driverLocation.lng, Number(ride.origin_lat), Number(ride.origin_lng));
                    const min = Math.max(1, Math.round(km / 30 * 60));
                    return min <= 1 ? 'Chegando!' : `~${min} min para chegar`;
                  })()}
                </Text>
              </View>
            )}
            <View style={s.routeCompact}>
              <Text style={s.label}>{rideStatus === 'in_progress' ? 'Destino' : 'Origem'}</Text>
              <Text style={s.value} numberOfLines={1}>{mapTarget?.label || '—'}</Text>
            </View>
            {canCancel && (
              <Button title="Cancelar Corrida" variant="danger" onPress={handleCancel} style={{ marginTop: 12 }} />
            )}
            {(rideStatus === 'accepted' || rideStatus === 'arrived' || rideStatus === 'in_progress') && (
              <TouchableOpacity style={s.emergencyBtn} onPress={() => setShowEmergency(true)}>
                <Ionicons name="shield-outline" size={16} color={COLORS.danger} />
                <Text style={s.emergencyBtnText}>Emergência</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* ACCEPTED BANNER */}
      {showAcceptedBanner && ride?.driver && (
        <Animated.View style={[s.acceptedBanner, { opacity: bannerOpacity }]}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.acceptedBannerTitle}>{ride.driver.name} está a caminho!</Text>
            {ride.driver.vehicle_model && (
              <Text style={s.acceptedBannerSub}>{ride.driver.vehicle_model} {ride.driver.vehicle_color} • {ride.driver.vehicle_plate}</Text>
            )}
          </View>
        </Animated.View>
      )}

      {/* COMPLETED MODAL */}
      <Modal visible={showCompleted} transparent animationType="fade" onRequestClose={() => { setShowCompleted(false); resetToIdle(); }}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>✅</Text>
            <Text style={s.modalTitle}>Corrida finalizada!</Text>
            {completedRide?.driver?.name && (
              <Text style={s.modalBody}>Motorista: {completedRide.driver.name}</Text>
            )}
            {completedRide?.final_price != null && (
              <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 8 }}>
                R$ {Number(completedRide.final_price).toFixed(2)}
              </Text>
            )}
            <Text style={s.communityMsg}>Sua corrida fortalece a mobilidade da sua comunidade 🏘️</Text>
            <TouchableOpacity style={s.ctaPrimary} onPress={() => {
              setShowCompleted(false);
              router.push({ pathname: '/(passenger)/rating', params: { rideId: completedRide?.id || '', driverName: completedRide?.driver?.name || '', driverId: completedRide?.driver?.id || completedRide?.driver_id || '' } });
            }}>
              <Text style={s.ctaPrimaryText}>Avaliar motorista</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ctaLink, { alignSelf: 'center', marginTop: 12 }]} onPress={() => {
              setShowCompleted(false);
              resetToIdle();
              const driverName = completedRide?.driver?.name || 'não informado';
              const rideTime = completedRide?.requested_at ? new Date(completedRide.requested_at).toLocaleString('pt-BR') : 'não informado';
              const msg = `📦 Esqueci um objeto no carro\n\nMotorista: ${driverName}\nHorário: ${rideTime}\nCorrida: ${completedRide?.id || 'N/A'}`;
              Linking.openURL(`https://wa.me/5521968648777?text=${encodeURIComponent(msg)}`);
            }}>
              <Ionicons name="bag-outline" size={14} color={COLORS.textSecondary} />
              <Text style={[s.ctaLinkText, { marginLeft: 4 }]}>Esqueci um objeto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ctaLink, { alignSelf: 'center', marginTop: 8 }]} onPress={() => { setShowCompleted(false); resetToIdle(); }}>
              <Text style={s.ctaLinkText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EMERGENCY MODAL */}
      <Modal visible={showEmergency} transparent animationType="fade" onRequestClose={() => setShowEmergency(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Ionicons name="shield-checkmark" size={36} color={COLORS.danger} style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={[s.modalTitle, { textAlign: 'center' }]}>Ajuda urgente</Text>
            <Text style={[s.modalBody, { textAlign: 'center', marginBottom: 18, fontSize: 13 }]}>Em situação de risco imediato, ligue para a emergência pública.</Text>

            <TouchableOpacity style={[s.ctaPrimary, { backgroundColor: COLORS.danger }]} onPress={() => { setShowEmergency(false); Linking.openURL('tel:190'); }}>
              <Text style={s.ctaPrimaryText}>Ligar 190 — Polícia</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ctaPrimary, { backgroundColor: '#E67E22', marginTop: 8 }]} onPress={() => { setShowEmergency(false); Linking.openURL('tel:192'); }}>
              <Text style={s.ctaPrimaryText}>Ligar 192 — SAMU</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.ctaPrimary, { backgroundColor: '#2E86C1', marginTop: 8 }]} onPress={() => {
              setShowEmergency(false);
              const loc = userLocation ? `https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}` : '';
              const driverInfo = ride?.driver ? `Motorista: ${ride.driver.name} • ${ride.driver.vehicle_model || ''} ${ride.driver.vehicle_color || ''} • Placa: ${ride.driver.vehicle_plate || ''}` : '';
              Share.share({ message: `🚨 Preciso de ajuda!\n${driverInfo}\n${loc ? `Minha localização: ${loc}` : ''}`.trim() });
            }}>
              <Text style={s.ctaPrimaryText}>Contato de confiança</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.emergencySecondary} onPress={() => {
              setShowEmergency(false);
              const loc = userLocation ? `${userLocation.lat},${userLocation.lng}` : 'indisponível';
              const driverInfo = ride?.driver ? `Motorista: ${ride.driver.name}, Placa: ${ride.driver.vehicle_plate || 'N/A'}` : '';
              const msg = `⚠️ Registro de emergência\nPassageiro: ${userName || 'N/A'}\nCorrida: ${ride?.id || 'N/A'}\n${driverInfo}\nLocalização: ${loc}`;
              Linking.openURL(`https://wa.me/5521968648777?text=${encodeURIComponent(msg)}`);
            }}>
              <Ionicons name="document-text-outline" size={15} color={COLORS.textSecondary} />
              <Text style={s.emergencySecondaryText}>Registrar com a Kaviar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.ctaLink, { alignSelf: 'center', marginTop: 12 }]} onPress={() => setShowEmergency(false)}>
              <Text style={s.ctaLinkText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NO DRIVER MODAL */}
      <Modal visible={showNoDriver} transparent animationType="fade" onRequestClose={() => { setShowNoDriver(false); resetToIdle(); }}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalIcon}>🔍</Text>
            <Text style={s.modalTitle}>Ainda não encontramos um motorista disponível no momento.</Text>
            <Text style={s.modalBody}>
              Estamos expandindo nossa rede de motoristas na sua região. Seja um Consultor Kaviar e tenha uma renda extra indicando novos motoristas.
            </Text>

            {/* Primary CTAs */}
            <TouchableOpacity style={s.ctaPrimary} onPress={() => { setShowNoDriver(false); handleRetry(); }}>
              <Text style={s.ctaPrimaryText}>Tentar novamente</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ctaSecondaryHighlight} onPress={() => Linking.openURL('https://kaviar.com.br/#consultor')}>
              <Text style={s.ctaSecondaryHighlightText}>Quero ser consultor</Text>
            </TouchableOpacity>

            {/* Secondary CTAs */}
            <View style={s.ctaRow}>
              <TouchableOpacity style={s.ctaLink} onPress={() => Linking.openURL('https://kaviar.com.br/#saiba-mais')}>
                <Text style={s.ctaLinkText}>Saber mais</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ctaLink} onPress={() => { setShowNoDriver(false); resetToIdle(); }}>
                <Text style={s.ctaLinkText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Drawer */}
      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userName={userName}
        userPhone={userPhone}
        items={drawerItems}
      />
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  menuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
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
    padding: 16, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  routeCompact: { marginBottom: 4 },
  label: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  driverCard: { backgroundColor: COLORS.surfaceLight, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  safetyTip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  safetyTipText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 4 },
  etaText: { fontSize: 14, fontWeight: '600', color: COLORS.accent },
  communityMsg: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  estimateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surfaceLight, borderRadius: 10, padding: 12, marginTop: 12, borderWidth: 1, borderColor: COLORS.border },
  estimateText: { fontSize: 13, color: COLORS.textSecondary },
  estimatePrice: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  estimateLoading: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 12 },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  driverName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  driverVehicle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  // No driver modal
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  modalIcon: { fontSize: 40, marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 24, marginBottom: 12 },
  modalBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  ctaPrimary: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  ctaPrimaryText: { color: COLORS.textDark, fontSize: 16, fontWeight: '800' },
  ctaSecondaryHighlight: { backgroundColor: 'transparent', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.primary, paddingVertical: 12, width: '100%', alignItems: 'center', marginBottom: 16 },
  ctaSecondaryHighlightText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  ctaRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  ctaLink: { paddingVertical: 8, paddingHorizontal: 12 },
  ctaLinkText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  emergencyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, marginBottom: 12, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.danger },
  emergencyBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  emergencySecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  emergencySecondaryText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },

  // Accepted banner
  acceptedBanner: {
    position: 'absolute', top: 100, left: 20, right: 20, zIndex: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.success, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 10,
  },
  acceptedBannerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  acceptedBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});
