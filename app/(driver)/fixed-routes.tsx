import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
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
import {
  driverApi,
  DriverFixedRoute,
  DriverFixedRoutePayload,
  DriverFixedRouteReservation,
  FixedRouteMessage,
} from '../../src/api/driver.api';

const DAY_OPTIONS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
  { value: 7, label: 'Dom' },
];

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  cancelled: 'Cancelada',
  archived: 'Arquivada',
};

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmada',
  cancelled_by_passenger: 'Cancelada pelo passageiro',
  cancelled_by_driver: 'Cancelada pelo motorista',
  completed: 'Concluida',
  no_show: 'Ausente',
};

const TRIP_TYPE_OPTIONS = [
  { value: 'one_way_outbound', label: 'So ida' },
  { value: 'one_way_return', label: 'So volta' },
  { value: 'round_trip', label: 'Ida e volta' },
] as const;

const DRIVER_ROUTE_QUICK_MESSAGES = [
  { code: 'LEAVING_SOON', text: 'Vou sair em 10 minutos.' },
  { code: 'AT_MEETING_POINT', text: 'Estou no ponto combinado.' },
  { code: 'ROUTE_CONFIRMED_TODAY', text: 'A rota de hoje está mantida.' },
  { code: 'RETURN_TIME_UPDATED', text: 'O horário da volta foi atualizado.' },
  { code: 'WAITING_PASSENGERS', text: 'Estou aguardando os passageiros confirmados.' },
];

const DRIVER_RESERVATION_QUICK_MESSAGES = [
  { code: 'I_AM_WAITING', text: 'Estou aguardando no ponto combinado.' },
  { code: 'PLEASE_CONFIRM', text: 'Pode confirmar se você vai hoje?' },
  { code: 'RUNNING_LATE_DRIVER', text: 'Estou com alguns minutos de atraso.' },
];

type TripType = typeof TRIP_TYPE_OPTIONS[number]['value'];

const PUBLIC_FIXED_ROUTE_URL = 'https://kaviar.com.br/rotas-fixas';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type ApiError = { response?: { data?: { error?: string } }; message?: string };

function emptyForm() {
  return {
    title: '',
    trip_type: 'round_trip' as TripType,
    origin_label: '',
    destination_label: '',
    departure_time: '',
    return_time: '',
    seats_total: '1',
    price: '',
    description: '',
    days_of_week: [1, 2, 3, 4, 5],
  };
}

function formatMoney(cents?: number | null) {
  const value = Number(cents || 0) / 100;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseMoneyToCents(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function formatDays(days: number[] = []) {
  if (!Array.isArray(days) || days.length === 0) return '-';
  return days
    .map((day) => DAY_OPTIONS.find((item) => item.value === day)?.label || String(day))
    .join(', ');
}

function tripTypeLabel(tripType?: string | null) {
  if (tripType === 'one_way_outbound') return 'So ida';
  if (tripType === 'one_way_return') return 'So volta';
  return 'Ida e volta';
}

function scheduleLabel(route: DriverFixedRoute) {
  if (route.trip_type === 'one_way_outbound') return `Ida programada: ${route.departure_time || '-'}`;
  if (route.trip_type === 'one_way_return') return `Volta programada: ${route.return_time || '-'}`;
  return `Ida: ${route.departure_time || '-'} · Volta: ${route.return_time || '-'}`;
}

function feePercent(route: DriverFixedRoute) {
  const parsed = Number(route.kaviar_fee_percent || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.error || apiError.message || fallback;
}

function getFixedRouteNotificationState() {
  return (globalThis as any).__kaviarFixedRouteNotificationState || ((globalThis as any).__kaviarFixedRouteNotificationState = {
    recentRouteIds: new Set<string>(),
    recentReservationIds: new Set<string>(),
    seenMessageIds: new Set<string>(),
  });
}

export default function DriverFixedRoutesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ routeId?: string; reservationId?: string }>();
  const handledNotificationOpenRef = useRef('');
  const fixedRouteNotificationState = getFixedRouteNotificationState();
  const [, setNotificationTick] = useState(0);
  const [routes, setRoutes] = useState<DriverFixedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [reservationsByRoute, setReservationsByRoute] = useState<Record<string, DriverFixedRouteReservation[]>>({});
  const [loadingReservations, setLoadingReservations] = useState<Record<string, boolean>>({});
  const [routeMessagesByRoute, setRouteMessagesByRoute] = useState<Record<string, FixedRouteMessage[]>>({});
  const [loadingRouteMessages, setLoadingRouteMessages] = useState<Record<string, boolean>>({});
  const [routeQuickCodeByRoute, setRouteQuickCodeByRoute] = useState<Record<string, string>>({});
  const [routeTextByRoute, setRouteTextByRoute] = useState<Record<string, string>>({});
  const [openRouteComposer, setOpenRouteComposer] = useState<Record<string, boolean>>({});
  const [reservationMessagesById, setReservationMessagesById] = useState<Record<string, FixedRouteMessage[]>>({});
  const [loadingReservationMessages, setLoadingReservationMessages] = useState<Record<string, boolean>>({});
  const [openReservationComposer, setOpenReservationComposer] = useState<Record<string, boolean>>({});
  const [reservationQuickCodeById, setReservationQuickCodeById] = useState<Record<string, string>>({});
  const [reservationTextById, setReservationTextById] = useState<Record<string, string>>({});

  const loadRoutes = useCallback(async () => {
    try {
      const data = await driverApi.getFixedRoutes();
      setRoutes(data);
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel carregar suas Rotas Fixas.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  useEffect(() => {
    const routeId = typeof params.routeId === 'string' ? params.routeId : '';
    const reservationId = typeof params.reservationId === 'string' ? params.reservationId : '';
    if (!routeId) return;

    const key = `${routeId}:${reservationId}`;
    if (handledNotificationOpenRef.current === key) return;

    const route = routes.find((item) => item.id === routeId);
    if (!route) return;

    handledNotificationOpenRef.current = key;

    (async () => {
      try {
        if (!routeMessagesByRoute[route.id]) {
          const data = await driverApi.getFixedRouteMessages(route.id);
          setRouteMessagesByRoute((current) => ({ ...current, [route.id]: data }));
        }
        setOpenRouteComposer((current) => ({ ...current, [route.id]: true }));
        fixedRouteNotificationState.recentRouteIds.delete(route.id);

        if (reservationId) {
          if (!reservationsByRoute[route.id]) {
            const reservations = await driverApi.getFixedRouteReservations(route.id);
            setReservationsByRoute((current) => ({ ...current, [route.id]: reservations }));
          }
          const reservationData = await driverApi.getFixedRouteReservationMessages(route.id, reservationId);
          setReservationMessagesById((current) => ({ ...current, [reservationId]: reservationData.messages || [] }));
          setOpenReservationComposer((current) => ({ ...current, [reservationId]: true }));
          fixedRouteNotificationState.recentReservationIds.delete(reservationId);
        }
      } catch {
        // Keep the screen resilient if opening context from notification fails.
      } finally {
        setNotificationTick((current) => current + 1);
      }
    })();
  }, [
    params.routeId,
    params.reservationId,
    routes,
    routeMessagesByRoute,
    reservationsByRoute,
    fixedRouteNotificationState,
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRoutes();
  };

  const selectedDays = useMemo(() => new Set(form.days_of_week), [form.days_of_week]);

  const updateForm = (key: keyof ReturnType<typeof emptyForm>, value: string | number[]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleDay = (day: number) => {
    setForm((current) => {
      const currentDays = new Set(current.days_of_week);
      if (currentDays.has(day)) currentDays.delete(day);
      else currentDays.add(day);
      return { ...current, days_of_week: Array.from(currentDays).sort((a, b) => a - b) };
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRouteId(null);
    setForm(emptyForm());
  };

  const startEdit = (route: DriverFixedRoute) => {
    setEditingRouteId(route.id);
    setForm({
      title: route.title || '',
      trip_type: (route.trip_type || 'round_trip') as TripType,
      origin_label: route.origin_label || '',
      destination_label: route.destination_label || '',
      departure_time: route.departure_time || '',
      return_time: route.return_time || '',
      seats_total: String(route.seats_total || 1),
      price: (Number(route.price_per_passenger_cents || 0) / 100).toFixed(2).replace('.', ','),
      description: route.description || '',
      days_of_week: Array.isArray(route.days_of_week) ? route.days_of_week : [],
    });
    setShowForm(true);
  };

  const buildPayload = (): DriverFixedRoutePayload | null => {
    const price = parseMoneyToCents(form.price);
    const seats = Number(form.seats_total);
    const departure = form.departure_time.trim();
    const returnTime = form.return_time.trim();
    const payload: DriverFixedRoutePayload = {
      title: form.title.trim(),
      trip_type: form.trip_type,
      origin_label: form.origin_label.trim(),
      destination_label: form.destination_label.trim(),
      departure_time: form.trip_type === 'one_way_return' ? null : departure,
      return_time: form.trip_type === 'one_way_outbound' ? null : returnTime,
      days_of_week: form.days_of_week,
      seats_total: seats,
      price_per_passenger_cents: price,
      description: form.description.trim() || null,
    };

    if (!payload.title || !payload.origin_label || !payload.destination_label) {
      Alert.alert('Dados obrigatorios', 'Informe titulo, origem geral e destino geral.');
      return null;
    }

    if (payload.trip_type === 'round_trip') {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(departure) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(returnTime)) {
        Alert.alert('Horario invalido', 'Use o formato HH:mm para ida e volta.');
        return null;
      }
    }
    if (payload.trip_type === 'one_way_outbound') {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(departure)) {
        Alert.alert('Horario invalido', 'Use o formato HH:mm para a ida.');
        return null;
      }
    }
    if (payload.trip_type === 'one_way_return') {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(returnTime)) {
        Alert.alert('Horario invalido', 'Use o formato HH:mm para a volta.');
        return null;
      }
    }

    if (payload.days_of_week.length === 0) {
      Alert.alert('Dias da semana', 'Escolha pelo menos um dia da semana.');
      return null;
    }
    if (!Number.isInteger(seats) || seats < 1 || seats > 4) {
      Alert.alert('Vagas invalidas', 'Informe de 1 a 4 vagas.');
      return null;
    }
    if (price <= 0) {
      Alert.alert('Valor invalido', 'Informe o valor por passageiro.');
      return null;
    }
    return payload;
  };

  const saveRoute = async () => {
    const payload = buildPayload();
    if (!payload || saving) return;
    try {
      setSaving(true);
      if (editingRouteId) {
        const updated = await driverApi.updateFixedRoute(editingRouteId, payload);
        closeForm();
        await loadRoutes();
        Alert.alert('Rota atualizada', `A rota ${updated.invite_code} foi atualizada.`);
      } else {
        const created = await driverApi.createFixedRoute(payload);
        closeForm();
        await loadRoutes();
        Alert.alert('Rota criada', `Convite ${created.invite_code} criado. Envie este codigo para o passageiro reservar pelo KAVIAR.`);
      }
    } catch (error: unknown) {
      Alert.alert(editingRouteId ? 'Erro ao atualizar' : 'Erro ao criar', getErrorMessage(error, 'Nao foi possivel salvar a Rota Fixa.'));
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = (route: DriverFixedRoute) => {
    const message = `${PUBLIC_FIXED_ROUTE_URL}/${route.invite_code}\nCodigo: ${route.invite_code}`;
    Clipboard.setString(message);
    Alert.alert('Convite copiado', 'Envie este codigo para o passageiro reservar pelo KAVIAR.');
  };

  const pauseRoute = (route: DriverFixedRoute) => {
    Alert.alert('Pausar rota', 'A rota pausada nao aceita novas reservas ate ser editada ou reativada em uma proxima versao.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Pausar',
        style: 'destructive',
        onPress: async () => {
          try {
            await driverApi.pauseFixedRoute(route.id);
            await loadRoutes();
          } catch (error: unknown) {
            Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel pausar a rota.'));
          }
        },
      },
    ]);
  };

  const cancelRoute = (route: DriverFixedRoute) => {
    Alert.alert('Cancelar rota', 'A rota cancelada deixa de aceitar reservas. Esta acao nao deve ser usada para ajustes simples.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar rota',
        style: 'destructive',
        onPress: async () => {
          try {
            await driverApi.cancelFixedRoute(route.id);
            await loadRoutes();
          } catch (error: unknown) {
            Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel cancelar a rota.'));
          }
        },
      },
    ]);
  };

  const reactivateRoute = async (route: DriverFixedRoute) => {
    try {
      await driverApi.reactivateFixedRoute(route.id);
      await loadRoutes();
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel reativar a rota.'));
    }
  };

  const archiveRoute = (route: DriverFixedRoute) => {
    Alert.alert('Arquivar rota', 'A rota arquivada sai da lista principal e nao aceita novas reservas.', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Arquivar',
        style: 'destructive',
        onPress: async () => {
          try {
            await driverApi.archiveFixedRoute(route.id);
            await loadRoutes();
          } catch (error: unknown) {
            Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel arquivar a rota.'));
          }
        },
      },
    ]);
  };

  const loadReservations = async (route: DriverFixedRoute) => {
    if (reservationsByRoute[route.id]) {
      setReservationsByRoute((current) => {
        const next = { ...current };
        delete next[route.id];
        return next;
      });
      return;
    }
    try {
      setLoadingReservations((current) => ({ ...current, [route.id]: true }));
      const data = await driverApi.getFixedRouteReservations(route.id);
      setReservationsByRoute((current) => ({ ...current, [route.id]: data }));
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel carregar as reservas.'));
    } finally {
      setLoadingReservations((current) => ({ ...current, [route.id]: false }));
    }
  };

  const updateReservationStatus = async (route: DriverFixedRoute, reservation: DriverFixedRouteReservation, status: string) => {
    try {
      const updated = await driverApi.updateFixedRouteReservationStatus(route.id, reservation.id, status);
      setReservationsByRoute((current) => ({
        ...current,
        [route.id]: (current[route.id] || []).map((item) => item.id === updated.id ? { ...item, ...updated } : item),
      }));
      await loadRoutes();
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel atualizar a reserva.'));
    }
  };

  const toggleRouteMessages = async (route: DriverFixedRoute) => {
    fixedRouteNotificationState.recentRouteIds.delete(route.id);
    setNotificationTick((current) => current + 1);
    if (routeMessagesByRoute[route.id]) {
      setRouteMessagesByRoute((current) => {
        const next = { ...current };
        delete next[route.id];
        return next;
      });
      setOpenRouteComposer((current) => ({ ...current, [route.id]: false }));
      return;
    }
    try {
      setLoadingRouteMessages((current) => ({ ...current, [route.id]: true }));
      const data = await driverApi.getFixedRouteMessages(route.id);
      setRouteMessagesByRoute((current) => ({ ...current, [route.id]: data }));
      setOpenRouteComposer((current) => ({ ...current, [route.id]: true }));
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel carregar avisos da rota.'));
    } finally {
      setLoadingRouteMessages((current) => ({ ...current, [route.id]: false }));
    }
  };

  const sendRouteMessage = async (route: DriverFixedRoute) => {
    const message_code = routeQuickCodeByRoute[route.id] || undefined;
    const message_text = (routeTextByRoute[route.id] || '').trim() || undefined;

    if (!message_code && !message_text) {
      Alert.alert('Mensagem', 'Selecione uma mensagem rapida ou escreva uma mensagem personalizada.');
      return;
    }

    try {
      await driverApi.sendFixedRouteBroadcastMessage(route.id, { message_code, message_text });
      const refreshed = await driverApi.getFixedRouteMessages(route.id);
      setRouteMessagesByRoute((current) => ({ ...current, [route.id]: refreshed }));
      setRouteTextByRoute((current) => ({ ...current, [route.id]: '' }));
      Alert.alert('Aviso enviado', 'Seu aviso foi enviado para os passageiros confirmados.');
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel enviar o aviso.'));
    }
  };

  const toggleReservationMessages = async (route: DriverFixedRoute, reservation: DriverFixedRouteReservation) => {
    fixedRouteNotificationState.recentReservationIds.delete(reservation.id);
    fixedRouteNotificationState.recentRouteIds.delete(route.id);
    setNotificationTick((current) => current + 1);
    if (reservationMessagesById[reservation.id]) {
      setReservationMessagesById((current) => {
        const next = { ...current };
        delete next[reservation.id];
        return next;
      });
      setOpenReservationComposer((current) => ({ ...current, [reservation.id]: false }));
      return;
    }
    try {
      setLoadingReservationMessages((current) => ({ ...current, [reservation.id]: true }));
      const data = await driverApi.getFixedRouteReservationMessages(route.id, reservation.id);
      setReservationMessagesById((current) => ({ ...current, [reservation.id]: data.messages || [] }));
      setOpenReservationComposer((current) => ({ ...current, [reservation.id]: true }));
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel carregar mensagens da reserva.'));
    } finally {
      setLoadingReservationMessages((current) => ({ ...current, [reservation.id]: false }));
    }
  };

  const sendReservationMessage = async (route: DriverFixedRoute, reservation: DriverFixedRouteReservation) => {
    const message_code = reservationQuickCodeById[reservation.id] || undefined;
    const message_text = (reservationTextById[reservation.id] || '').trim() || undefined;

    if (!message_code && !message_text) {
      Alert.alert('Mensagem', 'Selecione uma mensagem rapida ou escreva uma mensagem personalizada.');
      return;
    }

    try {
      await driverApi.sendFixedRouteReservationMessage(route.id, reservation.id, { message_code, message_text });
      const refreshed = await driverApi.getFixedRouteReservationMessages(route.id, reservation.id);
      setReservationMessagesById((current) => ({ ...current, [reservation.id]: refreshed.messages || [] }));
      setReservationTextById((current) => ({ ...current, [reservation.id]: '' }));
    } catch (error: unknown) {
      Alert.alert('Erro', getErrorMessage(error, 'Nao foi possivel enviar mensagem para a reserva.'));
    }
  };

  const renderForm = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{editingRouteId ? 'Editar Rota Fixa' : 'Nova Rota Fixa'}</Text>
      <Text style={styles.helperText}>Crie uma rota para passageiros que fazem o mesmo caminho que voce. A vaga so fica reservada quando o passageiro confirma pelo KAVIAR.</Text>

      <Input label="Titulo da rota" value={form.title} onChangeText={(value) => updateForm('title', value)} placeholder="Ex: Barra - Centro de manha" />
      <Input label="Origem geral" value={form.origin_label} onChangeText={(value) => updateForm('origin_label', value)} placeholder="Bairro ou ponto de referencia" />
      <Input label="Destino geral" value={form.destination_label} onChangeText={(value) => updateForm('destination_label', value)} placeholder="Regiao de destino" />

      <Text style={styles.label}>Tipo de rota</Text>
      <View style={styles.tripTypeRow}>
        {TRIP_TYPE_OPTIONS.map((option) => {
          const selected = form.trip_type === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.tripTypeChip, selected && styles.tripTypeChipActive]}
              onPress={() => updateForm('trip_type', option.value)}
            >
              <Text style={[styles.tripTypeChipText, selected && styles.tripTypeChipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.twoColumns}>
        {form.trip_type !== 'one_way_return' && (
          <Input label="Horario de ida" value={form.departure_time} onChangeText={(value) => updateForm('departure_time', value)} placeholder="07:30" keyboardType="numbers-and-punctuation" half />
        )}
        {form.trip_type !== 'one_way_outbound' && (
          <Input label="Horario de volta" value={form.return_time} onChangeText={(value) => updateForm('return_time', value)} placeholder="18:10" keyboardType="numbers-and-punctuation" half />
        )}
      </View>

      <Text style={styles.label}>Dias da semana</Text>
      <View style={styles.daysRow}>
        {DAY_OPTIONS.map((day) => {
          const active = selectedDays.has(day.value);
          return (
            <TouchableOpacity key={day.value} style={[styles.dayChip, active && styles.dayChipActive]} onPress={() => toggleDay(day.value)}>
              <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.twoColumns}>
        <Input label="Vagas" value={form.seats_total} onChangeText={(value) => updateForm('seats_total', value.replace(/[^1-4]/g, '').slice(0, 1))} placeholder="1" keyboardType="number-pad" half />
        <Input label="Valor por passageiro" value={form.price} onChangeText={(value) => updateForm('price', value)} placeholder="25,00" keyboardType="decimal-pad" half />
      </View>

      <Input label="Descricao/regras" value={form.description} onChangeText={(value) => updateForm('description', value)} placeholder="Ponto de encontro, tolerancia, combinados" multiline />

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={closeForm} disabled={saving}>
          <Text style={styles.secondaryButtonText}>Fechar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryButton, saving && styles.disabledButton]} onPress={saveRoute} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.textDark} /> : <Text style={styles.primaryButtonText}>{editingRouteId ? 'Salvar rota' : 'Criar rota'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReservations = (route: DriverFixedRoute) => {
    const reservations = reservationsByRoute[route.id];
    const loadingList = loadingReservations[route.id];
    if (loadingList) return <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />;
    if (!reservations) return null;
    if (reservations.length === 0) return <Text style={styles.emptyReservations}>Nenhuma reserva confirmada ou historica nesta rota.</Text>;

    return (
      <View style={styles.reservationsBox}>
        <Text style={styles.sectionTitle}>Reservas</Text>
        {reservations.map((reservation) => (
          <View key={reservation.id} style={styles.reservationItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reservationName}>{reservation.passenger?.name || 'Passageiro'}</Text>
              <Text style={styles.metaText}>{RESERVATION_STATUS_LABELS[reservation.status] || reservation.status} • {formatMoney(reservation.price_cents)}</Text>
              <Text style={styles.metaText}>Liquido estimado: {formatMoney(reservation.driver_net_cents)}</Text>
            </View>
            {reservation.status === 'confirmed' && (
              <View style={styles.reservationActions}>
                <TouchableOpacity style={styles.smallAction} onPress={() => updateReservationStatus(route, reservation, 'completed')}>
                  <Text style={styles.smallActionText}>Concluir</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallAction} onPress={() => updateReservationStatus(route, reservation, 'no_show')}>
                  <Text style={styles.smallActionText}>Ausente</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallAction, styles.smallDangerAction]} onPress={() => updateReservationStatus(route, reservation, 'cancelled_by_driver')}>
                  <Text style={styles.smallDangerText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={[styles.smallAction, { marginTop: 8, alignSelf: 'flex-start' }]} onPress={() => toggleReservationMessages(route, reservation)}>
              <Text style={styles.smallActionText}>
                {reservationMessagesById[reservation.id]
                  ? 'Ocultar mensagens'
                  : fixedRouteNotificationState.recentReservationIds.has(reservation.id)
                    ? 'Mensagem • nova'
                    : 'Mensagem'}
              </Text>
            </TouchableOpacity>

            {loadingReservationMessages[reservation.id] ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} /> : null}

            {reservationMessagesById[reservation.id] ? (
              <View style={styles.messagesBox}>
                {(reservationMessagesById[reservation.id] || []).map((msg) => {
                  const isOwn = msg.sender_type === 'DRIVER';
                  return (
                    <View key={msg.id} style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                      <Text style={styles.bubbleLabel}>{isOwn ? 'Voce' : 'Passageiro'}</Text>
                      <Text style={styles.bubbleText}>{msg.message_text}</Text>
                    </View>
                  );
                })}

                {openReservationComposer[reservation.id] ? (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsRow}>
                      {DRIVER_RESERVATION_QUICK_MESSAGES.map((option) => {
                        const selected = reservationQuickCodeById[reservation.id] === option.code;
                        return (
                          <TouchableOpacity
                            key={option.code}
                            style={[styles.quickChip, selected && styles.quickChipActive]}
                            onPress={() => setReservationQuickCodeById((current) => ({ ...current, [reservation.id]: selected ? '' : option.code }))}
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
                      value={reservationTextById[reservation.id] || ''}
                      onChangeText={(value) => setReservationTextById((current) => ({ ...current, [reservation.id]: value.slice(0, 500) }))}
                    />
                    <TouchableOpacity style={styles.outlineButton} onPress={() => sendReservationMessage(route, reservation)}>
                      <Text style={styles.outlineButtonText}>Enviar mensagem</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  const renderRoute = (route: DriverFixedRoute) => {
    const percent = feePercent(route);
    const feeCents = Math.round(route.price_per_passenger_cents * percent / 100);
    const driverNetCents = route.price_per_passenger_cents - feeCents;
    const canEdit = route.status === 'active' || route.status === 'paused';
    const canReactivate = route.status === 'paused' || route.status === 'cancelled';
    const canArchive = route.status === 'paused' || route.status === 'cancelled';

    return (
      <View key={route.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.routeTitle}>{route.title}</Text>
            <Text style={styles.routePath}>{route.origin_label} → {route.destination_label}</Text>
          </View>
          <View style={[styles.statusPill, route.status === 'active' ? styles.statusActive : styles.statusMuted]}>
            <Text style={styles.statusText}>{STATUS_LABELS[route.status] || route.status}</Text>
          </View>
        </View>

        {route.description ? <Text style={styles.description}>{route.description}</Text> : null}

        <View style={styles.infoGrid}>
          <Info label="Dias" value={formatDays(route.days_of_week)} icon="calendar-outline" />
          <Info label="Tipo" value={tripTypeLabel(route.trip_type)} icon="swap-horizontal-outline" />
          <Info label="Horario" value={scheduleLabel(route)} icon="time-outline" />
          <Info label="Vagas" value={`${route.seats_available ?? '-'} de ${route.seats_total}`} icon="person-outline" />
          <Info label="Valor" value={formatMoney(route.price_per_passenger_cents)} icon="cash-outline" />
          <Info label="Taxa KAVIAR" value={percent ? `${percent}% (${formatMoney(feeCents)})` : '-'} icon="receipt-outline" />
        </View>

        <View style={styles.netBox}>
          <Text style={styles.netLabel}>Liquido estimado por passageiro</Text>
          <Text style={styles.netValue}>{formatMoney(driverNetCents)}</Text>
        </View>

        <View style={styles.inviteBox}>
          <Text style={styles.inviteLabel}>Convite KFR</Text>
          <Text style={styles.inviteCode}>{route.invite_code}</Text>
          <Text style={styles.inviteHelp}>Envie este codigo para o passageiro reservar pelo KAVIAR.</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => copyInvite(route)}>
            <Ionicons name="copy-outline" size={16} color={COLORS.textDark} />
            <Text style={styles.actionButtonText}>Copiar convite</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineButton} onPress={() => loadReservations(route)}>
            <Ionicons name="people-outline" size={16} color={COLORS.primary} />
            <Text style={styles.outlineButtonText}>{reservationsByRoute[route.id] ? 'Ocultar reservas' : 'Ver reservas'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineButton} onPress={() => toggleRouteMessages(route)}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.primary} />
            <Text style={styles.outlineButtonText}>
              {routeMessagesByRoute[route.id]
                ? 'Ocultar avisos'
                : fixedRouteNotificationState.recentRouteIds.has(route.id)
                  ? 'Avisos da rota • recente'
                  : 'Avisos da rota'}
            </Text>
          </TouchableOpacity>
        </View>

        {loadingRouteMessages[route.id] ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} /> : null}

        {routeMessagesByRoute[route.id] ? (
          <View style={styles.messagesBox}>
            <Text style={styles.sectionTitle}>Avisos da rota</Text>
            {(routeMessagesByRoute[route.id] || []).map((msg) => (
              <View key={msg.id} style={[styles.bubble, styles.bubbleOwn]}>
                <Text style={styles.bubbleLabel}>Aviso para todos</Text>
                <Text style={styles.bubbleText}>{msg.message_text}</Text>
              </View>
            ))}

            {openRouteComposer[route.id] ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsRow}>
                  {DRIVER_ROUTE_QUICK_MESSAGES.map((option) => {
                    const selected = routeQuickCodeByRoute[route.id] === option.code;
                    return (
                      <TouchableOpacity
                        key={option.code}
                        style={[styles.quickChip, selected && styles.quickChipActive]}
                        onPress={() => setRouteQuickCodeByRoute((current) => ({ ...current, [route.id]: selected ? '' : option.code }))}
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
                  value={routeTextByRoute[route.id] || ''}
                  onChangeText={(value) => setRouteTextByRoute((current) => ({ ...current, [route.id]: value.slice(0, 500) }))}
                />
                <TouchableOpacity style={styles.outlineButton} onPress={() => sendRouteMessage(route)}>
                  <Text style={styles.outlineButtonText}>Enviar aviso</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ) : null}

        {route.status !== 'archived' && (
          <>
            <View style={styles.actionRow}>
              {canEdit && (
                <TouchableOpacity style={styles.outlineButton} onPress={() => startEdit(route)}>
                  <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.outlineButtonText}>Editar</Text>
                </TouchableOpacity>
              )}
              {route.status === 'active' && (
                <TouchableOpacity style={styles.outlineButton} onPress={() => pauseRoute(route)}>
                  <Ionicons name="pause-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.outlineButtonText}>Pausar</Text>
                </TouchableOpacity>
              )}
              {canReactivate && (
                <TouchableOpacity style={styles.outlineButton} onPress={() => reactivateRoute(route)}>
                  <Ionicons name="play-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.outlineButtonText}>Reativar</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.actionRow}>
              {route.status !== 'cancelled' && (
                <TouchableOpacity style={styles.dangerButton} onPress={() => cancelRoute(route)}>
                  <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.dangerButtonText}>Cancelar rota</Text>
                </TouchableOpacity>
              )}
              {canArchive && (
                <TouchableOpacity style={styles.dangerButton} onPress={() => archiveRoute(route)}>
                  <Ionicons name="archive-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.dangerButtonText}>Excluir/Arquivar</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {renderReservations(route)}
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Minhas Rotas Fixas</Text>
        <TouchableOpacity onPress={() => showForm ? closeForm() : setShowForm(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name={showForm ? 'close-outline' : 'add-circle-outline'} size={26} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroBox}>
          <Text style={styles.heroTitle}>KAVIAR Rotas Fixas</Text>
          <Text style={styles.heroText}>Organize rotas com horario combinado, vaga reservada e valor por passageiro.</Text>
          {(fixedRouteNotificationState.recentRouteIds.size > 0 || fixedRouteNotificationState.recentReservationIds.size > 0) ? (
            <Text style={styles.heroRecentText}>Mensagens recentes: abra os avisos da rota ou conversas com selo novo.</Text>
          ) : null}
        </View>

        {showForm ? renderForm() : (
          <TouchableOpacity style={styles.createButton} onPress={() => setShowForm(true)}>
            <Ionicons name="add-circle-outline" size={19} color={COLORS.textDark} />
            <Text style={styles.createButtonText}>Criar Rota Fixa</Text>
          </TouchableOpacity>
        )}

        {routes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="repeat-outline" size={42} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma Rota Fixa criada</Text>
            <Text style={styles.emptyText}>Crie uma rota para convidar passageiros que fazem o mesmo caminho que voce.</Text>
          </View>
        ) : routes.map(renderRoute)}
      </ScrollView>
    </SafeAreaView>
  );
}

function Input({ label, half, ...props }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numbers-and-punctuation';
  multiline?: boolean;
  half?: boolean;
}) {
  return (
    <View style={[styles.inputWrap, half && styles.inputHalf]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, props.multiline && styles.textarea]}
        placeholderTextColor={COLORS.textMuted}
        multiline={props.multiline}
      />
    </View>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: IoniconName }) {
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
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  content: { paddingHorizontal: 16, paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: COLORS.textSecondary, marginTop: 10 },

  heroBox: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 12 },
  heroTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  heroText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  heroRecentText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginTop: 8 },

  createButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
  createButtonText: { color: COLORS.textDark, fontSize: 14, fontWeight: '800' },

  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  routeTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  routePath: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  description: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
  helperText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },

  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusActive: { backgroundColor: 'rgba(42, 184, 106, 0.18)' },
  statusMuted: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  statusText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '800' },

  inputWrap: { marginBottom: 12 },
  inputHalf: { flex: 1 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { minHeight: 44, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, color: COLORS.textPrimary, fontSize: 14 },
  textarea: { minHeight: 82, paddingTop: 10, textAlignVertical: 'top' },
  twoColumns: { flexDirection: 'row', gap: 10 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tripTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tripTypeChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  tripTypeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tripTypeChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  tripTypeChipTextActive: { color: COLORS.textDark },
  dayChip: { minWidth: 43, alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  dayChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  dayChipTextActive: { color: COLORS.textDark },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },

  primaryButton: { flex: 1, minHeight: 44, backgroundColor: COLORS.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: COLORS.textDark, fontSize: 14, fontWeight: '800' },
  secondaryButton: { flex: 1, minHeight: 44, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  disabledButton: { opacity: 0.65 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  infoItem: { width: '48%', minHeight: 58, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 9, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  infoLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  infoValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 2 },

  netBox: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: 'rgba(42, 184, 106, 0.12)', borderWidth: 1, borderColor: 'rgba(42, 184, 106, 0.22)' },
  netLabel: { color: COLORS.textSecondary, fontSize: 12 },
  netValue: { color: COLORS.success, fontSize: 18, fontWeight: '900', marginTop: 2 },

  inviteBox: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  inviteLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  inviteCode: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900', marginTop: 3 },
  inviteHelp: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionButton: { flex: 1, minHeight: 40, backgroundColor: COLORS.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 8 },
  actionButtonText: { color: COLORS.textDark, fontSize: 12, fontWeight: '800' },
  outlineButton: { flex: 1, minHeight: 40, backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 8 },
  outlineButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  dangerButton: { flex: 1, minHeight: 40, backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.35)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 8 },
  dangerButtonText: { color: COLORS.danger, fontSize: 12, fontWeight: '800' },

  reservationsBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  reservationItem: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: COLORS.background },
  reservationName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  metaText: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  reservationActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  smallAction: { borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 7 },
  smallActionText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  smallDangerAction: { borderColor: 'rgba(239, 68, 68, 0.35)' },
  smallDangerText: { color: COLORS.danger, fontSize: 11, fontWeight: '800' },
  emptyReservations: { color: COLORS.textMuted, fontSize: 12, marginTop: 12 },

  messagesBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  bubble: { borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1 },
  bubbleOwn: { backgroundColor: 'rgba(184, 148, 46, 0.15)', borderColor: 'rgba(184, 148, 46, 0.35)' },
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
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: COLORS.textPrimary,
    fontSize: 13,
    marginBottom: 8,
  },

  emptyCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 22, marginTop: 4 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 6 },
});
