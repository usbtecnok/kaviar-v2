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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../src/config/colors';
import { passengerApi, FixedRouteInvitePreview, FixedRouteReservation } from '../../src/api/passenger.api';
import { normalizeFixedRouteInviteCode } from '../../src/utils/groupInviteDeepLink';

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

export default function PassengerFixedRoutesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ inviteCode?: string }>();
  const normalizedParamCode = useMemo(() => normalizeFixedRouteInviteCode(params?.inviteCode), [params?.inviteCode]);
  const lastAutoFilledCode = useRef('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<FixedRouteInvitePreview | null>(null);
  const [reservations, setReservations] = useState<FixedRouteReservation[]>([]);

  const loadReservations = useCallback(async () => {
    try {
      const data = await passengerApi.getMyFixedRouteReservations();
      setReservations(data);
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Não foi possível carregar suas Rotas Fixas.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

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

  const onRefresh = () => {
    setRefreshing(true);
    loadReservations();
  };

  const checkInvite = async (explicitCode?: string) => {
    const normalized = normalizeFixedRouteInviteCode(explicitCode || code);
    if (!normalized) {
      Alert.alert('Código obrigatório', 'Digite um código KFR de Rota Fixa.');
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
      Alert.alert('Convite', getErrorMessage(error, 'Convite de Rota Fixa não encontrado.'));
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
      Alert.alert('Vaga reservada', 'Sua vaga foi reservada. A ida e a volta estão programadas conforme os horários da rota.');
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
    Alert.alert('Cancelar reserva', 'Deseja cancelar sua vaga reservada nesta Rota Fixa?', [
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

  const renderPreview = () => {
    if (!preview) return null;

    return (
      <View style={styles.previewBox}>
        <Text style={styles.previewEyebrow}>Rota Fixa KAVIAR</Text>
        <Text style={styles.previewTitle}>{preview.title || 'Rota com horário combinado'}</Text>
        <Text style={styles.previewText}>Você foi convidado para reservar uma vaga em uma rota com horário combinado.</Text>
        <Text style={styles.previewText}>A vaga só fica reservada quando você confirma pelo KAVIAR.</Text>

        <View style={styles.infoGrid}>
          <Info icon="person-outline" label="Motorista" value={preview.driver?.first_name || 'Motorista KAVIAR'} />
          <Info icon="location-outline" label="Origem" value={preview.origin_label} />
          <Info icon="flag-outline" label="Destino" value={preview.destination_label} />
          <Info icon="calendar-outline" label="Dias" value={formatDays(preview.days_of_week)} />
          <Info icon="arrow-up-circle-outline" label="Ida" value={preview.departure_time} />
          <Info icon="arrow-down-circle-outline" label="Volta" value={preview.return_time} />
          <Info icon="people-outline" label="Vagas" value={`${preview.seats_available} disponíveis`} />
          <Info icon="cash-outline" label="Valor" value={formatMoney(preview.price_per_passenger_cents)} />
        </View>

        {!!preview.description && <Text style={styles.description}>{preview.description}</Text>}

        <View style={styles.consentBox}>
          <Text style={styles.consentTitle}>Ida e volta programadas</Text>
          <Text style={styles.consentText}>Confira horário, valor, origem, destino e vagas antes de confirmar. A volta é combinada com o motorista pela rota.</Text>
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
    const isConfirmed = reservation.status === 'confirmed';

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
          <Info icon="arrow-up-circle-outline" label="Ida" value={route.departure_time} />
          <Info icon="arrow-down-circle-outline" label="Volta" value={route.return_time} />
          <Info icon="cash-outline" label="Valor" value={formatMoney(reservation.price_cents)} />
          <Info icon="checkmark-circle-outline" label="Reserva" value="Ida e volta programadas" />
        </View>

        {isConfirmed && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelReservation(reservation)} disabled={cancellingId === reservation.id}>
            {cancellingId === reservation.id ? <ActivityIndicator color={COLORS.danger} /> : <Text style={styles.cancelBtnText}>Cancelar reserva</Text>}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando Rotas Fixas...</Text>
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
        <Text style={styles.title}>Minhas Rotas Fixas</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.inviteBox}>
          <Text style={styles.sectionTitle}>Rota Fixa KAVIAR</Text>
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

        <Text style={styles.sectionTitle}>Suas reservas</Text>
        {reservations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="repeat-outline" size={42} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma Rota Fixa reservada</Text>
            <Text style={styles.emptyText}>Cole um codigo KFR para ver horario, valor e vagas antes de confirmar.</Text>
          </View>
        ) : reservations.map(renderReservation)}
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

  inviteBox: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginBottom: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, color: COLORS.textPrimary, backgroundColor: COLORS.background },
  secondaryBtn: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: COLORS.primary, fontWeight: '800' },

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

  emptyCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 22, marginTop: 4 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 6 },
});
