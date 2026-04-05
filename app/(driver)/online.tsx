import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';
import { authStore } from '../../src/auth/auth.store';
import { RideOffer } from '../../src/types/ride';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';
import { DrawerMenu, DrawerItem } from '../../src/components/DrawerMenu';

const POLL_INTERVAL = 5000;
const LOCATION_INTERVAL = 15000;

export default function DriverOnline() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [pendingOffer, setPendingOffer] = useState<RideOffer | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const locationRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
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
    { key: 'help', label: 'Ajuda', icon: 'help-circle-outline', onPress: () => router.push('/(driver)/help') },
    { key: 'logout', label: 'Sair', icon: 'log-out-outline', danger: true, onPress: () => handleLogout() },
  ];

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
    loadUser();
    checkCurrentRide();
    loadCredits();
    return () => { stopAll(); soundRef.current?.unloadAsync(); };
  }, []);

  // Refresh credits when screen regains focus (e.g. after completing a ride)
  useFocusEffect(useCallback(() => { loadCredits(); }, []));

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

  const loadUser = () => {
    const user = authStore.getUser();
    if (user?.name) setUserName(user.name);
    if (user?.phone) setUserPhone(user.phone);
  };

  const loadCredits = async () => {
    try {
      const { balance } = await driverApi.getCredits();
      setCreditBalance(balance);
    } catch {}
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
          try {
            await soundRef.current?.unloadAsync();
            const { sound } = await Audio.Sound.createAsync(
              require('../../assets/sounds/new-ride.wav')
            );
            soundRef.current = sound;
            await sound.playAsync();
          } catch {}
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
      Alert.alert('Erro', friendlyError(e, 'Erro ao ficar online'));
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
      Alert.alert('Erro', friendlyError(e, 'Erro ao ficar offline'));
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

      {/* Low credit alert */}
      {creditBalance !== null && creditBalance < 5 && creditBalance > 0 && (
        <TouchableOpacity style={styles.creditAlert} onPress={() => router.push('/(driver)/credits')}>
          <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
          <Text style={styles.creditAlertText}>Seus créditos estão acabando. <Text style={{ fontWeight: '700' }}>Comprar créditos</Text></Text>
        </TouchableOpacity>
      )}
      {creditBalance !== null && creditBalance === 0 && (
        <TouchableOpacity style={[styles.creditAlert, { backgroundColor: '#fde8e8' }]} onPress={() => router.push('/(driver)/credits')}>
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.danger} />
          <Text style={[styles.creditAlertText, { color: COLORS.danger }]}>Sem créditos. <Text style={{ fontWeight: '700' }}>Toque para comprar</Text></Text>
        </TouchableOpacity>
      )}

      {/* Status */}
      <View style={styles.center}>
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

        {/* Offer card */}
        {pendingOffer && (
          <View style={styles.offerCard}>
            <View style={styles.offerHeader}>
              <Ionicons name="car-sport" size={22} color={COLORS.primary} />
              <Text style={styles.offerTitle}>Nova corrida!</Text>
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

            {pendingOffer.ride.passenger?.name && (
              <Text style={styles.offerPassenger}>
                <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />{' '}
                {pendingOffer.ride.passenger.name}
              </Text>
            )}

            <View style={styles.offerButtons}>
              <Button title="Aceitar" variant="success" onPress={handleAcceptOffer} style={{ flex: 1 }} />
              <View style={{ width: 12 }} />
              <Button title="Recusar" variant="danger" onPress={handleRejectOffer} style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {/* Actions */}
        {!isOnline ? (
          <Button title={loading ? 'Conectando...' : 'Ficar Online'} onPress={handleGoOnline} loading={loading} />
        ) : !pendingOffer ? (
          <>
            <View style={styles.waitingBox}>
              <Ionicons name="radio-outline" size={20} color={COLORS.textMuted} />
              <Text style={styles.waitingText}>Aguardando corridas...</Text>
            </View>
            <Button title="Ficar Offline" variant="outline" onPress={handleGoOffline} loading={loading} />
          </>
        ) : null}
      </View>

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

  // Offer
  offerCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 24,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  offerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  offerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginLeft: 10 },
  routeRow: { flexDirection: 'row', marginBottom: 12 },
  routeDots: { alignItems: 'center', marginRight: 12, paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLine: { width: 2, height: 24, backgroundColor: COLORS.border, marginVertical: 2 },
  routeTexts: { flex: 1, justifyContent: 'space-between', gap: 14 },
  routeText: { fontSize: 15, color: COLORS.textPrimary },
  offerPassenger: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  offerButtons: { flexDirection: 'row' },

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
  creditAlert: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff8e1',
    marginHorizontal: 24, marginBottom: 8, padding: 10, borderRadius: 8, gap: 8,
  },
  creditAlertText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
});
