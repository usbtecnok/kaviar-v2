import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { adminApi } from '../../services/adminApi';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'active', label: 'Ativa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'archived', label: 'Arquivada' },
];

const TRIP_TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'round_trip', label: 'Ida e volta' },
  { value: 'one_way_outbound', label: 'Somente ida' },
  { value: 'one_way_return', label: 'Somente volta' },
];

const METRIC_PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const CONFIRM_ACTIONS = {
  pause: {
    title: 'Pausar Corrida Compartilhada?',
    message: 'Essa corrida deixara de aceitar novas reservas ate ser reativada.',
    confirmLabel: 'Pausar corrida',
    successLabel: 'pausada',
  },
  reactivate: {
    title: 'Reativar Corrida Compartilhada?',
    message: 'A corrida voltara a aceitar reservas, se ainda houver vagas disponiveis.',
    confirmLabel: 'Reativar corrida',
    successLabel: 'reativada',
  },
  archive: {
    title: 'Arquivar Corrida Compartilhada?',
    message: 'Essa corrida ficara oculta da lista principal e nao aceitara novas reservas. Essa acao nao apaga o historico.',
    confirmLabel: 'Arquivar corrida',
    successLabel: 'arquivada',
  },
};

const EMPTY_METRICS = {
  period: { label: '-', start_date: null, end_date: null },
  totals: {
    routes_created: 0,
    routes_active: 0,
    routes_paused: 0,
    routes_cancelled: 0,
    routes_archived: 0,
    routes_with_reservations: 0,
    reservations_confirmed: 0,
    reservations_completed: 0,
    reservations_no_show: 0,
    reservations_cancelled: 0,
    seats_total: 0,
    seats_reserved: 0,
    occupancy_rate: 0,
    gross_revenue_cents: 0,
    kaviar_fee_cents: 0,
    driver_net_cents: 0,
  },
  funnel: {
    created: 0,
    with_reservation: 0,
    completed: 0,
    no_show: 0,
    cancelled: 0,
  },
  by_trip_type: [],
  by_status: [],
};

function tripTypeLabel(value) {
  if (value === 'round_trip') return 'Ida e volta';
  if (value === 'one_way_outbound') return 'Somente ida';
  if (value === 'one_way_return') return 'Somente volta';
  return value || '-';
}

function statusLabel(value) {
  if (value === 'active') return 'Ativa';
  if (value === 'paused') return 'Pausada';
  if (value === 'cancelled') return 'Cancelada';
  if (value === 'archived') return 'Arquivada';
  return value || '-';
}

function statusColor(value) {
  if (value === 'active') return 'success';
  if (value === 'paused') return 'warning';
  if (value === 'cancelled') return 'default';
  if (value === 'archived') return 'error';
  return 'default';
}

function formatMoney(cents) {
  const value = Number(cents || 0) / 100;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return value;
  }
}

function formatPercent(value) {
  const n = Number(value || 0) * 100;
  return `${n.toFixed(1)}%`;
}

function weekdaysLabel(days) {
  if (!Array.isArray(days) || days.length === 0) return '-';
  const map = {
    mon: 'Seg',
    tue: 'Ter',
    wed: 'Qua',
    thu: 'Qui',
    fri: 'Sex',
    sat: 'Sab',
    sun: 'Dom',
  };
  return days.map((d) => map[d] || d).join(' • ');
}

function timeLabel(departureTime, returnTime, tripType) {
  if (tripType === 'one_way_outbound') return `Saida: ${departureTime || '-'}`;
  if (tripType === 'one_way_return') return `Volta: ${returnTime || '-'}`;
  return `Saida: ${departureTime || '-'} · Volta: ${returnTime || '-'}`;
}

export default function AdminFixedRoutes() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);

  const [filters, setFilters] = useState({ status: '', trip_type: '', search: '' });
  const [appliedFilters, setAppliedFilters] = useState({ status: '', trip_type: '', search: '' });

  const [metricsFilters, setMetricsFilters] = useState({ period: '7d', trip_type: '', territory_id: '' });
  const [appliedMetricsFilters, setAppliedMetricsFilters] = useState({ period: '7d', trip_type: '', territory_id: '' });

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selectedId, setSelectedId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [confirmState, setConfirmState] = useState({ open: false, action: '', error: '' });

  const admin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}');
    } catch {
      return {};
    }
  }, []);
  const canWrite = admin?.role === 'SUPER_ADMIN';
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';

  const loadList = useCallback(async () => {
    const offset = page * pageSize;
    try {
      setLoading(true);
      setError('');
      const response = await adminApi.getAdminFixedRoutes({
        ...appliedFilters,
        limit: pageSize,
        offset,
      });
      setRows(response.data || []);
      setTotal(Number(response.pagination?.total || 0));
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Erro ao carregar Corridas Compartilhadas');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  const loadMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      setError('');
      const response = await adminApi.getAdminFixedRouteMetrics(appliedMetricsFilters);
      setMetrics(response.data || EMPTY_METRICS);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Erro ao carregar metricas');
      setMetrics(EMPTY_METRICS);
    } finally {
      setMetricsLoading(false);
    }
  }, [appliedMetricsFilters]);

  const loadDetail = useCallback(async (id) => {
    try {
      setError('');
      const [detailResponse, reservationsResponse] = await Promise.all([
        adminApi.getAdminFixedRoute(id),
        adminApi.getAdminFixedRouteReservations(id, { limit: 200, offset: 0 }),
      ]);
      setDetail(detailResponse.data || null);
      setReservations(reservationsResponse.data || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Erro ao carregar detalhe da rota');
      setDetail(null);
      setReservations([]);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const openDetail = async (id) => {
    setSelectedId(id);
    setDrawerOpen(true);
    await loadDetail(id);
  };

  const executeAction = async () => {
    const action = confirmState.action;
    if (!selectedId || !canWrite || !action) return;
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      setConfirmState((prev) => ({ ...prev, error: '' }));

      if (action === 'pause') await adminApi.pauseAdminFixedRoute(selectedId);
      if (action === 'reactivate') await adminApi.reactivateAdminFixedRoute(selectedId);
      if (action === 'archive') await adminApi.archiveAdminFixedRoute(selectedId);

      setSuccess(`Rota ${CONFIRM_ACTIONS[action]?.successLabel || 'atualizada'} com sucesso`);
      setConfirmState({ open: false, action: '', error: '' });
      if (drawerOpen && selectedId) {
        await Promise.all([loadList(), loadDetail(selectedId), loadMetrics()]);
      } else {
        await Promise.all([loadList(), loadMetrics()]);
      }
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Erro ao executar acao na rota';
      setError(message);
      setConfirmState((prev) => ({ ...prev, error: message }));
    } finally {
      setActionLoading(false);
    }
  };

  const openConfirm = (action) => {
    setConfirmState({ open: true, action, error: '' });
  };

  const closeConfirm = () => {
    if (actionLoading) return;
    setConfirmState({ open: false, action: '', error: '' });
  };

  const handleApplyFilters = () => {
    setPage(0);
    setAppliedFilters({ ...filters });
  };

  const handleClearFilters = () => {
    const empty = { status: '', trip_type: '', search: '' };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(0);
  };

  const handleApplyMetricsFilters = () => {
    setAppliedMetricsFilters({ ...metricsFilters });
  };

  const handleClearMetricsFilters = () => {
    const empty = { period: '7d', trip_type: '', territory_id: '' };
    setMetricsFilters(empty);
    setAppliedMetricsFilters(empty);
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    if ((page + 1) * pageSize >= total) return;
    setPage((prev) => prev + 1);
  };

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value || 20));
    setPage(0);
  };

  const copyInviteLink = async (inviteCode) => {
    const link = `${window.location.origin}/rotas-fixas/${encodeURIComponent(inviteCode)}`;
    try {
      await navigator.clipboard.writeText(link);
      setSuccess('Link publico copiado');
    } catch {
      setError('Nao foi possivel copiar o link publico');
    }
  };

  const rangeStart = total === 0 ? 0 : (page * pageSize) + 1;
  const rangeEnd = total === 0 ? 0 : (page * pageSize) + rows.length;
  const hasPrevious = page > 0;
  const hasNext = (page + 1) * pageSize < total;
  const confirmMeta = confirmState.action ? CONFIRM_ACTIONS[confirmState.action] : null;

  const byTripTypeRows = Array.isArray(metrics.by_trip_type) ? metrics.by_trip_type : [];

  return (
    <Box>
      <Typography variant="h5" sx={{ color: '#B8942E', fontWeight: 800, mb: 2 }}>
        Corridas Compartilhadas
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

      <Card sx={{ mb: 2, borderTop: '3px solid #B8942E' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Observabilidade operacional
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Periodo</InputLabel>
              <Select
                label="Periodo"
                value={metricsFilters.period}
                onChange={(event) => setMetricsFilters((prev) => ({ ...prev, period: event.target.value }))}
              >
                {METRIC_PERIOD_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                label="Tipo"
                value={metricsFilters.trip_type}
                onChange={(event) => setMetricsFilters((prev) => ({ ...prev, trip_type: event.target.value }))}
              >
                {TRIP_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={`m-${option.value || 'all'}`} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {isSuperAdmin ? (
              <TextField
                size="small"
                label="Territorio ID"
                placeholder="Opcional"
                value={metricsFilters.territory_id}
                onChange={(event) => setMetricsFilters((prev) => ({ ...prev, territory_id: event.target.value }))}
                sx={{ minWidth: 200 }}
              />
            ) : null}

            <Button variant="contained" onClick={handleApplyMetricsFilters} disabled={metricsLoading}>Aplicar</Button>
            <Button variant="outlined" onClick={handleClearMetricsFilters} disabled={metricsLoading}>Limpar</Button>
            <Tooltip title="Recarregar metricas">
              <span>
                <IconButton onClick={loadMetrics} disabled={metricsLoading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
            {metrics.period?.label || '-'} · {formatDateTime(metrics.period?.start_date)} ate {formatDateTime(metrics.period?.end_date)}
          </Typography>
        </CardContent>
      </Card>

      {metricsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2.5 }}><CircularProgress size={24} /></Box>
      ) : (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}><Card><CardContent><Typography variant="caption">Rotas criadas</Typography><Typography variant="h6">{metrics.totals.routes_created}</Typography></CardContent></Card></Grid>
            <Grid item xs={6} md={3}><Card><CardContent><Typography variant="caption">Rotas com reserva</Typography><Typography variant="h6">{metrics.totals.routes_with_reservations}</Typography></CardContent></Card></Grid>
            <Grid item xs={6} md={3}><Card><CardContent><Typography variant="caption">Reservas confirmadas</Typography><Typography variant="h6">{metrics.totals.reservations_confirmed}</Typography></CardContent></Card></Grid>
            <Grid item xs={6} md={3}><Card><CardContent><Typography variant="caption">Concluidas</Typography><Typography variant="h6">{metrics.totals.reservations_completed}</Typography></CardContent></Card></Grid>
            <Grid item xs={6} md={3}><Card><CardContent><Typography variant="caption">No-show</Typography><Typography variant="h6">{metrics.totals.reservations_no_show}</Typography></CardContent></Card></Grid>
            <Grid item xs={6} md={3}><Card><CardContent><Typography variant="caption">Ocupacao</Typography><Typography variant="h6">{formatPercent(metrics.totals.occupancy_rate)}</Typography></CardContent></Card></Grid>
            <Grid item xs={6} md={3}><Card><CardContent><Typography variant="caption">Receita bruta</Typography><Typography variant="h6">{formatMoney(metrics.totals.gross_revenue_cents)}</Typography></CardContent></Card></Grid>
            <Grid item xs={6} md={3}><Card><CardContent><Typography variant="caption">Taxa KAVIAR</Typography><Typography variant="h6">{formatMoney(metrics.totals.kaviar_fee_cents)}</Typography></CardContent></Card></Grid>
          </Grid>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>Funil operacional</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="stretch">
                <Card variant="outlined" sx={{ flex: 1 }}><CardContent sx={{ py: 1.2 }}><Typography variant="caption">Criadas</Typography><Typography variant="h6">{metrics.funnel.created}</Typography></CardContent></Card>
                <Card variant="outlined" sx={{ flex: 1 }}><CardContent sx={{ py: 1.2 }}><Typography variant="caption">Com reserva</Typography><Typography variant="h6">{metrics.funnel.with_reservation}</Typography></CardContent></Card>
                <Card variant="outlined" sx={{ flex: 1 }}><CardContent sx={{ py: 1.2 }}><Typography variant="caption">Concluidas</Typography><Typography variant="h6">{metrics.funnel.completed}</Typography></CardContent></Card>
                <Card variant="outlined" sx={{ flex: 1 }}><CardContent sx={{ py: 1.2 }}><Typography variant="caption">No-show</Typography><Typography variant="h6">{metrics.funnel.no_show}</Typography></CardContent></Card>
                <Card variant="outlined" sx={{ flex: 1 }}><CardContent sx={{ py: 1.2 }}><Typography variant="caption">Canceladas</Typography><Typography variant="h6">{metrics.funnel.cancelled}</Typography></CardContent></Card>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>Por tipo de rota</Typography>
              <Grid container spacing={1.5}>
                {byTripTypeRows.map((item) => (
                  <Grid item xs={12} md={4} key={item.trip_type}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.8 }}>{tripTypeLabel(item.trip_type)}</Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>Rotas: {item.routes_count}</Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>Reservas: {item.reservations_count}</Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>Concluidas: {item.completed_count}</Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>No-show: {item.no_show_count}</Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>Taxa KAVIAR: {formatMoney(item.kaviar_fee_cents)}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                label="Tipo"
                value={filters.trip_type}
                onChange={(event) => setFilters((prev) => ({ ...prev, trip_type: event.target.value }))}
              >
                {TRIP_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Busca"
              placeholder="Codigo, titulo, origem, destino ou motorista"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              sx={{ flex: 1 }}
            />

            <Button variant="contained" onClick={handleApplyFilters} disabled={loading}>Aplicar</Button>
            <Button variant="outlined" onClick={handleClearFilters} disabled={loading}>Limpar filtros</Button>
            <Tooltip title="Recarregar lista">
              <span>
                <IconButton onClick={loadList} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: 'text.secondary' }}>
            Mostrando {rangeStart}-{rangeEnd} de {total} rotas
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1 }} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 180 } }}>
              <InputLabel>Por pagina</InputLabel>
              <Select label="Por pagina" value={pageSize} onChange={handlePageSizeChange}>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <MenuItem key={size} value={size}>{size} por pagina</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" disabled={loading || !hasPrevious} onClick={handlePrevPage}>Anterior</Button>
              <Button variant="outlined" disabled={loading || !hasNext} onClick={handleNextPage}>Proxima</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : !isMobile ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Codigo</TableCell>
                  <TableCell>Titulo</TableCell>
                  <TableCell>Trajeto</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assentos</TableCell>
                  <TableCell>Preco</TableCell>
                  <TableCell>Motorista</TableCell>
                  <TableCell align="right">Acoes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">Nenhuma rota encontrada</TableCell>
                  </TableRow>
                ) : rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.invite_code}</TableCell>
                    <TableCell>{row.title || '-'}</TableCell>
                    <TableCell>{row.origin_label} → {row.destination_label}</TableCell>
                    <TableCell>{tripTypeLabel(row.trip_type)}</TableCell>
                    <TableCell><Chip size="small" label={statusLabel(row.status)} color={statusColor(row.status)} /></TableCell>
                    <TableCell>{row.reserved_count}/{row.seats_total}</TableCell>
                    <TableCell>{formatMoney(row.price_cents)}</TableCell>
                    <TableCell>{row.driver_name || '-'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Copiar link publico">
                        <IconButton size="small" onClick={() => copyInviteLink(row.invite_code)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ver detalhes">
                        <IconButton size="small" onClick={() => openDetail(row.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Stack spacing={1.25} sx={{ p: 1.25 }}>
              {rows.length === 0 ? (
                <Typography variant="body2" sx={{ p: 1, textAlign: 'center', color: 'text.secondary' }}>
                  Nenhuma rota encontrada
                </Typography>
              ) : rows.map((row) => (
                <Card key={row.id} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{row.invite_code}</Typography>
                      <Chip size="small" label={statusLabel(row.status)} color={statusColor(row.status)} />
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{row.driver_name || '-'}</Typography>
                    <Typography variant="body2" sx={{ mb: 0.35 }}>{row.origin_label} → {row.destination_label}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Tipo: {tripTypeLabel(row.trip_type)}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Horario: {timeLabel(row.departure_time, row.return_time, row.trip_type)}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Vagas: {row.reserved_count}/{row.seats_total}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Valor: {formatMoney(row.price_cents)}</Typography>
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                      <Button size="small" onClick={() => copyInviteLink(row.invite_code)} startIcon={<ContentCopyIcon fontSize="small" />}>
                        Link
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => openDetail(row.id)}>
                        Ver detalhes
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: { xs: 360, md: 520 }, p: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Detalhe da Corrida Compartilhada</Typography>

          {!detail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
          ) : (
            <>
              <Stack spacing={1} sx={{ mb: 2 }}>
                <Typography variant="subtitle2">{detail.route?.title || '-'}</Typography>
                <Typography variant="body2">Codigo: {detail.route?.invite_code}</Typography>
                <Typography variant="body2">Trajeto: {detail.route?.origin_label} → {detail.route?.destination_label}</Typography>
                <Typography variant="body2">Tipo: {tripTypeLabel(detail.route?.trip_type)}</Typography>
                <Typography variant="body2">Dias: {weekdaysLabel(detail.route?.weekdays)}</Typography>
                <Typography variant="body2">Horarios: ida {detail.route?.departure_time || '-'} · volta {detail.route?.return_time || '-'}</Typography>
                <Typography variant="body2">Motorista: {detail.driver?.name || '-'}</Typography>
                <Typography variant="body2">Territorio: {detail.route?.territory_name || 'Sem territorio'}</Typography>
                <Typography variant="body2">Atualizacao: {formatDateTime(detail.route?.updated_at)}</Typography>
                <Chip size="small" label={statusLabel(detail.route?.status)} color={statusColor(detail.route?.status)} sx={{ width: 'fit-content' }} />
              </Stack>

              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={6}><Card><CardContent><Typography variant="caption">Confirmadas</Typography><Typography variant="h6">{detail.metrics?.confirmed_count || 0}</Typography></CardContent></Card></Grid>
                <Grid item xs={6}><Card><CardContent><Typography variant="caption">No-show</Typography><Typography variant="h6">{detail.metrics?.no_show_count || 0}</Typography></CardContent></Card></Grid>
                <Grid item xs={6}><Card><CardContent><Typography variant="caption">Canceladas</Typography><Typography variant="h6">{detail.metrics?.cancelled_count || 0}</Typography></CardContent></Card></Grid>
                <Grid item xs={6}><Card><CardContent><Typography variant="caption">Concluidas</Typography><Typography variant="h6">{detail.metrics?.completed_count || 0}</Typography></CardContent></Card></Grid>
                <Grid item xs={12}><Card><CardContent><Typography variant="caption">Receita bruta</Typography><Typography variant="h6">{formatMoney(detail.metrics?.gross_revenue_cents || 0)}</Typography></CardContent></Card></Grid>
              </Grid>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  disabled={!canWrite || actionLoading || detail.route?.status !== 'active'}
                  onClick={() => openConfirm('pause')}
                >
                  Pausar
                </Button>
                <Button
                  variant="outlined"
                  disabled={!canWrite || actionLoading || !['paused', 'cancelled'].includes(detail.route?.status)}
                  onClick={() => openConfirm('reactivate')}
                >
                  Reativar
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  disabled={!canWrite || actionLoading || !['paused', 'cancelled'].includes(detail.route?.status)}
                  onClick={() => openConfirm('archive')}
                >
                  Arquivar
                </Button>
              </Stack>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Reservas ({reservations.length})</Typography>
              <Box sx={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Passageiro</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Assentos</TableCell>
                      <TableCell>Valor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reservations.length === 0 ? (
                      <TableRow><TableCell colSpan={4} align="center">Sem reservas</TableCell></TableRow>
                    ) : reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell>{reservation.passenger_name}</TableCell>
                        <TableCell>{reservation.status}</TableCell>
                        <TableCell>{reservation.seats_reserved}</TableCell>
                        <TableCell>{formatMoney(reservation.price_cents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Eventos</Typography>
              <Box sx={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                {Array.isArray(detail.events) && detail.events.length > 0 ? detail.events.map((event) => (
                  <Typography key={event.id} variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                    {formatDateTime(event.created_at)} · {event.action}
                  </Typography>
                )) : <Typography variant="caption">Sem eventos</Typography>}
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      <Dialog open={confirmState.open} onClose={closeConfirm} fullWidth maxWidth="xs">
        <DialogTitle>{confirmMeta?.title || 'Confirmar acao'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 0.5 }}>{confirmMeta?.message || ''}</Typography>
          {confirmState.error ? <Alert severity="error" sx={{ mt: 1.5 }}>{confirmState.error}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm} disabled={actionLoading}>Cancelar</Button>
          <Button
            onClick={executeAction}
            variant="contained"
            color={confirmState.action === 'archive' ? 'error' : 'primary'}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {confirmMeta?.confirmLabel || 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
