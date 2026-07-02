import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../src/config/colors';
import { passengerApi, FixedRouteInvitePreview, FixedRouteReservation, PassengerFixedRouteMessage, PassengerFixedRouteMessageSummary } from '../../src/api/passenger.api';
import { normalizeFixedRouteInviteCode } from '../../src/utils/groupInviteDeepLink';
import {
  computeRecentFixedRouteMessages,
  getFixedRouteLastSeenMap,
  getFixedRouteNotificationState,
  markFixedRouteMessagesSeen,
  syncFixedRouteNotificationState,
} from '../../src/services/fixed-route-recent.service';
import { ensurePassengerPushTokenRegistration } from '../../src/services/passenger-push-token.service';

const DAY_OPTIONS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
  { value: 7, label: 'Dom' },
];

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmada',
  cancelled_by_passenger: 'Cancelada por você',
  cancelled_by_driver: 'Cancelada pelo motorista',
  completed: 'Concluída',
  no_show: 'Ausente',
};

const PASSENGER_QUICK_MESSAGES = [
  { code: 'PASSENGER_CONFIRMED', text: 'Confirmo minha ida.' },
  { code: 'ONLY_RETURN_TODAY', text: 'Hoje vou apenas na volta.' },
  { code: 'ARRIVING_POINT', text: 'Estou chegando ao ponto combinado.' },
  { code: 'RUNNING_LATE_PASSENGER', text: 'Estou com alguns minutos de atraso.' },
  { code: 'NEED_HELP', text: 'Preciso de ajuda com essa reserva.' },
];

type ApiError = { response?: { data?: { error?: string } }; message?: string };
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function formatMoney(cents?: number | null) {
  const value = Number(cents || 0) / 100;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDays(days: number[] = []) {
  if (!Array.isArray(days) || days.length === 0) return '-';
  return days.map((day) => DAY_OPTIONS.find((item) => item.value === day)?.label || String(day)).join(', ');
}

function getErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.error || apiError.message || fallback;
}

function driverFirstName(reservation: FixedRouteReservation) {
  const name = reservation.route?.driver?.name || '';
  return name.trim().split(/\s+/)[0] || 'Motorista KAVIAR';
}

function tripTypeLabel(tripType?: string | null) {
  if (tripType === 'one_way_outbound') return 'So ida';
  if (tripType === 'one_way_return') return 'So volta';
  return 'Ida e volta';
}

function scheduleCopy(tripType?: string | null, departureTime?: string | null, returnTime?: string | null) {
  if (tripType === 'one_way_outbound') return `Ida programada: ${departureTime || '-'}`;
  if (tripType === 'one_way_return') return `Volta programada: ${returnTime || '-'}`;
  return `Ida: ${departureTime || '-'} · Volta: ${returnTime || '-'}`;
}

function invitationLead(tripType?: string | null) {
  if (tripType === 'one_way_outbound') return 'Ida programada com horario combinado.';
  if (tripType === 'one_way_return') return 'Volta programada com horario combinado.';
  return 'Ida e volta programadas.';
}

function isRouteClosedStatus(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'archived' || normalized === 'cancelled' || normalized === 'inactive' || normalized === 'deleted';
}

export default function PassengerFixedRoutesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ inviteCode?: string; reservationId?: string }>();
  const normalizedParamCode = useMemo(() => normalizeFixedRouteInviteCode(params?.inviteCode), [params?.inviteCode]);
  const lastAutoFilledCode = useRef('');
  const handledNotificationOpenRef = useRef('');
  const fixedRouteNotificationState = getFixedRouteNotificationState();
  const [, setNotificationTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<FixedRouteInvitePreview | null>(null);
  const [reservations, setReservations] = useState<FixedRouteReservation[]>([]);
  const [messagesByReservation, setMessagesByReservation] = useState<Record<string, PassengerFixedRouteMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});
  const [openComposer, setOpenComposer] = useState<Record<string, boolean>>({});
  const [quickCodeByReservation, setQuickCodeByReservation] = useState<Record<string, string>>({});
  const [textByReservation, setTextByReservation] = useState<Record<string, string>>({});
  const [summaryByReservation, setSummaryByReservation] = useState<Record<string, PassengerFixedRouteMessageSummary>>({});

  const { activeReservations, closedReservations } = useMemo(() => {
    const active: FixedRouteReservation[] = [];
    const closed: FixedRouteReservation[] = [];

    for (const reservation of reservations) {
      const routeStatus = String(reservation.route_status || reservation.route?.status || '');
      const isClosed = reservation.is_archived === true || isRouteClosedStatus(routeStatus);
      if (isClosed) closed.push(reservation);
      else active.push(reservation);
    }

    return { activeReservations: active, closedReservations: closed };
  }, [reservations]);

  const refreshRecentMessages = useCallback(async (currentReservations?: FixedRouteReservation[]) => {
    try {
      const summary = await passengerApi.getFixedRouteMessagesSummary();
      const reservationIds = summary.map((item) => item.reservation_id);
      const lastSeenMap = await getFixedRouteLastSeenMap(reservationIds);
      const { recentReservationIds, recentRouteIds } = computeRecentFixedRouteMessages(summary, lastSeenMap);

      syncFixedRouteNotificationState(summary, recentReservationIds, recentRouteIds);
      setSummaryByReservation(Object.fromEntries(summary.map((item) => [item.reservation_id, item])));

      if (currentReservations && currentReservations.length) {
        const routeIds = new Set(currentReservations.map((reservation) => reservation.route_id));
        fixedRouteNotificationState.recentRouteIds = new Set(Array.from(recentRouteIds).filter((routeId) => routeIds.has(routeId)));
      }

      setNotificationTick((current) => current + 1);
    } catch (error) {
      console.warn('[Passenger Fixed Routes] Recent summary refresh failed:', error);
    }
  }, [fixedRouteNotificationState]);

  const loadReservations = useCallback(async () => {
    try {
      const data = await passengerApi.getMyFixedRouteReservations();
      setReservations(data);
      await refreshRecentMessages(data);
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Não foi possível carregar suas Corridas Compartilhadas.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshRecentMessages]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useFocusEffect(useCallback(() => {
    refreshRecentMessages(reservations);
  }, [refreshRecentMessages, reservations]));

  useFocusEffect(useCallback(() => {
    void ensurePassengerPushTokenRegistration('passenger-fixed-routes');
  }, []));

  useEffect(() => {
    if (!normalizedParamCode) return;

    setCode((currentCode) => {
      const canReplace = currentCode.trim() === '' || currentCode === lastAutoFilledCode.current;
      if (!canReplace) return currentCode;
      lastAutoFilledCode.current = normalizedParamCode;
      return normalizedParamCode;
    });
  }, [normalizedParamCode]);

  useEffect(() => {
    if (normalizedParamCode) checkInvite(normalizedParamCode);
  }, [normalizedParamCode]);

  useEffect(() => {
    const reservationId = typeof params.reservationId === 'string' ? params.reservationId : '';
    if (!reservationId) return;
    if (handledNotificationOpenRef.current === reservationId) return;

    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation) return;

    handledNotificationOpenRef.current = reservationId;

    (async () => {
      try {
        const data = await passengerApi.getFixedRouteReservationMessages(reservationId);
        setMessagesByReservation((current) => ({ ...current, [reservationId]: data.messages || [] }));
        const canReply = data?.can_reply === true || data?.reservation?.can_reply === true;
        setOpenComposer((current) => ({ ...current, [reservationId]: canReply }));
        const newestAt = data.messages?.length ? data.messages[data.messages.length - 1]?.created_at : undefined;
        await markFixedRouteMessagesSeen(reservationId, newestAt || new Date().toISOString());
      } catch {
        // Preserve current screen even when notification context cannot be loaded.
      } finally {
        fixedRouteNotificationState.recentReservationIds.delete(reservationId);
        if (reservation.route_id) fixedRouteNotificationState.recentRouteIds.delete(reservation.route_id);
        await refreshRecentMessages(reservations);
        setNotificationTick((current) => current + 1);
      }
    })();
  }, [params.reservationId, reservations, fixedRouteNotificationState, refreshRecentMessages]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReservations();
  };

  const checkInvite = async (explicitCode?: string) => {
    const normalized = normalizeFixedRouteInviteCode(explicitCode || code);
    if (!normalized) {
      Alert.alert('Código obrigatório', 'Digite um código KFR de Corrida Compartilhada.');
      return;
    }
    if (!normalized.startsWith('KFR-')) {
      Alert.alert('Convite', 'Digite um código KFR válido. Convites GKV/GKR ficam em Meus Grupos KAVIAR.');
      return;
    }

    try {
      setChecking(true);
      const data = await passengerApi.getFixedRouteInvite(normalized);
      setPreview(data);
      setCode(normalized);
    } catch (error: unknown) {
      setPreview(null);
      Alert.alert('Convite', getErrorMessage(error, 'Convite de Corrida Compartilhada não encontrado.'));
    } finally {
      setChecking(false);
    }
  };

  const reserveSeat = async () => {
    const normalized = normalizeFixedRouteInviteCode(preview?.code || code);
    if (!normalized.startsWith('KFR-') || reserving) return;

    try {
      setReserving(true);
      await passengerApi.reserveFixedRoute(normalized);
      Alert.alert('Vaga reservada', `Sua vaga foi reservada. ${invitationLead(preview?.trip_type)}`);
      setCode('');
      setPreview(null);
      await loadReservations();
    } catch (error: unknown) {
      Alert.alert('Falha ao reservar', getErrorMessage(error, 'Não foi possível reservar sua vaga.'));
    } finally {
      setReserving(false);
    }
  };

  const cancelReservation = (reservation: FixedRouteReservation) => {
    Alert.alert('Cancelar reserva', 'Deseja cancelar sua vaga reservada nesta Corrida Compartilhada?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar reserva',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancellingId(reservation.id);
            await passengerApi.cancelFixedRouteReservation(reservation.id);
            await loadReservations();
          } catch (error: unknown) {
            Alert.alert('Erro', getErrorMessage(error, 'Não foi possível cancelar a reserva.'));
          } finally {
            setCancellingId('');
          }
        },
      },
    ]);
  };

  const toggleMessages = async (reservation: FixedRouteReservation) => {
    fixedRouteNotificationState.recentReservationIds.delete(reservation.id);
    if (reservation.route_id) fixedRouteNotificationState.recentRouteIds.delete(reservation.route_id);
    setNotificationTick((current) => current + 1);
    if (messagesByReservation[reservation.id]) {
      setMessagesByReservation((current) => {
        const next = { ...current };
        delete next[reservation.id];
        return next;
      });
      setOpenComposer((current) => ({ ...current, [reservation.id]: false }));
      return;
    }
    try {
      setLoadingMessages((current) => ({ ...current, [reservation.id]: true }));
      const data = await passengerApi.getFixedRouteReservationMessages(reservation.id);
      setMessagesByReservation((current) => ({ ...current, [reservation.id]: data.messages || [] }));
      const canReply = data?.can_reply === true || data?.reservation?.can_reply === true;
      setOpenComposer((current) => ({ ...current, [reservation.id]: canReply }));
      const newestAt = data.messages?.length ? data.messages[data.messages.length - 1]?.created_at : undefined;
      await markFixedRouteMessagesSeen(reservation.id, newestAt || new Date().toISOString());
      await refreshRecentMessages(reservations);
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel carregar mensagens da rota.'));
    } finally {
      setLoadingMessages((current) => ({ ...current, [reservation.id]: false }));
    }
  };

  const sendMessage = async (reservation: FixedRouteReservation) => {
    const message_code = quickCodeByReservation[reservation.id] || undefined;
    const message_text = (textByReservation[reservation.id] || '').trim() || undefined;

    if (!message_code && !message_text) {
      Alert.alert('Mensagem', 'Selecione uma mensagem rapida ou escreva uma mensagem personalizada.');
      return;
    }

    try {
      await passengerApi.sendFixedRouteReservationMessage(reservation.id, { message_code, message_text });
      const data = await passengerApi.getFixedRouteReservationMessages(reservation.id);
      setMessagesByReservation((current) => ({ ...current, [reservation.id]: data.messages || [] }));
      setTextByReservation((current) => ({ ...current, [reservation.id]: '' }));
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel enviar mensagem ao motorista.'));
    }
  };

  const renderPreview = () => {
    if (!preview) return null;

    return (
      <View style={styles.previewBox}>
        <Text style={styles.previewEyebrow}>Corrida Compartilhada KAVIAR</Text>
        <Text style={styles.previewTitle}>{preview.title || 'Rota com horário combinado'}</Text>
        <Text style={styles.previewText}>Você foi convidado para reservar uma vaga em uma rota com horário combinado.</Text>
        <Text style={styles.previewText}>A vaga só fica reservada quando você confirma pelo KAVIAR.</Text>

        <View style={styles.infoGrid}>
          <Info icon="person-outline" label="Motorista" value={preview.driver?.first_name || 'Motorista KAVIAR'} />
          <Info icon="location-outline" label="Origem" value={preview.origin_label} />
          <Info icon="flag-outline" label="Destino" value={preview.destination_label} />
          <Info icon="calendar-outline" label="Dias" value={formatDays(preview.days_of_week)} />
          <Info icon="swap-horizontal-outline" label="Tipo" value={tripTypeLabel(preview.trip_type)} />
          <Info icon="time-outline" label="Horario" value={scheduleCopy(preview.trip_type, preview.departure_time, preview.return_time)} />
          <Info icon="people-outline" label="Vagas" value={`${preview.seats_available} disponíveis`} />
          <Info icon="cash-outline" label="Valor" value={formatMoney(preview.price_per_passenger_cents)} />
        </View>

        {!!preview.description && <Text style={styles.description}>{preview.description}</Text>}

        <View style={styles.consentBox}>
          <Text style={styles.consentTitle}>{invitationLead(preview.trip_type)}</Text>
          <Text style={styles.consentText}>Confira horário, valor, origem, destino e vagas antes de confirmar. A vaga só fica reservada quando você confirma pelo KAVIAR.</Text>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, reserving && styles.disabledBtn]} onPress={reserveSeat} disabled={reserving || preview.status !== 'active' || preview.seats_available <= 0}>
          {reserving ? <ActivityIndicator color={COLORS.textDark} /> : <Text style={styles.primaryBtnText}>Reservar minha vaga</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderReservation = (reservation: FixedRouteReservation) => {
    const route = reservation.route;
    if (!route) return null;
    const routeStatus = String(reservation.route_status || route.status || '');
    const isRouteClosed = reservation.is_archived === true || isRouteClosedStatus(routeStatus);
    const canReply = reservation.can_reply === true && !isRouteClosed;
    const isConfirmed = reservation.status === 'confirmed' && !isRouteClosed;
    const hasRecentBySummary = Boolean(summaryByReservation[reservation.id]?.has_driver_message) && fixedRouteNotificationState.recentReservationIds.has(reservation.id);

    return (
      <View key={reservation.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.routeTitle}>{route.title}</Text>
            <Text style={styles.routePath}>{route.origin_label} → {route.destination_label}</Text>
          </View>
          <View style={[styles.statusPill, isConfirmed ? styles.statusActive : styles.statusMuted]}>
            <Text style={styles.statusText}>{RESERVATION_STATUS_LABELS[reservation.status] || reservation.status}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <Info icon="person-outline" label="Motorista" value={driverFirstName(reservation)} />
          <Info icon="calendar-outline" label="Dias" value={formatDays(route.days_of_week)} />
          <Info icon="swap-horizontal-outline" label="Tipo" value={tripTypeLabel(route.trip_type)} />
          <Info icon="time-outline" label="Horario" value={scheduleCopy(route.trip_type, route.departure_time, route.return_time)} />
          <Info icon="cash-outline" label="Valor" value={formatMoney(reservation.price_cents)} />
          <Info icon="checkmark-circle-outline" label="Reserva" value={invitationLead(route.trip_type)} />
        </View>

        {isConfirmed && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelReservation(reservation)} disabled={cancellingId === reservation.id}>
            {cancellingId === reservation.id ? <ActivityIndicator color={COLORS.danger} /> : <Text style={styles.cancelBtnText}>Cancelar reserva</Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.secondaryBtnInline} onPress={() => toggleMessages(reservation)}>
          <Text style={styles.secondaryBtnText}>
            {messagesByReservation[reservation.id]
              ? 'Ocultar mensagens da rota'
              : isRouteClosed
                ? 'Ver histórico da rota'
                : (hasRecentBySummary || fixedRouteNotificationState.recentRouteIds.has(route.id))
                ? 'Mensagens da rota • nova'
                : 'Mensagens da rota'}
          </Text>
        </TouchableOpacity>

        {loadingMessages[reservation.id] ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} /> : null}

        {messagesByReservation[reservation.id] ? (
          <View style={styles.messagesBox}>
            {isRouteClosed ? (
              <View style={styles.closedBanner}>
                <Ionicons name="archive-outline" size={14} color={COLORS.warning} />
                <Text style={styles.closedBannerText}>{reservation.closure_message || 'Esta rota foi encerrada pelo motorista.'}</Text>
              </View>
            ) : null}

            {(messagesByReservation[reservation.id] || []).map((msg) => {
              const isOwn = msg.sender_type === 'PASSENGER';
              const label = msg.recipient_type === 'ROUTE_CONFIRMED_PASSENGERS' ? 'Aviso para todos' : isOwn ? 'Voce' : 'Motorista';
              return (
                <View key={msg.id} style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                  <Text style={styles.bubbleLabel}>{label}</Text>
                  <Text style={styles.bubbleText}>{msg.message_text}</Text>
                </View>
              );
            })}

            {openComposer[reservation.id] && reservation.status === 'confirmed' && canReply ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsRow}>
                  {PASSENGER_QUICK_MESSAGES.map((option) => {
                    const selected = quickCodeByReservation[reservation.id] === option.code;
                    return (
                      <TouchableOpacity
                        key={option.code}
                        style={[styles.quickChip, selected && styles.quickChipActive]}
                        onPress={() => setQuickCodeByReservation((current) => ({ ...current, [reservation.id]: selected ? '' : option.code }))}
                      >
                        <Text style={[styles.quickChipText, selected && styles.quickChipTextActive]}>{option.text}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Mensagem personalizada (opcional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={textByReservation[reservation.id] || ''}
                  onChangeText={(value) => setTextByReservation((current) => ({ ...current, [reservation.id]: value.slice(0, 500) }))}
                />
                <TouchableOpacity style={styles.secondaryBtnInline} onPress={() => sendMessage(reservation)}>
                  <Text style={styles.secondaryBtnText}>Enviar mensagem</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando Corridas Compartilhadas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text
          style={[styles.title, { flex: 1, textAlign: 'center' }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          Minhas Corridas Compartilhadas
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.inviteBox}>
          <Text style={styles.sectionTitle}>Corrida Compartilhada KAVIAR</Text>
          <Text style={styles.helperText}>Você foi convidado para reservar uma vaga em uma rota com horário combinado.</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={code}
              onChangeText={(value) => setCode(value.toUpperCase())}
              placeholder="Ex.: KFR-ABC123"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => checkInvite()} disabled={checking}>
              {checking ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.secondaryBtnText}>Validar</Text>}
            </TouchableOpacity>
          </View>
          {renderPreview()}
        </View>

        <Text style={styles.sectionTitle}>Suas reservas ativas</Text>
        {(fixedRouteNotificationState.recentRouteIds.size > 0 || fixedRouteNotificationState.recentReservationIds.size > 0) ? (
          <Text style={styles.recentHint}>Mensagens recentes: abra os cards com selo nova para atualizar a conversa.</Text>
        ) : null}
        {activeReservations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="repeat-outline" size={42} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma Corrida Compartilhada ativa</Text>
            <Text style={styles.emptyText}>Cole um codigo KFR para ver horario, valor e vagas antes de confirmar.</Text>
          </View>
        ) : activeReservations.map(renderReservation)}

        {closedReservations.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Encerradas</Text>
            <Text style={styles.helperText}>Rotas encerradas ficam disponíveis apenas para consulta do histórico.</Text>
            {closedReservations.map(renderReservation)}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ icon, label, value }: { icon: IoniconName; label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={16} color={COLORS.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: COLORS.textSecondary, marginTop: 10 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  helperText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  recentHint: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginBottom: 10 },


  inviteBox: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginBottom: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, color: COLORS.textPrimary, backgroundColor: COLORS.background },
  secondaryBtn: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: COLORS.primary, fontWeight: '800' },
  secondaryBtnInline: { marginTop: 10, minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  previewBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  previewEyebrow: { color: COLORS.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  previewTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900', marginTop: 3 },
  previewText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  description: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
  consentBox: { marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, padding: 10 },
  consentTitle: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 13 },
  consentText: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 5 },

  primaryBtn: { marginTop: 12, minHeight: 44, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: COLORS.textDark, fontSize: 14, fontWeight: '900' },
  disabledBtn: { opacity: 0.65 },

  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  routePath: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusActive: { backgroundColor: 'rgba(46, 204, 113, 0.18)' },
  statusMuted: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  statusText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '800' },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  infoItem: { width: '48%', minHeight: 58, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 9, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  infoLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  infoValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 2 },

  cancelBtn: { marginTop: 12, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(231, 76, 60, 0.4)', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: COLORS.danger, fontSize: 13, fontWeight: '800' },

  messagesBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  closedBanner: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 15, 0.5)',
    borderRadius: 10,
    backgroundColor: 'rgba(241, 196, 15, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  closedBannerText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700', flex: 1 },
  bubble: { borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1 },
  bubbleOwn: { backgroundColor: 'rgba(184, 148, 46, 0.16)', borderColor: 'rgba(184, 148, 46, 0.38)' },
  bubbleOther: { backgroundColor: COLORS.background, borderColor: COLORS.border },
  bubbleLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  bubbleText: { color: COLORS.textPrimary, fontSize: 13, marginTop: 3 },
  quickChipsRow: { gap: 8, paddingBottom: 6 },
  quickChip: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, paddingHorizontal: 10, paddingVertical: 7 },
  quickChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  quickChipTextActive: { color: COLORS.textDark },
  messageInput: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    marginBottom: 8,
  },

  emptyCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 22, marginTop: 4 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 6 },
});
