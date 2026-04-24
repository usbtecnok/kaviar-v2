import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Linking, TouchableOpacity, Modal, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';
import { Ride, RideStatus } from '../../src/types/ride';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';
import { setActiveRideId, setEmergencyMode } from '../../src/services/background-location';
import { enqueue, getQueueSize } from '../../src/services/offline-queue';
import { ENV } from '../../src/config/env';
import { groupLabel } from '../../src/utils/tripLabel';

const BOARDING_LABELS: Record<string, { icon: string; text: string }> = {
  at_door: { icon: '🚪', text: 'Na porta' },
  descending: { icon: '🏃', text: 'Está descendo' },
  '2_minutes': { icon: '⏱️', text: 'Vai levar 2 minutos' },
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending_adjustment: { label: 'Aguardando passageiro aceitar ajuste', color: COLORS.warning, icon: '💰' },
  accepted:    { label: 'Indo ao passageiro', color: COLORS.primary, icon: '🚗' },
  arrived:     { label: 'Aguardando embarque', color: COLORS.warning, icon: '📍' },
  in_progress: { label: 'Corrida em andamento', color: COLORS.success, icon: '🛣️' },
};

const LOCATION_INTERVAL = 5000;

export default function CompleteRide() {
  const router = useRouter();
  const params = useLocalSearchParams<{ rideId: string; status?: string }>();
  const insets = useSafeAreaInsets();
  const [ride, setRide] = useState<Ride | null>(null);
  const [rideStatus, setRideStatus] = useState<RideStatus>((params.status as RideStatus) || 'accepted');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // B1: Wait timer
  const [arrivedAt, setArrivedAt] = useState<number | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);

  // B2: Completion screen
  const [completionData, setCompletionData] = useState<{ credit?: { cost: number; matchType: string; balance: number } } | null>(null);
  const completionRef = useRef(false);

  // B3: Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  // B4: Emergency modal
  const [showEmergency, setShowEmergency] = useState(false);

  // B5: Offline queue indicator
  const [queuePending, setQueuePending] = useState(0);

  // Map layout hack: force native redraw on Android
  const [mapPadding, setMapPadding] = useState(1);

  useEffect(() => {
    loadRide();
    startMapTracking();
    startPolling();
    if (params.rideId) setActiveRideId(params.rideId).catch(() => {});
    return () => {
      locationSubRef.current?.remove();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // B1: Timer tick
  useEffect(() => {
    if (rideStatus !== 'arrived' || !arrivedAt) return;
    const id = setInterval(() => setWaitSeconds(Math.floor((Date.now() - arrivedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [rideStatus, arrivedAt]);

  const startPolling = (intervalMs = 5000) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const current = await driverApi.getCurrentRide();
        if (current) {
          setRide(current);
          setRideStatus(current.status as RideStatus);
        } else if (!completionRef.current) {
          setActiveRideId(null);
          setRideStatus('canceled_by_passenger' as RideStatus);
          if (pollRef.current) clearInterval(pollRef.current);
        }
        // Update queue indicator
        setQueuePending(await getQueueSize());
      } catch {}
    }, intervalMs);
  };

  // Speed up polling during arrived (boarding status needs fast updates)
  useEffect(() => {
    if (rideStatus === 'arrived') startPolling(3000);
    else if (rideStatus === 'accepted' || rideStatus === 'in_progress') startPolling(5000);
  }, [rideStatus]);

  const loadRide = async () => {
    try {
      const current = await driverApi.getCurrentRide();
      if (current) {
        // Debug: log coordinate values to diagnose map/navigation issues
        console.log('[CompleteRide] ride loaded:', JSON.stringify({
          id: current.id,
          status: current.status,
          origin_lat: current.origin_lat,
          origin_lng: current.origin_lng,
          dest_lat: current.dest_lat,
          dest_lng: current.dest_lng,
          origin_text: current.origin_text,
          destination_text: current.destination_text,
          types: {
            origin_lat: typeof current.origin_lat,
            origin_lng: typeof current.origin_lng,
            dest_lat: typeof current.dest_lat,
            dest_lng: typeof current.dest_lng,
          }
        }));
        setRide(current);
        setRideStatus(current.status as RideStatus);
        if (current.status === 'arrived' && current.arrived_at) {
          setArrivedAt(new Date(current.arrived_at).getTime());
        }
      }
    } catch (e: any) {
      if (e.response?.status !== 401) {
        Alert.alert('Erro', friendlyError(e, 'Não foi possível carregar a corrida.'));
      }
    } finally { setFetching(false); }
  };

  const startMapTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      locationSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 20, timeInterval: LOCATION_INTERVAL },
        (loc) => {
          const { latitude: lat, longitude: lng } = loc.coords;
          setDriverLocation({ lat, lng });
        }
      );
    } catch (e) {
      console.warn('[CompleteRide] startMapTracking failed:', e);
    }
  };

  const getTarget = (): { lat: number; lng: number; label: string } | null => {
    if (!ride) return null;
    if (rideStatus === 'in_progress') return { lat: ride.dest_lat, lng: ride.dest_lng, label: ride.destination_text || 'Destino' };
    return { lat: ride.origin_lat, lng: ride.origin_lng, label: ride.origin_text || 'Passageiro' };
  };

  const openNavigation = () => {
    const target = getTarget();
    if (!target) return;
    console.log('[CompleteRide] openNavigation:', JSON.stringify({ rideStatus, target, driverLocation }));

    // Try Waze first (direct deep link, no intermediary)
    const wazeUrl = `https://waze.com/ul?ll=${target.lat},${target.lng}&navigate=yes`;
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`;

    Linking.canOpenURL('https://waze.com/ul').then((hasWaze) => {
      Linking.openURL(hasWaze ? wazeUrl : googleUrl).catch(() => {
        Linking.openURL(googleUrl).catch(() => {});
      });
    }).catch(() => {
      Linking.openURL(googleUrl).catch(() => {});
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

  const hasFitted = useRef(false);
  useEffect(() => {
    if (!ride) return;
    const t = getTarget();
    if (!t) return;
    console.log('[CompleteRide] map update:', JSON.stringify({ hasFitted: hasFitted.current, target: t, driverLocation }));
    if (hasFitted.current) return;
    if (driverLocation) {
      hasFitted.current = true;
      fitMarkers();
    } else {
      // Center on target immediately while waiting for GPS
      mapRef.current?.animateToRegion({ latitude: t.lat, longitude: t.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 300);
    }
  }, [driverLocation?.lat, ride?.id]);

  const handleArrived = async () => {
    setLoading(true);
    try {
      await driverApi.arrived(params.rideId!);
      setRideStatus('arrived');
      setArrivedAt(Date.now());
    } catch (e: any) {
      if (e.response?.status === 400) setRideStatus('canceled_by_passenger' as RideStatus);
      else if (!e.response) {
        // Network error — enqueue and update UI optimistically
        await enqueue({ method: 'POST', url: `${ENV.API_URL}/api/v2/rides/${params.rideId}/arrived`, body: {} });
        setRideStatus('arrived');
        setArrivedAt(Date.now());
        setQueuePending(await getQueueSize());
      } else Alert.alert('Erro', friendlyError(e, 'Não foi possível confirmar chegada'));
    } finally { setLoading(false); }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await driverApi.startRide(params.rideId!);
      setRideStatus('in_progress');
      setRide(prev => prev ? { ...prev, status: 'in_progress' } : prev);
    } catch (e: any) {
      if (e.response?.status === 400) {
        const msg = e.response?.data?.error || '';
        if (msg.includes('Encerre a espera')) Alert.alert('Atenção', msg);
        else setRideStatus('canceled_by_passenger' as RideStatus);
      } else if (!e.response) {
        await enqueue({ method: 'POST', url: `${ENV.API_URL}/api/v2/rides/${params.rideId}/start`, body: {} });
        setRideStatus('in_progress');
        setQueuePending(await getQueueSize());
      } else Alert.alert('Erro', friendlyError(e, 'Não foi possível iniciar a corrida'));
    } finally { setLoading(false); }
  };

  const handleStartWait = async () => {
    setLoading(true);
    try {
      await driverApi.startWait(params.rideId!);
      setRide(prev => prev ? { ...prev, wait_started_at: new Date().toISOString() } : prev);
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Não foi possível iniciar a espera'));
    } finally { setLoading(false); }
  };

  const handleEndWait = async () => {
    setLoading(true);
    try {
      await driverApi.endWait(params.rideId!);
      setRide(prev => prev ? { ...prev, wait_ended_at: new Date().toISOString() } : prev);
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Não foi possível encerrar a espera'));
    } finally { setLoading(false); }
  };

  // B2: Completion with dedicated screen
  const handleComplete = async () => {
    setLoading(true);
    try {
      const result = await driverApi.completeRide(params.rideId!);
      completionRef.current = true;
      if (pollRef.current) clearInterval(pollRef.current);
      await setActiveRideId(null);
      setCompletionData({ credit: result?.credit || undefined });
    } catch (e: any) {
      if (e.response?.status === 400) setRideStatus('canceled_by_passenger' as RideStatus);
      else if (!e.response) {
        await enqueue({ method: 'POST', url: `${ENV.API_URL}/api/v2/rides/${params.rideId}/complete`, body: {} });
        if (pollRef.current) clearInterval(pollRef.current);
        await setActiveRideId(null);
        Alert.alert('Sem conexão', 'A finalização será enviada quando a conexão voltar.');
        router.replace('/(driver)/online');
      } else Alert.alert('Erro', friendlyError(e, 'Não foi possível finalizar a corrida'));
    } finally { setLoading(false); }
  };

  // B3: Cancel ride
  const handleCancel = async (reason: string) => {
    setShowCancelModal(false);
    setLoading(true);
    try {
      await setActiveRideId(null);
      // Reuse passenger cancel endpoint via generic approach — driver cancels by calling the API
      const { apiClient } = require('../../src/api/client');
      await apiClient.post(`/api/v2/rides/${params.rideId}/driver-cancel`, { reason });
      router.replace('/(driver)/online');
    } catch (e: any) {
      // If no driver-cancel endpoint, just go back
      Alert.alert('Cancelamento', 'Não foi possível cancelar. Volte para a tela principal.', [
        { text: 'OK', onPress: () => router.replace('/(driver)/online') }
      ]);
    } finally { setLoading(false); }
  };

  const fmtWait = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // --- LOADING ---
  if (fetching) {
    return <View style={[st.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  // --- CANCELED ---
  if (rideStatus === 'canceled_by_passenger' || rideStatus === 'canceled_by_driver') {
    return (
      <View style={[st.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🚫</Text>
        <Text style={st.centeredTitle}>Corrida cancelada</Text>
        <Text style={st.centeredSub}>{rideStatus === 'canceled_by_passenger' ? 'O passageiro cancelou esta corrida.' : 'Corrida cancelada.'}</Text>
        <Button title="Voltar para online" onPress={() => router.replace('/(driver)/online')} style={{ marginTop: 24 }} />
      </View>
    );
  }

  // --- B2: COMPLETED ---
  if (completionData) {
    const credit = completionData.credit;
    return (
      <View style={[st.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
        <Text style={st.centeredTitle}>Corrida finalizada!</Text>
        {(ride as any)?.is_homebound && (
          <View style={{ backgroundColor: '#e8f5e9', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginTop: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#2e7d32' }}>🏠 Retorno para casa — taxa especial aplicada</Text>
          </View>
        )}
        {credit && (
          <View style={st.completionCard}>
            <View style={st.completionRow}>
              <Text style={st.completionLabel}>Créditos consumidos</Text>
              <Text style={st.completionValue}>{credit.cost}</Text>
            </View>
            <View style={st.completionRow}>
              <Text style={st.completionLabel}>Tipo</Text>
              <Text style={st.completionValue}>{credit.matchType === 'LOCAL' ? 'Local' : 'Externa'}</Text>
            </View>
            <View style={[st.completionRow, { borderBottomWidth: 0 }]}>
              <Text style={st.completionLabel}>Saldo restante</Text>
              <Text style={[st.completionValue, { color: COLORS.primary }]}>{credit.balance} crédito{credit.balance !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        )}
        <Text style={st.communityMsg}>Obrigado pela viagem! Sua corrida fortalece a comunidade 🏘️</Text>
        <Button title="Ficar online" onPress={() => router.replace('/(driver)/online')} style={{ marginTop: 8 }} />
      </View>
    );
  }

  // --- ACTIVE RIDE ---
  const info = STATUS_LABELS[rideStatus] || STATUS_LABELS.accepted;
  const target = getTarget();
  // Default to Rio de Janeiro center; animateToRegion handles real coords
  const mapRegion: Region = target
    ? { latitude: target.lat, longitude: target.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : { latitude: -22.9711, longitude: -43.1822, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  return (
    <View style={st.container}>
      {/* Status bar */}
      <View style={[st.statusBar, { backgroundColor: info.color }]}>
        <Text style={st.statusText}>
          {info.icon} {info.label}
          {rideStatus === 'arrived' && arrivedAt ? `  •  ${fmtWait(waitSeconds)}` : ''}
        </Text>
      </View>

      {/* Offline queue indicator */}
      {queuePending > 0 && (
        <View style={{ backgroundColor: '#1a1a2e', paddingVertical: 6, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Ionicons name="cloud-offline-outline" size={14} color="#F39C12" />
          <Text style={{ color: '#F39C12', fontSize: 12, fontWeight: '600' }}>Reconectando... ({queuePending} pendente{queuePending > 1 ? 's' : ''})</Text>
        </View>
      )}

      {/* Map — always mounted, wrapped for guaranteed dimensions */}
      <View style={st.mapContainer}>
        <MapView
          ref={mapRef}
          style={[StyleSheet.absoluteFillObject, { paddingBottom: mapPadding }]}
          initialRegion={mapRegion}
          onMapReady={() => {
            setMapPadding(0);
            // Try to fit markers, or at least center on target
            const t = getTarget();
            if (driverLocation && t) {
              fitMarkers();
            } else if (t) {
              mapRef.current?.animateToRegion({ latitude: t.lat, longitude: t.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 300);
            }
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {target && <Marker coordinate={{ latitude: target.lat, longitude: target.lng }} title={rideStatus === 'in_progress' ? 'Destino' : 'Passageiro'} description={target.label} pinColor={rideStatus === 'in_progress' ? COLORS.success : COLORS.primary} />}
          {driverLocation && <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }} title="Você" pinColor={COLORS.warning} />}
        </MapView>
      </View>

      {/* Bottom sheet */}
      <View style={[st.bottomSheet, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}>
        <View style={st.infoRow}>
          <View style={st.infoBlock}>
            <Text style={st.infoLabel}>{rideStatus === 'in_progress' ? 'Destino' : 'Origem'}</Text>
            <Text style={st.infoValue} numberOfLines={2}>{target?.label || '—'}</Text>
          </View>
          {ride?.passenger?.name && (
            <View style={st.infoBlock}>
              <Text style={st.infoLabel}>Passageiro</Text>
              <Text style={st.infoValue}>{ride.passenger.name}</Text>
            </View>
          )}
        </View>

        {/* Group label */}
        {(ride as any)?.trip_details && (
          <View style={st.groupCard}>
            <Ionicons name="people" size={16} color={COLORS.accent} />
            <Text style={st.groupText}>
              {groupLabel((ride as any).trip_details.passengers || 1, !!(ride as any).trip_details.has_luggage)}
            </Text>
          </View>
        )}

        {/* Boarding status from passenger */}
        {rideStatus === 'arrived' && (ride as any)?.trip_details?.boarding_status && BOARDING_LABELS[(ride as any).trip_details.boarding_status] && (
          <View style={st.boardingCard}>
            <View style={st.boardingCardBorder} />
            <View style={st.boardingCardContent}>
              <Text style={st.boardingCardIcon}>{BOARDING_LABELS[(ride as any).trip_details.boarding_status].icon}</Text>
              <View>
                <Text style={st.boardingCardTitle}>Passageiro</Text>
                <Text style={st.boardingCardText}>{BOARDING_LABELS[(ride as any).trip_details.boarding_status].text}</Text>
              </View>
            </View>
          </View>
        )}

        {/* B1: Wait warning */}
        {rideStatus === 'arrived' && waitSeconds >= 180 && (
          <View style={st.waitWarning}>
            <Ionicons name="time-outline" size={15} color={COLORS.warning} />
            <Text style={st.waitWarningText}>Passageiro não apareceu? Você pode cancelar sem penalidade.</Text>
          </View>
        )}

        <Button title={rideStatus === 'in_progress' ? '📍 Navegar até o destino' : '📍 Navegar até o passageiro'} onPress={openNavigation} style={{ backgroundColor: '#1a73e8', marginBottom: 8, paddingVertical: 18 }} />

        {rideStatus === 'accepted' && (
          <Button title={loading ? 'Aguarde...' : 'Cheguei no local'} onPress={handleArrived} disabled={loading} style={{ backgroundColor: COLORS.primary, minHeight: 56 }} />
        )}
        {rideStatus === 'arrived' && (
          <Button title={loading ? 'Aguarde...' : 'Iniciar corrida'} onPress={handleStart} disabled={loading} style={{ backgroundColor: COLORS.warning, minHeight: 56 }} />
        )}
        {rideStatus === 'in_progress' && ride?.wait_requested && !ride?.wait_started_at && (
          <Button title={loading ? 'Aguarde...' : '⏳ Iniciar espera'} onPress={handleStartWait} disabled={loading} style={{ backgroundColor: '#f57f17', minHeight: 56, marginBottom: 8 }} />
        )}
        {rideStatus === 'in_progress' && ride?.wait_requested && ride?.wait_started_at && !ride?.wait_ended_at && (
          <Button title={loading ? 'Aguarde...' : '✅ Encerrar espera'} onPress={handleEndWait} disabled={loading} style={{ backgroundColor: '#388e3c', minHeight: 56, marginBottom: 8 }} />
        )}
        {rideStatus === 'in_progress' && (
          <Button title={loading ? 'Finalizando...' : 'Finalizar corrida'} onPress={handleComplete} disabled={loading || (!!ride?.wait_requested && !!ride?.wait_started_at && !ride?.wait_ended_at)} style={{ backgroundColor: COLORS.success, minHeight: 56 }} />
        )}

        {/* B3: Cancel button */}
        {(rideStatus === 'accepted' || rideStatus === 'arrived') && (
          <TouchableOpacity style={st.cancelLink} onPress={() => setShowCancelModal(true)}>
            <Text style={st.cancelLinkText}>Cancelar corrida</Text>
          </TouchableOpacity>
        )}

        {/* B4: Emergency + Share buttons */}
        {['accepted', 'arrived', 'in_progress'].includes(rideStatus) && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14, marginBottom: 8 }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#1a2a3a' }} onPress={async () => {
              if (!ride?.id) return;
              try {
                const { apiClient } = require('../../src/api/client');
                const { data } = await apiClient.post(`/api/v2/rides/${ride.id}/share`);
                Share.share({ message: `Acompanhe minha corrida KAVIAR em tempo real:\n${data.url}` });
              } catch { Share.share({ message: `Estou em uma corrida KAVIAR. Passageiro: ${ride?.passenger?.name || '?'}` }); }
            }}>
              <Ionicons name="location-outline" size={15} color="#3498db" />
              <Text style={{ color: '#3498db', fontSize: 13, fontWeight: '600' }}>Compartilhar corrida</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: COLORS.danger }} onPress={() => setShowEmergency(true)}>
              <Ionicons name="shield-outline" size={16} color={COLORS.danger} />
              <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: '600' }}>Emergência</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* B3: Cancel modal */}
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={st.modalOverlay}>
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>Cancelar corrida</Text>
            <Text style={st.modalSub}>Selecione o motivo:</Text>
            {[
              { label: 'Passageiro não apareceu', value: 'no_show' },
              { label: 'Endereço errado', value: 'wrong_address' },
              { label: 'Emergência pessoal', value: 'emergency' },
            ].map(opt => (
              <TouchableOpacity key={opt.value} style={st.modalOption} onPress={() => handleCancel(opt.value)}>
                <Text style={st.modalOptionText}>{opt.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={st.modalClose} onPress={() => setShowCancelModal(false)}>
              <Text style={st.modalCloseText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* B4: Emergency modal */}
      <Modal visible={showEmergency} transparent animationType="fade" onRequestClose={() => setShowEmergency(false)}>
        <View style={st.modalOverlay}>
          <View style={st.modalCard}>
            <Ionicons name="shield-checkmark" size={36} color={COLORS.danger} style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={[st.modalTitle, { textAlign: 'center' }]}>Ajuda urgente</Text>
            <Text style={{ textAlign: 'center', marginBottom: 18, fontSize: 13, color: COLORS.textSecondary }}>Em situação de risco imediato, ligue para a emergência pública.</Text>

            <TouchableOpacity style={{ backgroundColor: COLORS.danger, borderRadius: 10, paddingVertical: 14, alignItems: 'center' }} onPress={() => { setShowEmergency(false); Linking.openURL('tel:190'); }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Ligar 190 — Polícia</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#E67E22', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 }} onPress={() => { setShowEmergency(false); Linking.openURL('tel:192'); }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Ligar 192 — SAMU</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ backgroundColor: '#2E86C1', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 }} onPress={() => {
              setShowEmergency(false);
              const loc = driverLocation ? `https://maps.google.com/?q=${driverLocation.lat},${driverLocation.lng}` : '';
              const passengerInfo = ride?.passenger ? `Passageiro: ${ride.passenger.name}` : '';
              Share.share({ message: `🚨 Preciso de ajuda!\n${passengerInfo}\nCorrida: ${ride?.id || 'N/A'}\n${loc ? `Minha localização: ${loc}` : ''}`.trim() });
            }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Contato de confiança</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 8 }} onPress={async () => {
              if (!ride?.id) return;
              try {
                await driverApi.triggerEmergency(ride.id);
                // Immediate location point + activate emergency mode
                try {
                  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                  await driverApi.sendRideLocation(ride.id, pos.coords.latitude, pos.coords.longitude).catch(() => {});
                } catch {}
                setEmergencyMode(true).catch(() => {});
                Alert.alert('Incidente registrado', 'A Kaviar está acompanhando esta corrida.');
              } catch {
                // Fallback: WhatsApp
                const loc = driverLocation ? `${driverLocation.lat},${driverLocation.lng}` : 'indisponível';
                const msg = `⚠️ Registro de emergência\nMotorista\nCorrida: ${ride?.id || 'N/A'}\nLocalização: ${loc}`;
                Linking.openURL(`https://wa.me/5521968648777?text=${encodeURIComponent(msg)}`);
              }
            }}>
              <Ionicons name="document-text-outline" size={15} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>Registrar com a Kaviar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ alignSelf: 'center', marginTop: 8, paddingVertical: 8 }} onPress={() => setShowEmergency(false)}>
              <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  statusBar: { paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  map: { flex: 1 },
  mapContainer: { flex: 1, backgroundColor: '#000' },
  bottomSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 },
  infoRow: { flexDirection: 'row', marginBottom: 12, gap: 12 },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  // B1
  waitWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2a2a1a', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.warning },
  waitWarningText: { fontSize: 13, color: COLORS.warning, flex: 1 },
  // Group label
  groupCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  groupText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  // Boarding status
  boardingCard: { flexDirection: 'row', borderRadius: 10, marginBottom: 10, overflow: 'hidden', backgroundColor: '#1a1a0a', borderWidth: 1, borderColor: '#3a3a1a' },
  boardingCardBorder: { width: 4, backgroundColor: COLORS.primary },
  boardingCardContent: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, flex: 1 },
  boardingCardIcon: { fontSize: 22 },
  boardingCardTitle: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  boardingCardText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  // B2
  centeredTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  centeredSub: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  completionCard: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 16, marginTop: 20, marginBottom: 12, width: '100%', borderWidth: 1, borderColor: COLORS.border },
  completionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  completionLabel: { fontSize: 14, color: COLORS.textSecondary },
  completionValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  communityMsg: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 8 },
  // B3
  cancelLink: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  cancelLinkText: { fontSize: 14, color: COLORS.danger, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  modalSub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalOptionText: { fontSize: 15, color: COLORS.textPrimary },
  modalClose: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  modalCloseText: { fontSize: 14, color: COLORS.textMuted },
});
