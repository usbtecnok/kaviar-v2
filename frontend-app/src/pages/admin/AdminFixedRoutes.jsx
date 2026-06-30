import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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

export default function AdminFixedRoutes() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', trip_type: '', search: '' });
  const [selectedId, setSelectedId] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [reservations, setReservations] = useState([]);

  const admin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}');
    } catch {
      return {};
    }
  }, []);
  const canWrite = admin?.role === 'SUPER_ADMIN';

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminApi.getAdminFixedRoutes({
        ...filters,
        limit: 100,
        offset: 0,
      });
      setRows(response.data || []);
      setTotal(Number(response.pagination?.total || 0));
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Erro ao carregar Rotas Fixas');
    } finally {
      setLoading(false);
    }
  }, [filters]);

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

  const openDetail = async (id) => {
    setSelectedId(id);
    setDrawerOpen(true);
    await loadDetail(id);
  };

  const executeAction = async (action) => {
    if (!selectedId || !canWrite) return;
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      if (action === 'pause') await adminApi.pauseAdminFixedRoute(selectedId);
      if (action === 'reactivate') await adminApi.reactivateAdminFixedRoute(selectedId);
      if (action === 'archive') await adminApi.archiveAdminFixedRoute(selectedId);

      const actionLabel = action === 'pause' ? 'pausada' : action === 'reactivate' ? 'reativada' : 'arquivada';
      setSuccess(`Rota ${actionLabel} com sucesso`);
      await Promise.all([loadList(), loadDetail(selectedId)]);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Erro ao executar ação na rota');
    } finally {
      setActionLoading(false);
    }
  };

  const copyInviteLink = async (inviteCode) => {
    const link = `${window.location.origin}/rotas-fixas/${encodeURIComponent(inviteCode)}`;
    try {
      await navigator.clipboard.writeText(link);
      setSuccess('Link público copiado');
    } catch {
      setError('Não foi possível copiar o link público');
    }
  };

  const summary = useMemo(() => {
    const output = { active: 0, paused: 0, cancelled: 0, archived: 0 };
    for (const row of rows) {
      if (output[row.status] !== undefined) output[row.status] += 1;
    }
    return output;
  }, [rows]);

  return (
    <Box>
      <Typography variant="h5" sx={{ color: '#B8942E', fontWeight: 800, mb: 2 }}>
        Rotas Fixas
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}>
          <Card><CardContent><Typography variant="body2">Ativas</Typography><Typography variant="h6">{summary.active}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent><Typography variant="body2">Pausadas</Typography><Typography variant="h6">{summary.paused}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent><Typography variant="body2">Canceladas</Typography><Typography variant="h6">{summary.cancelled}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card><CardContent><Typography variant="body2">Arquivadas</Typography><Typography variant="h6">{summary.archived}</Typography></CardContent></Card>
        </Grid>
      </Grid>

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
              placeholder="Código, título, origem, destino ou motorista"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              sx={{ flex: 1 }}
            />

            <Button variant="contained" onClick={loadList} disabled={loading}>Aplicar</Button>
            <Tooltip title="Recarregar">
              <span>
                <IconButton onClick={loadList} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: 'text.secondary' }}>
            Total encontrado: {total}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Título</TableCell>
                  <TableCell>Trajeto</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assentos</TableCell>
                  <TableCell>Preço</TableCell>
                  <TableCell>Motorista</TableCell>
                  <TableCell align="right">Ações</TableCell>
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
                      <Tooltip title="Copiar link público">
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
          )}
        </CardContent>
      </Card>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: { xs: 360, md: 520 }, p: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Detalhe da Rota Fixa</Typography>

          {!detail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
          ) : (
            <>
              <Stack spacing={1} sx={{ mb: 2 }}>
                <Typography variant="subtitle2">{detail.route?.title || '-'}</Typography>
                <Typography variant="body2">Código: {detail.route?.invite_code}</Typography>
                <Typography variant="body2">Trajeto: {detail.route?.origin_label} → {detail.route?.destination_label}</Typography>
                <Typography variant="body2">Tipo: {tripTypeLabel(detail.route?.trip_type)}</Typography>
                <Typography variant="body2">Dias: {weekdaysLabel(detail.route?.weekdays)}</Typography>
                <Typography variant="body2">Horários: ida {detail.route?.departure_time || '-'} · volta {detail.route?.return_time || '-'}</Typography>
                <Typography variant="body2">Motorista: {detail.driver?.name || '-'}</Typography>
                <Typography variant="body2">Território: {detail.route?.territory_name || 'Sem território'}</Typography>
                <Typography variant="body2">Atualização: {formatDateTime(detail.route?.updated_at)}</Typography>
                <Chip size="small" label={statusLabel(detail.route?.status)} color={statusColor(detail.route?.status)} sx={{ width: 'fit-content' }} />
              </Stack>

              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={6}><Card><CardContent><Typography variant="caption">Confirmadas</Typography><Typography variant="h6">{detail.metrics?.confirmed_count || 0}</Typography></CardContent></Card></Grid>
                <Grid item xs={6}><Card><CardContent><Typography variant="caption">No-show</Typography><Typography variant="h6">{detail.metrics?.no_show_count || 0}</Typography></CardContent></Card></Grid>
                <Grid item xs={6}><Card><CardContent><Typography variant="caption">Canceladas</Typography><Typography variant="h6">{detail.metrics?.cancelled_count || 0}</Typography></CardContent></Card></Grid>
                <Grid item xs={6}><Card><CardContent><Typography variant="caption">Concluídas</Typography><Typography variant="h6">{detail.metrics?.completed_count || 0}</Typography></CardContent></Card></Grid>
                <Grid item xs={12}><Card><CardContent><Typography variant="caption">Receita bruta</Typography><Typography variant="h6">{formatMoney(detail.metrics?.gross_revenue_cents || 0)}</Typography></CardContent></Card></Grid>
              </Grid>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  disabled={!canWrite || actionLoading || detail.route?.status !== 'active'}
                  onClick={() => executeAction('pause')}
                >
                  Pausar
                </Button>
                <Button
                  variant="outlined"
                  disabled={!canWrite || actionLoading || !['paused', 'cancelled'].includes(detail.route?.status)}
                  onClick={() => executeAction('reactivate')}
                >
                  Reativar
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  disabled={!canWrite || actionLoading || !['paused', 'cancelled'].includes(detail.route?.status)}
                  onClick={() => executeAction('archive')}
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
    </Box>
  );
}
