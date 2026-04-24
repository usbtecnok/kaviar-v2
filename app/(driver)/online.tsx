import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';
import { apiClient } from '../../src/api/client';
import { authStore } from '../../src/auth/auth.store';
import { RideOffer } from '../../src/types/ride';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';
import { DrawerMenu, DrawerItem } from '../../src/components/DrawerMenu';
import { groupLabel } from '../../src/utils/tripLabel';
import { startBackgroundLocation, stopBackgroundLocation } from '../../src/services/background-location';
import { ENV } from '../../src/config/env';

const POLL_INTERVAL = 5000;
const LOCATION_INTERVAL = 15000;

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function DriverOnline() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [pendingOffer, setPendingOffer] = useState<RideOffer | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [todayRides, setTodayRides] = useState(0);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [locationPermission, setLocationPermission] = useState(true);
  const [backgroundDenied, setBackgroundDenied] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [offerCountdown, setOfferCountdown] = useState('');
  const [soundMuted, setSoundMuted] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const locationRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pendingOfferRef = useRef<RideOffer | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userPhone, setUserPhone] = useState('');

  const drawerItems: DrawerItem[] = [
    { key: 'profile', label: 'Perfil', icon: 'person-outline', onPress: () => router.push('/(driver)/profile') },
    { key: 'summary', label: 'Resumo', icon: 'stats-chart-outline', onPress: () => router.push('/(driver)/summary') },
    { key: 'history', label: 'Histórico de corridas', icon: 'time-outline', onPress: () => router.push('/(driver)/history') },
    { key: 'credits', label: 'Créditos', icon: 'wallet-outline', onPress: () => router.push('/(driver)/credits') },
    { key: 'documents', label: 'Documentos', icon: 'document-text-outline', onPress: () => router.push('/(driver)/documents') },
    { key: 'refer', label: 'Indique um motorista', icon: 'people-outline', onPress: () => router.push('/(driver)/refer-driver') },
    { key: 'help', label: 'Ajuda', icon: 'help-circle-outline', onPress: () => router.push('/(driver)/help') },
    { key: 'logout', label: 'Sair', icon: 'log-out-outline', danger: true, onPress: () => handleLogout() },
  ];

  const stopSound = async () => {
    try {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
    } catch {}
    soundRef.current = null;
  };

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
    loadUser();
    checkCurrentRide();
    loadDashboard();
    checkGps();
    checkLocationPermission();
    return () => { stopAll(); stopSound(); driverApi.setAvailability('offline').catch(() => {}); };
  }, []);

  useFocusEffect(useCallback(() => {
    loadDashboard();
    checkGps();
    checkLocationPermission();
  }, []));

  useEffect(() => {
    if (isOnline && !pendingOffer) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline, pendingOffer]);

  // Offer expiration countdown
  useEffect(() => {
    if (!pendingOffer?.expires_at) { setOfferCountdown(''); return; }
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(pendingOffer.expires_at).getTime() - Date.now()) / 1000));
      setOfferCountdown(`${left}s`);
      if (left === 0) { setPendingOffer(null); pendingOfferRef.current = null; stopSound(); setSoundMuted(false); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pendingOffer]);

  const loadUser = () => {
    const user = authStore.getUser();
    if (user?.name) setUserName(user.name);
    if (user?.phone) setUserPhone(user.phone);
  };

  const checkGps = async () => {
    try { setGpsEnabled(await Location.hasServicesEnabledAsync()); } catch {
      setGpsEnabled(false);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch {
      setLocationPermission(false);
    }
  };

  const loadDashboard = async () => {
    try {
      const [credRes, histRes] = await Promise.allSettled([
        driverApi.getCredits(),
        apiClient.get('/api/v2/rides/history'),
      ]);
      if (credRes.status === 'fulfilled') setCreditBalance(credRes.value.balance);
      if (histRes.status === 'fulfilled') {
        const rides = histRes.value.data?.rides || histRes.value.data || [];
        const todayStr = new Date().toISOString().slice(0, 10);
        setTodayRides(rides.filter((r: any) => r.status === 'completed' && r.requested_at?.slice(0, 10) === todayStr).length);
      }
    } catch (e) {
      console.warn('[Driver] loadDashboard failed:', e);
    }
  };

  const checkCurrentRide = async () => {
    try {
      const ride = await driverApi.getCurrentRide();
      if (ride) {
        router.replace(`/(driver)/complete-ride?rideId=${ride.id}&status=${ride.status}`);
      }
    } catch (e) {
      console.warn('[Driver] checkCurrentRide failed:', e);
    }
  };

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const offers = await driverApi.getOffers();
        if (offers.length > 0 && !pendingOfferRef.current) {
          pendingOfferRef.current = offers[0];
          setPendingOffer(offers[0]);
          setSoundMuted(false);
          try {
            await stopSound();
            const { sound } = await Audio.Sound.createAsync(
              require('../../assets/sounds/new-ride.wav')
            );
            soundRef.current = sound;
            await sound.playAsync();
          } catch {}
        }
      } catch (e) {
        console.warn('[Driver] offer polling failed:', e);
      }
    }, POLL_INTERVAL);
  };

  const startLocationTracking = async (): Promise<void> => {
    try {
      const mode = await startBackgroundLocation(ENV.API_URL);
      setLocationPermission(true);
      if (mode === 'foreground') {
        // Background denied — fallback to foreground polling
        setBackgroundDenied(true);
        const send = async () => {
          try {
            const loc = await Location.getCurrentPositionAsync({});
            setCurrentCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            await driverApi.sendLocation(loc.coords.latitude, loc.coords.longitude);
          } catch (e) {
            console.warn('[Driver] sendLocation failed:', e);
          }
        };
        await send();
        locationRef.current = setInterval(send, LOCATION_INTERVAL);
      } else {
        setBackgroundDenied(false);
        // Get initial coords for UI
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setCurrentCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch {}
      }
    } catch (e: any) {
      if (e.message === 'FOREGROUND_DENIED') {
        setLocationPermission(false);
        Alert.alert('Erro', 'Permissão de localização negada');
      } else {
        console.warn('[Driver] startLocationTracking error:', e);
      }
    }
  };

  const stopAll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (locationRef.current) clearInterval(locationRef.current);
    pollRef.current = null;
    locationRef.current = null;
    stopBackgroundLocation().catch(() => {});
  };

  const handleGoOnline = async () => {
    setLoading(true);
    try {
      await driverApi.setAvailability('online');
      setIsOnline(true);
      await startLocationTracking();
      startPolling();
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Erro ao ficar online'));
    } finally { setLoading(false); }
  };

  const handleGoOffline = async () => {
    setLoading(true);
    try {
      stopAll();
      await stopSound();
      await driverApi.setAvailability('offline');
      setIsOnline(false);
      setPendingOffer(null);
      pendingOfferRef.current = null;
      setSoundMuted(false);
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Erro ao ficar offline'));
    } finally { setLoading(false); }
  };

  const handleAcceptOffer = async () => {
    if (!pendingOffer) return;
    await stopSound();
    pendingOfferRef.current = null;
    router.push(`/(driver)/accept-ride?offerId=${pendingOffer.id}&rideId=${pendingOffer.ride.id}`);
  };

  const handleRejectOffer = async () => {
    if (!pendingOffer) return;
    try {
      await stopSound();
      await driverApi.rejectOffer(pendingOffer.id);
      setPendingOffer(null);
      pendingOfferRef.current = null;
      setSoundMuted(false);
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Não foi possível recusar a oferta'));
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => {
        stopAll();
        await driverApi.setAvailability('offline').catch(() => {});
        await authStore.clearAuth();
        router.replace('/(auth)/login');
      }}
    ]);
  };

  // Derived states
  const noCredits = creditBalance !== null && creditBalance === 0;
  const lowCredits = creditBalance !== null && creditBalance > 0 && creditBalance < 5;
  const hasOperationalIssue = !gpsEnabled || !locationPermission || noCredits;

  const distanceToPickup = pendingOffer && currentCoords
    ? haversineKm(currentCoords.lat, currentCoords.lng, pendingOffer.ride.origin_lat, pendingOffer.ride.origin_lng)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="menu" size={26} color={COLORS.textDark} />
          </TouchableOpacity>
          <View>
            <Text style={styles.brand}>KAVIAR</Text>
            {userName ? <Text style={styles.userName}>{userName}</Text> : null}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {creditBalance !== null && (
            <TouchableOpacity style={[styles.creditBadge, creditBalance < 5 && styles.creditBadgeLow]} onPress={() => router.push('/(driver)/credits')}>
              <Ionicons name="wallet-outline" size={14} color={creditBalance < 5 ? '#fff' : COLORS.primary} />
              <Text style={[styles.creditText, creditBalance < 5 && { color: '#fff' }]}>
                {creditBalance} crédito{creditBalance !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Operational status banners */}
      {!gpsEnabled && (
        <View style={styles.banner}>
          <Ionicons name="navigate-outline" size={16} color={COLORS.warning} />
          <Text style={styles.bannerText}>GPS desligado. Ative a localização para receber corridas.</Text>
        </View>
      )}
      {!locationPermission && gpsEnabled && (
        <View style={styles.banner}>
          <Ionicons name="location-outline" size={16} color={COLORS.warning} />
          <Text style={styles.bannerText}>Permissão de localização negada. Ative nas configurações.</Text>
        </View>
      )}
      {noCredits && (
        <TouchableOpacity style={[styles.banner, { backgroundColor: '#fde8e8' }]} onPress={() => router.push('/(driver)/credits')}>
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
          <Text style={[styles.bannerText, { color: COLORS.danger }]}>Sem créditos. Você não receberá corridas. <Text style={{ fontWeight: '700' }}>Comprar</Text></Text>
        </TouchableOpacity>
      )}
      {lowCredits && (
        <TouchableOpacity style={styles.banner} onPress={() => router.push('/(driver)/credits')}>
          <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
          <Text style={styles.bannerText}>Créditos acabando. <Text style={{ fontWeight: '700' }}>Comprar créditos</Text></Text>
        </TouchableOpacity>
      )}
      {backgroundDenied && isOnline && (
        <View style={styles.banner}>
          <Ionicons name="navigate-outline" size={16} color={COLORS.warning} />
          <Text style={styles.bannerText}>Localização em segundo plano negada. Ao usar Waze ou minimizar, sua posição não será atualizada.</Text>
        </View>
      )}

      {/* Status */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.center, pendingOffer && { justifyContent: 'flex-start', paddingTop: 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statusRing}>
          <Animated.View style={[
            styles.statusDot,
            { backgroundColor: isOnline ? COLORS.statusOnline : COLORS.statusOffline },
            isOnline && !pendingOffer && { opacity: pulseAnim },
          ]} />
        </View>
        <Text style={[styles.statusText, isOnline && { color: COLORS.statusOnline }]}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>

        {/* Mini-resumo when offline */}
        {!isOnline && !pendingOffer && (
          <View style={styles.quickStats}>
            <TouchableOpacity style={styles.quickStatItem} onPress={() => router.push('/(driver)/summary')}>
              <Ionicons name="today-outline" size={20} color={COLORS.accent} />
              <Text style={styles.quickStatValue}>{todayRides}</Text>
              <Text style={styles.quickStatLabel}>Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickStatItem} onPress={() => router.push('/(driver)/credits')}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
              <Text style={styles.quickStatValue}>{creditBalance ?? '—'}</Text>
              <Text style={styles.quickStatLabel}>Créditos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickStatItem} onPress={() => router.push('/(driver)/help')}>
              <Ionicons name="help-circle-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.quickStatLabel}>Ajuda</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Offer card */}
        {pendingOffer && (
          <View style={styles.offerCard}>
            {/* Badge territorial — homebound tem prioridade visual */}
            {pendingOffer.ride.is_homebound ? (
              <View style={[styles.territoryBadge, { backgroundColor: '#e8f5e9' }]}>
                <Text style={[styles.territoryBadgeText, { color: '#2e7d32' }]}>🏠 Retorno para casa</Text>
                <Text style={styles.territorySubtext}>Taxa reduzida — passageiro da sua região voltando para casa</Text>
              </View>
            ) : pendingOffer.territory_tier === 'COMMUNITY' ? (
              <View style={[styles.territoryBadge, { backgroundColor: '#e3f2fd' }]}>
                <Text style={[styles.territoryBadgeText, { color: '#1565c0' }]}>Da sua comunidade</Text>
                <Text style={styles.territorySubtext}>Prioridade territorial por comunidade</Text>
              </View>
            ) : pendingOffer.territory_tier === 'NEIGHBORHOOD' ? (
              <View style={[styles.territoryBadge, { backgroundColor: '#fff3e0' }]}>
                <Text style={[styles.territoryBadgeText, { color: '#e65100' }]}>Do seu bairro</Text>
                <Text style={styles.territorySubtext}>Prioridade territorial por bairro</Text>
              </View>
            ) : pendingOffer.territory_tier === 'OUTSIDE' ? (
              <View style={[styles.territoryBadge, { backgroundColor: '#f5f5f5' }]}>
                <Text style={[styles.territoryBadgeText, { color: '#616161' }]}>Região próxima</Text>
                <Text style={styles.territorySubtext}>Corrida fora do seu território principal</Text>
              </View>
            ) : null}

            <View style={styles.offerHeader}>
              <Ionicons name="car-sport" size={22} color={COLORS.primary} />
              <Text style={styles.offerTitle}>Nova corrida!</Text>
              {offerCountdown ? <Text style={styles.offerTimer}>{offerCountdown}</Text> : null}
            </View>

            <View style={styles.routeRow}>
              <View style={styles.routeDots}>
                <View style={[styles.dot, { backgroundColor: COLORS.statusOnline }]} />
                <View style={styles.dotLine} />
                <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
              </View>
              <View style={styles.routeTexts}>
                <Text style={styles.routeText}>{pendingOffer.ride.origin_text || 'Origem não informada'}</Text>
                <Text style={styles.routeText}>{pendingOffer.ride.destination_text || 'Destino não informado'}</Text>
              </View>
            </View>

            {distanceToPickup !== null && (
              <View style={styles.offerMeta}>
                <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.offerMetaText}>{distanceToPickup.toFixed(1)} km até o embarque</Text>
              </View>
            )}

            {(pendingOffer.ride as any).quoted_price != null && (
              <View style={styles.offerMeta}>
                <Ionicons name="cash-outline" size={14} color={COLORS.primary} />
                <Text style={[styles.offerMetaText, { color: COLORS.primary, fontWeight: '700' }]}>Estimativa R$ {Number((pendingOffer.ride as any).quoted_price).toFixed(2)}</Text>
              </View>
            )}

            {pendingOffer.ride.passenger?.name && (
              <Text style={styles.offerPassenger}>
                <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />{' '}
                {pendingOffer.ride.passenger.name}
              </Text>
            )}

            {(pendingOffer.ride as any).trip_details && (
              <View style={styles.offerGroup}>
                <Ionicons name="people" size={14} color={COLORS.accent} />
                <Text style={styles.offerGroupText}>
                  {groupLabel((pendingOffer.ride as any).trip_details.passengers || 1, !!(pendingOffer.ride as any).trip_details.has_luggage)}
                </Text>
              </View>
            )}

            {(pendingOffer.ride as any).wait_requested && (
              <View style={{ backgroundColor: '#fff8e1', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginTop: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#f57f17' }}>
                  ⏳ Espera solicitada{(pendingOffer.ride as any).wait_estimated_min ? `: ~${(pendingOffer.ride as any).wait_estimated_min} min` : ''}
                </Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Consome 2 créditos</Text>
              </View>
            )}

            <View style={styles.offerButtons}>
              <Button title="Aceitar" variant="success" onPress={handleAcceptOffer} style={{ flex: 1 }} />
              <View style={{ width: 12 }} />
              <Button title="Recusar" variant="danger" onPress={handleRejectOffer} style={{ flex: 1 }} />
            </View>
            {!soundMuted && (
              <TouchableOpacity
                style={styles.muteBtn}
                onPress={() => { stopSound(); setSoundMuted(true); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="volume-mute-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.muteBtnText}>Silenciar alerta</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        {!isOnline ? (
          noCredits ? (
            <Button title="Comprar créditos para começar" onPress={() => router.push('/(driver)/credits')} />
          ) : (
            <Button title={loading ? 'Conectando...' : 'Ficar Online'} onPress={handleGoOnline} loading={loading} />
          )
        ) : !pendingOffer ? (
          <>
            <View style={styles.waitingBox}>
              <Ionicons name="radio-outline" size={20} color={COLORS.textMuted} />
              <Text style={styles.waitingText}>Aguardando corridas...</Text>
            </View>
            <Button title="Ficar Offline" variant="outline" onPress={handleGoOffline} loading={loading} />
          </>
        ) : null}
      </ScrollView>

      {/* Drawer */}
      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userName={userName}
        userPhone={userPhone}
        items={drawerItems}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
  },
  brand: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 4 },
  menuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
  userName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  // Banners
  banner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff8e1',
    marginHorizontal: 24, marginBottom: 6, padding: 10, borderRadius: 8, gap: 8,
  },
  bannerText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  // Status
  statusRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 12,
  },
  statusDot: { width: 36, height: 36, borderRadius: 18 },
  statusText: {
    fontSize: 28, fontWeight: '800', color: COLORS.textMuted,
    textAlign: 'center', letterSpacing: 4, marginBottom: 32,
  },

  // Quick stats
  quickStats: {
    flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 32,
  },
  quickStatItem: {
    backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
    alignItems: 'center', minWidth: 80, borderWidth: 1, borderColor: COLORS.border,
  },
  quickStatValue: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 6 },
  quickStatLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },

  // Offer
  offerCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 24,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  territoryBadge: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 12,
  },
  territoryBadgeText: {
    fontSize: 15, fontWeight: '700',
  },
  territorySubtext: {
    fontSize: 12, color: COLORS.textMuted, marginTop: 2,
  },
  offerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  offerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 10, flex: 1 },
  offerTimer: {
    fontSize: 15, fontWeight: '800', color: COLORS.warning,
    backgroundColor: COLORS.surfaceLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  routeRow: { flexDirection: 'row', marginBottom: 12 },
  routeDots: { alignItems: 'center', marginRight: 12, paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLine: { width: 2, height: 24, backgroundColor: COLORS.border, marginVertical: 2 },
  routeTexts: { flex: 1, justifyContent: 'space-between', gap: 14 },
  routeText: { fontSize: 15, color: COLORS.textPrimary },
  offerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  offerMetaText: { fontSize: 13, color: COLORS.textMuted },
  offerPassenger: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  offerGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.border },
  offerGroupText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  offerButtons: { flexDirection: 'row' },
  muteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 12, paddingVertical: 6, gap: 6,
  },
  muteBtnText: { fontSize: 13, color: COLORS.textMuted },

  // Waiting
  waitingBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  waitingText: { fontSize: 15, color: COLORS.textMuted, marginLeft: 8 },

  // Credits
  creditBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4,
  },
  creditBadgeLow: { backgroundColor: COLORS.danger },
  creditText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});
