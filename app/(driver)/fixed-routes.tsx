import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/config/colors';
import {
  driverApi,
  DriverFixedRoute,
  DriverFixedRoutePayload,
  DriverFixedRouteReservation,
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

const PUBLIC_FIXED_ROUTE_URL = 'https://kaviar.com.br/rotas-fixas';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type ApiError = { response?: { data?: { error?: string } }; message?: string };

function emptyForm() {
  return {
    title: '',
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

function feePercent(route: DriverFixedRoute) {
  const parsed = Number(route.kaviar_fee_percent || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiError;
  return apiError.response?.data?.error || apiError.message || fallback;
}

export default function DriverFixedRoutesScreen() {
  const router = useRouter();
  const [routes, setRoutes] = useState<DriverFixedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [reservationsByRoute, setReservationsByRoute] = useState<Record<string, DriverFixedRouteReservation[]>>({});
  const [loadingReservations, setLoadingReservations] = useState<Record<string, boolean>>({});

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
    const payload: DriverFixedRoutePayload = {
      title: form.title.trim(),
      origin_label: form.origin_label.trim(),
      destination_label: form.destination_label.trim(),
      departure_time: form.departure_time.trim(),
      return_time: form.return_time.trim(),
      days_of_week: form.days_of_week,
      seats_total: seats,
      price_per_passenger_cents: price,
      description: form.description.trim() || null,
    };

    if (!payload.title || !payload.origin_label || !payload.destination_label) {
      Alert.alert('Dados obrigatorios', 'Informe titulo, origem geral e destino geral.');
      return null;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.departure_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.return_time)) {
      Alert.alert('Horario invalido', 'Use o formato HH:mm para ida e volta.');
      return null;
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

  const renderForm = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{editingRouteId ? 'Editar Rota Fixa' : 'Nova Rota Fixa'}</Text>
      <Text style={styles.helperText}>Crie uma rota para passageiros que fazem o mesmo caminho que voce. A vaga so fica reservada quando o passageiro confirma pelo KAVIAR.</Text>

      <Input label="Titulo da rota" value={form.title} onChangeText={(value) => updateForm('title', value)} placeholder="Ex: Barra - Centro de manha" />
      <Input label="Origem geral" value={form.origin_label} onChangeText={(value) => updateForm('origin_label', value)} placeholder="Bairro ou ponto de referencia" />
      <Input label="Destino geral" value={form.destination_label} onChangeText={(value) => updateForm('destination_label', value)} placeholder="Regiao de destino" />

      <View style={styles.twoColumns}>
        <Input label="Ida" value={form.departure_time} onChangeText={(value) => updateForm('departure_time', value)} placeholder="07:30" keyboardType="numbers-and-punctuation" half />
        <Input label="Volta" value={form.return_time} onChangeText={(value) => updateForm('return_time', value)} placeholder="18:10" keyboardType="numbers-and-punctuation" half />
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
          </View>
        ))}
      </View>
    );
  };

  const renderRoute = (route: DriverFixedRoute) => {
    const percent = feePercent(route);
    const feeCents = Math.round(route.price_per_passenger_cents * percent / 100);
    const driverNetCents = route.price_per_passenger_cents - feeCents;
    const canManage = route.status !== 'cancelled' && route.status !== 'archived';

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
          <Info label="Ida" value={route.departure_time} icon="arrow-up-circle-outline" />
          <Info label="Volta" value={route.return_time} icon="arrow-down-circle-outline" />
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
        </View>

        {canManage && (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.outlineButton} onPress={() => startEdit(route)}>
                <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                <Text style={styles.outlineButtonText}>Editar</Text>
              </TouchableOpacity>
              {route.status === 'active' && (
                <TouchableOpacity style={styles.outlineButton} onPress={() => pauseRoute(route)}>
                  <Ionicons name="pause-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.outlineButtonText}>Pausar</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.dangerButton} onPress={() => cancelRoute(route)}>
                <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
                <Text style={styles.dangerButtonText}>Cancelar rota</Text>
              </TouchableOpacity>
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
          <Text style={styles.heroText}>Organize ida e volta programadas, horario combinado, vaga reservada e valor por passageiro.</Text>
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

  emptyCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 22, marginTop: 4 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 6 },
});
