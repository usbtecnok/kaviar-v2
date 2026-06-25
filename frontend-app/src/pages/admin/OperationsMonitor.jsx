import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Drawer,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { ContentCopy, FileDownload, Refresh, Close } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const STATUS_COLORS = {
  completed: '#4CAF50',
  canceled_by_passenger: '#FF9800',
  canceled_by_driver: '#FF9800',
  no_driver: '#f44336',
  requested: '#2196F3',
  offered: '#2196F3',
  accepted: '#25D366',
  arrived: '#25D366',
  in_progress: '#25D366',
};

const STATUS_LABELS = {
  completed: 'Concluida',
  canceled_by_passenger: 'Canc. passageiro',
  canceled_by_driver: 'Canc. motorista',
  no_driver: 'Sem motorista',
  requested: 'Solicitada',
  offered: 'Ofertada',
  accepted: 'Aceita',
  arrived: 'Chegou',
  in_progress: 'Em andamento',
};

const AVAILABILITY_LABELS = {
  online: 'Online',
  busy: 'Em corrida',
  offline: 'Offline',
};

const SEVERITY_COLORS = {
  info: '#2196F3',
  success: '#25D366',
  warning: '#FF9800',
  critical: '#f44336',
};

const OPERATIONAL_SEVERITY = {
  critical: { label: 'Crítico', color: '#ff6b6b' },
  attention: { label: 'Atenção', color: '#FFD700' },
  monitor: { label: 'Monitorar', color: '#64B5F6' },
};

const NOTE_TYPE_OPTIONS = [
  { value: 'checked', label: 'Verificação realizada' },
  { value: 'driver_contacted', label: 'Motorista contatado pelo gestor' },
  { value: 'passenger_oriented', label: 'Passageiro orientado' },
  { value: 'emergency_followup', label: 'Emergência acompanhada' },
  { value: 'no_action_needed', label: 'Sem ação necessária' },
  { value: 'other', label: 'Outra observação' },
];

const NOTE_TYPE_LABELS = NOTE_TYPE_OPTIONS.reduce((acc, item) => ({ ...acc, [item.value]: item.label }), {});

const EMERGENCY_FOLLOWUP_OPTIONS = [
  { value: 'emergency_seen', label: 'Emergência visualizada' },
  { value: 'passenger_contact_attempted', label: 'Tentativa de contato com passageiro registrada' },
  { value: 'driver_contact_attempted', label: 'Tentativa de contato com motorista registrada' },
  { value: 'local_manager_followup', label: 'Gestor territorial acompanhando' },
  { value: 'support_followup', label: 'Suporte acompanhando' },
  { value: 'no_action_needed', label: 'Sem ação adicional necessária' },
  { value: 'other', label: 'Outro acompanhamento' },
];

const EMERGENCY_FOLLOWUP_LABELS = EMERGENCY_FOLLOWUP_OPTIONS.reduce((acc, item) => ({ ...acc, [item.value]: item.label }), {});

function fmtTime(seconds) {
  if (seconds == null) return 'Indisponivel';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function fmtMoney(value) {
  if (value == null) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function fmtHour(date) {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function shortId(id) {
  if (!id) return '-';
  return id.slice(0, 8);
}

function todaySaoPauloDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function fmtDailyDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return date || '-';
  const [year, month, day] = date.split('-');
  return day + '/' + month + '/' + year;
}

function fmtDailyShortDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return date || '-';
  const [, month, day] = date.split('-');
  return day + '/' + month;
}

function recentSaoPauloDates(count = 7) {
  const now = Date.now();
  return Array.from({ length: count }, (_, index) => (
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(now - index * 24 * 60 * 60 * 1000))
  ));
}

function recentDateLabel(date, index) {
  if (index === 0) return 'Hoje';
  if (index === 1) return 'Ontem';
  return fmtDailyShortDate(date);
}

function moneyFromCents(cents) {
  if (cents == null) return 'R$ 0,00';
  return fmtMoney(Number(cents) / 100);
}

function buildDailyReportSummary(report) {
  if (!report?.metrics) return '';
  const metrics = report.metrics;
  const territoryName = report.territory?.active_territory?.name || 'Geral';

  return [
    'Relatório Diário KAVIAR',
    'Data: ' + fmtDailyDate(report.period?.date),
    'Território: ' + territoryName,
    '',
    'Solicitadas: ' + (metrics.requested_rides ?? 0),
    'Concluídas: ' + (metrics.completed_rides ?? 0),
    'Canceladas: ' + (metrics.canceled_rides ?? 0),
    'Sem motorista/oferta: ' + (metrics.no_driver_or_no_offer_rides ?? 0),
    'Emergências: ' + (metrics.emergencies_registered ?? 0),
    'Ativas agora: ' + (metrics.active_emergencies ?? 0),
    'Receita final: ' + moneyFromCents(metrics.final_revenue_cents),
    'Taxa KAVIAR: ' + moneyFromCents(metrics.kaviar_fee_cents),
    'Ganho motorista: ' + moneyFromCents(metrics.driver_earnings_cents),
    'Média até 1ª oferta: ' + (metrics.avg_to_offer_seconds == null ? 'Indisponível' : fmtTime(metrics.avg_to_offer_seconds)),
    '',
    'Observação: ' + (report.scope_rules?.cross_territory || 'Corridas cross-territory entram no relatório pelo território de origem.'),
  ].join('\n');
}

function formatCsvValue(value) {
  const normalized = String(value ?? '').replace(/\r?\n|\r/g, ' ').trim();
  return /[\",\n]/.test(normalized) ? '"' + normalized.replace(/"/g, '""') + '"' : normalized;
}

function decimalFromCents(cents) {
  return ((Number(cents) || 0) / 100).toFixed(2);
}

function buildDailyReportCsv(report) {
  if (!report?.metrics) return '';
  const metrics = report.metrics;
  const territoryName = report.territory?.active_territory?.name || 'Geral';
  const headers = [
    'data',
    'territorio',
    'solicitadas',
    'concluidas',
    'canceladas',
    'sem_motorista_ou_oferta',
    'emergencias',
    'ativas_agora',
    'receita_final',
    'taxa_kaviar',
    'ganho_motorista',
    'media_ate_primeira_oferta',
  ];
  const row = [
    report.period?.date || '',
    territoryName,
    metrics.requested_rides ?? 0,
    metrics.completed_rides ?? 0,
    metrics.canceled_rides ?? 0,
    metrics.no_driver_or_no_offer_rides ?? 0,
    metrics.emergencies_registered ?? 0,
    metrics.active_emergencies ?? 0,
    decimalFromCents(metrics.final_revenue_cents),
    decimalFromCents(metrics.kaviar_fee_cents),
    decimalFromCents(metrics.driver_earnings_cents),
    metrics.avg_to_offer_seconds == null ? '' : metrics.avg_to_offer_seconds,
  ];

  return [headers, row].map(line => line.map(formatCsvValue).join(',')).join('\r\n');
}

function dailyReportCsvFilename(report) {
  const date = report?.period?.date || todaySaoPauloDate();
  const suffix = report?.territory?.active_territory?.id ? '-territorio' : '';
  return `kaviar-relatorio-diario-${date}${suffix}.csv`;
}

function downloadDailyReportCsv(report) {
  const csv = buildDailyReportCsv(report);
  if (!csv) return;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = dailyReportCsvFilename(report);
  link.click();
  URL.revokeObjectURL(url);
}

export default function OperationsMonitor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [rideDetail, setRideDetail] = useState(null);
  const [dailyDate, setDailyDate] = useState(todaySaoPauloDate());
  const [dailyReport, setDailyReport] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState('');
  const [dailyCopyStatus, setDailyCopyStatus] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTerritoryId = searchParams.get('territory_id') || '';
  const token = localStorage.getItem('kaviar_admin_token');
  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const isTerritorialAdmin = ['TERRITORIAL_MANAGER', 'TERRITORIAL_OPERATOR'].includes(admin?.role);

  const load = useCallback(async () => {
    try {
      setError('');
      const query = selectedTerritoryId ? `?territory_id=${encodeURIComponent(selectedTerritoryId)}` : '';
      const res = await fetch(`${API_BASE_URL}/api/admin/operations/cockpit${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Erro ao carregar cockpit operacional');
      }
      setData(body);
    } catch (err) {
      console.error('[OPS_COCKPIT]', err);
      setError(err.message || 'Erro ao carregar cockpit operacional');
    } finally {
      setLoading(false);
    }
  }, [token, selectedTerritoryId]);

  const loadDailyReport = useCallback(async () => {
    try {
      setDailyLoading(true);
      setDailyError('');
      setDailyReport(null);
      setDailyCopyStatus('');
      const params = new URLSearchParams({ date: dailyDate });
      if (selectedTerritoryId) params.set('territory_id', selectedTerritoryId);
      const res = await fetch(`${API_BASE_URL}/api/admin/operations/daily-report?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Erro ao carregar relatório diário');
      }
      setDailyReport(body);
    } catch (err) {
      console.error('[OPS_DAILY_REPORT]', err);
      setDailyReport(null);
      setDailyCopyStatus('');
      setDailyError(err.message || 'Erro ao carregar relatório diário');
    } finally {
      setDailyLoading(false);
    }
  }, [token, selectedTerritoryId, dailyDate]);

  const openRideDetail = async (rideId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setRideDetail(null);

    try {
      const query = selectedTerritoryId ? `?territory_id=${encodeURIComponent(selectedTerritoryId)}` : '';
      const res = await fetch(`${API_BASE_URL}/api/admin/operations/rides/${rideId}${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Erro ao carregar detalhe operacional');
      }
      setRideDetail(body.data);
    } catch (err) {
      console.error('[OPS_RIDE_DETAIL]', err);
      setDetailError(err.message || 'Erro ao carregar detalhe operacional');
    } finally {
      setDetailLoading(false);
    }
  };

  const changeTerritory = (territoryId) => {
    const next = new URLSearchParams(searchParams);
    if (territoryId) next.set('territory_id', territoryId);
    else next.delete('territory_id');
    setSearchParams(next, { replace: true });
  };

  const copyDailySummary = async () => {
    if (!dailyReport) return;

    try {
      await navigator.clipboard.writeText(buildDailyReportSummary(dailyReport));
      setDailyCopyStatus('Resumo copiado.');
    } catch (err) {
      console.error('[OPS_DAILY_REPORT_COPY]', err);
      setDailyCopyStatus('Não foi possível copiar automaticamente.');
    }
  };

  const selectRecentDailyDate = (date) => {
    setDailyCopyStatus('');
    if (date === dailyDate) {
      loadDailyReport();
      return;
    }
    setDailyDate(date);
  };

  const addOperationalNoteToDetail = (note) => {
    setRideDetail(prev => prev ? {
      ...prev,
      operational_notes: [note, ...(prev.operational_notes || [])],
    } : prev);
  };

  const addEmergencyFollowupToDetail = (followup) => {
    setRideDetail(prev => prev ? {
      ...prev,
      emergencies: {
        ...(prev.emergencies || {}),
        followups: [followup, ...(prev.emergencies?.followups || [])],
      },
    } : prev);
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    loadDailyReport();
  }, [loadDailyReport]);

  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const cardSx = {
    bgcolor: '#111a22',
    borderRadius: 2.5,
    border: '1px solid #1a2332',
    p: 2.5,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  };
  const sectionSx = {
    bgcolor: '#0d1117',
    borderRadius: 3,
    border: '1px solid #1a2332',
    p: 3,
    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
  };

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress sx={{ color: '#FFD700' }} />
      </Box>
    );
  }

  const cards = data?.cards || {};
  const activeRides = data?.active_rides || [];
  const completedRides = data?.completed_rides_today || [];
  const operationalAlerts = data?.operational_alerts || [];
  const onlineDrivers = data?.online_drivers || [];
  const demand = data?.demand_unserved || { total: 0, by_region: [], recent: [] };
  const emergencies = data?.emergencies || [];
  const dailyMetrics = dailyReport?.metrics || {};
  const territory = data?.territory || {};
  const territories = territory.territories || [];
  const selectedTerritory = territory.active_territory || territories.find(item => item.id === selectedTerritoryId) || null;
  const scopeLabel = territory.scope_label || (selectedTerritory ? `Visualizando: ${selectedTerritory.name}` : 'Visualizando todos os territorios');
  const hasTerritoryFilter = Boolean(selectedTerritoryId);
  const recentDates = recentSaoPauloDates(7);

  return (
    <Box sx={{ maxWidth: 1320, mx: 'auto', px: 2, py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2 }}>
        <Box>
          <Typography sx={{ color: '#f0f4f8', fontSize: 22, fontWeight: 800 }}>Cockpit Operacional</Typography>
          <Typography sx={{ color: '#8a9aaa', fontSize: 12, mt: 0.5 }}>
            Piloto territorial do dia, atualizado automaticamente a cada 30 segundos
          </Typography>
          <Typography sx={{ color: '#FFD700', fontSize: 12, mt: 0.7, fontWeight: 750 }}>
            {scopeLabel}
          </Typography>
          {data?.generated_at && (
            <Typography sx={{ color: '#4f6172', fontSize: 11, mt: 0.5 }}>
              Ultima atualizacao: {fmtDateTime(data.generated_at)}
            </Typography>
          )}
        </Box>
        <Tooltip title="Atualizar agora">
          <IconButton size="small" onClick={() => { setLoading(true); load(); }}>
            <Refresh sx={{ color: '#FFD700', fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}


      <Box sx={{ ...sectionSx, mb: 3, display: 'flex', alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box>
          <Typography sx={{ color: '#f0f4f8', fontSize: 14, fontWeight: 800 }}>Filtro operacional</Typography>
          <Typography sx={{ color: '#66788a', fontSize: 11, mt: 0.4 }}>
            {hasTerritoryFilter ? 'Cards, listas e detalhe seguem o territorio selecionado.' : isTerritorialAdmin ? 'Visao consolidada dos seus territorios permitidos.' : 'Visao consolidada dos territorios permitidos para este usuario.'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: { xs: '100%', md: 420 } }}>
          <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#e8eef5', bgcolor: '#0b1118', '& fieldset': { borderColor: '#243444' }, '&:hover fieldset': { borderColor: '#3a4c5f' } }, '& .MuiInputLabel-root': { color: '#8193a5' } }}>
            <InputLabel id="territory-filter-label">Territorio</InputLabel>
            <Select
              labelId="territory-filter-label"
              value={selectedTerritoryId}
              label="Territorio"
              onChange={(event) => changeTerritory(event.target.value)}
              disabled={loading && !data}
            >
              <MenuItem value="">{isTerritorialAdmin ? 'Todos os meus territorios' : 'Todos os territorios'}</MenuItem>
              {territories.map(item => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}{item.city_name ? ` - ${item.city_name}` : ''}{item.uf ? `/${item.uf}` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {hasTerritoryFilter && (
            <Button variant="outlined" size="small" onClick={() => changeTerritory('')} sx={{ borderColor: '#2b3d4e', color: '#c9d3dc', whiteSpace: 'nowrap', textTransform: 'none' }}>
              Limpar
            </Button>
          )}
        </Box>
      </Box>


      <Box sx={{ ...sectionSx, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', md: 'row' }, mb: 2 }}>
          <SectionTitle title="Relatório diário" subtitle="Agregados reais por território de origem, sem limites de tela." />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: { xs: '100%', md: 420 } }}>
            <TextField
              type="date"
              size="small"
              value={dailyDate}
              onChange={(event) => setDailyDate(event.target.value || todaySaoPauloDate())}
              disabled={dailyLoading}
              sx={{ flex: 1, '& .MuiOutlinedInput-root': { color: '#e8eef5', bgcolor: '#0b1118', '& fieldset': { borderColor: '#243444' }, '&:hover fieldset': { borderColor: '#3a4c5f' } } }}
            />
            <Button onClick={loadDailyReport} disabled={dailyLoading} variant="outlined" size="small" sx={{ borderColor: '#2b3d4e', color: '#c9d3dc', whiteSpace: 'nowrap', textTransform: 'none' }}>
              {dailyLoading ? 'Carregando...' : 'Atualizar'}
            </Button>
            <Button
              onClick={copyDailySummary}
              disabled={dailyLoading || !dailyReport || Boolean(dailyError)}
              variant="contained"
              size="small"
              startIcon={<ContentCopy sx={{ fontSize: 15 }} />}
              sx={{
                bgcolor: '#B8942E',
                color: '#071018',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                textTransform: 'none',
                '&:hover': { bgcolor: '#D2AD45' },
                '&.Mui-disabled': { bgcolor: '#182330', color: '#566575' },
              }}
            >
              Copiar resumo
            </Button>
            <Button
              onClick={() => downloadDailyReportCsv(dailyReport)}
              disabled={dailyLoading || !dailyReport || Boolean(dailyError)}
              variant="outlined"
              size="small"
              startIcon={<FileDownload sx={{ fontSize: 15 }} />}
              sx={{
                borderColor: '#B8942E',
                color: '#D9C06A',
                fontWeight: 750,
                whiteSpace: 'nowrap',
                textTransform: 'none',
                '&:hover': { borderColor: '#D2AD45', bgcolor: 'rgba(184, 148, 46, 0.08)' },
                '&.Mui-disabled': { borderColor: '#243444', color: '#566575' },
              }}
            >
              Exportar CSV
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap', mb: 2 }}>
          {recentDates.map((date, index) => (
            <Chip
              key={date}
              label={recentDateLabel(date, index)}
              onClick={() => selectRecentDailyDate(date)}
              disabled={dailyLoading}
              variant={date === dailyDate ? 'filled' : 'outlined'}
              color={date === dailyDate ? 'warning' : 'default'}
              sx={{ height: 28, borderRadius: 1.5, fontSize: 11, fontWeight: date === dailyDate ? 800 : 700 }}
            />
          ))}
        </Box>
        {dailyError && <Alert severity="error" sx={{ mb: 2 }}>{dailyError}</Alert>}
        {dailyCopyStatus && (
          <Alert severity={dailyCopyStatus.startsWith('Resumo') ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {dailyCopyStatus}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }, gap: 1.2 }}>
          {[
            { label: 'Solicitadas', value: dailyMetrics.requested_rides ?? '-' },
            { label: 'Concluídas', value: dailyMetrics.completed_rides ?? '-' },
            { label: 'Canceladas', value: dailyMetrics.canceled_rides ?? '-' },
            { label: 'Sem motorista', value: dailyMetrics.no_driver_or_no_offer_rides ?? '-' },
            { label: 'Emergências', value: dailyMetrics.emergencies_registered ?? '-' },
            { label: 'Ativas agora', value: dailyMetrics.active_emergencies ?? '-' },
            { label: 'Receita final', value: fmtMoney(dailyMetrics.final_revenue_cents != null ? dailyMetrics.final_revenue_cents / 100 : null) },
            { label: 'Taxa KAVIAR', value: fmtMoney(dailyMetrics.kaviar_fee_cents != null ? dailyMetrics.kaviar_fee_cents / 100 : null) },
            { label: 'Ganho motorista', value: fmtMoney(dailyMetrics.driver_earnings_cents != null ? dailyMetrics.driver_earnings_cents / 100 : null) },
            { label: 'Até 1a oferta', value: fmtTime(dailyMetrics.avg_to_offer_seconds) },
          ].map(item => (
            <Box key={item.label} sx={{ bgcolor: '#111a22', border: '1px solid #1a2332', borderRadius: 2, p: 1.5, minHeight: 76 }}>
              <Typography sx={{ color: '#f0f4f8', fontSize: 19, fontWeight: 850, lineHeight: 1.1 }}>{item.value}</Typography>
              <Typography sx={{ color: '#7a8a9a', fontSize: 10, textTransform: 'uppercase', mt: 0.8, fontWeight: 750 }}>{item.label}</Typography>
            </Box>
          ))}
        </Box>
        {dailyReport?.scope_rules?.cross_territory && (
          <Typography sx={{ color: '#586b7d', fontSize: 11, mt: 1.5 }}>{dailyReport.scope_rules.cross_territory}</Typography>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 1.5, mb: 3 }}>
        {[
          { value: cards.drivers_online, label: 'Motoristas online', color: '#25D366' },
          { value: cards.active_rides, label: 'Corridas ativas', color: '#2196F3' },
          { value: cards.no_driver_today, label: 'Sem motorista hoje', color: '#f44336' },
          { value: cards.canceled_today, label: 'Canceladas hoje', color: '#FF9800' },
          { value: cards.active_emergencies, label: 'Emergências ativas', color: cards.active_emergencies > 0 ? '#f44336' : '#25D366' },
          { value: fmtTime(cards.avg_to_offer_seconds), label: 'Media ate 1a oferta', color: '#FFD700', isText: true },
        ].map(card => (
          <Box key={card.label} sx={cardSx}>
            <Typography sx={{ fontSize: card.isText ? 24 : 34, fontWeight: 850, color: card.color, lineHeight: 1 }}>
              {card.value ?? 0}
            </Typography>
            <Typography sx={{ fontSize: 10, color: '#7a8a9a', textTransform: 'uppercase', mt: 1, fontWeight: 700 }}>
              {card.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ ...sectionSx, mb: 3, borderColor: operationalAlerts.length > 0 ? '#5a4420' : '#1a2332', background: operationalAlerts.length > 0 ? 'linear-gradient(180deg, #111318 0%, #0d1117 100%)' : '#0d1117' }}>
        <SectionTitle title='Atenção operacional' subtitle='Ocorrências que podem exigir acompanhamento humano no escopo selecionado.' />
        {operationalAlerts.length > 0 ? (
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  {['Tipo', 'Severidade', 'Corrida', 'Passageiro / Motorista', 'Região', 'Atraso', 'Status', 'Horário'].map(h => (
                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {operationalAlerts.map(alert => {
                  const severity = OPERATIONAL_SEVERITY[alert.severity] || OPERATIONAL_SEVERITY.monitor;
                  return (
                    <TableRow
                      key={alert.id}
                      hover={Boolean(alert.ride_id)}
                      onClick={() => alert.ride_id && openRideDetail(alert.ride_id)}
                      sx={{ cursor: alert.ride_id ? 'pointer' : 'default', '&:hover': { bgcolor: alert.ride_id ? '#111a22' : 'transparent' } }}
                    >
                      <TableCell sx={bodyCellSx}>{alert.title}</TableCell>
                      <TableCell sx={bodyCellSx}>
                        <Chip label={severity.label} size='small' sx={{ height: 22, fontSize: 10, bgcolor: severity.color + '22', color: severity.color, fontWeight: 800 }} />
                      </TableCell>
                      <TableCell sx={bodyCellSx}>{alert.ride_id ? shortId(alert.ride_id) : '-'}</TableCell>
                      <TableCell sx={bodyCellSx}>{[alert.passenger_name, alert.driver_name].filter(Boolean).join(' / ') || '-'}</TableCell>
                      <TableCell sx={bodyCellSx}>{alert.region || '-'}</TableCell>
                      <TableCell sx={bodyCellSx}>{alert.overdue_minutes != null ? alert.overdue_minutes + ' min' : '-'}</TableCell>
                      <TableCell sx={bodyCellSx}><StatusChip status={alert.status} /></TableCell>
                      <TableCell sx={bodyCellSx}>{fmtHour(alert.occurred_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyBox label='Nenhuma ocorrência crítica no momento.' />
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)', gap: 1.5, mb: 3 }}>
        <Box sx={sectionSx}>
          <SectionTitle title="Corridas recentes e ativas" subtitle="Clique em uma corrida para ver a timeline operacional somente leitura." />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Status', 'Origem', 'Destino', 'Passageiro', 'Motorista', 'Região', 'Tempo', 'Atenção'].map(h => (
                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeRides.map(ride => (
                  <TableRow
                    key={ride.id}
                    hover
                    onClick={() => openRideDetail(ride.id)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#111a22' } }}
                  >
                    <TableCell sx={bodyCellSx}>
                      <StatusChip status={ride.status} />
                    </TableCell>
                    <CompactCell value={ride.origin_text} />
                    <CompactCell value={ride.destination_text} />
                    <TableCell sx={bodyCellSx}>{ride.passenger_name || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{ride.driver_name || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{ride.region || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{ride.minutes_since_request} min</TableCell>
                    <TableCell sx={bodyCellSx}>
                      {ride.attention ? (
                        <Chip label={ride.attention_reason || 'Revisar'} size="small" sx={{ height: 22, fontSize: 10, bgcolor: '#f4433622', color: '#ff8a80' }} />
                      ) : (
                        <Typography sx={{ color: '#506070', fontSize: 12 }}>Normal</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {activeRides.length === 0 && <EmptyRow columns={8} label={hasTerritoryFilter ? 'Nenhuma corrida ativa neste territorio.' : 'Nenhuma corrida ativa agora'} />}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={sectionSx}>
          <SectionTitle title="Motoristas online" subtitle="Ultima atualizacao operacional informada pelo app motorista." />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Motorista', 'Telefone', 'Base', 'Status', 'Atualizado'].map(h => (
                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {onlineDrivers.map(driver => (
                  <TableRow key={driver.id} sx={{ '&:hover': { bgcolor: '#111a22' } }}>
                    <TableCell sx={bodyCellSx}>{driver.name}</TableCell>
                    <TableCell sx={bodyCellSx}>{driver.phone || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{driver.base || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Chip
                        label={AVAILABILITY_LABELS[driver.availability] || driver.availability}
                        size="small"
                        sx={{ height: 21, fontSize: 10, bgcolor: driver.availability === 'busy' ? '#2196F322' : '#25D36622', color: driver.availability === 'busy' ? '#64B5F6' : '#25D366' }}
                      />
                    </TableCell>
                    <TableCell sx={bodyCellSx}>{fmtHour(driver.last_seen_at)}</TableCell>
                  </TableRow>
                ))}
                {onlineDrivers.length === 0 && <EmptyRow columns={5} label={hasTerritoryFilter ? 'Nenhum motorista online neste territorio.' : 'Nenhum motorista online agora'} />}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>


      <Box sx={{ ...sectionSx, mb: 3 }}>
        <SectionTitle title="Historico do dia" subtitle="Corridas concluidas, pagas ou encerradas hoje no escopo selecionado." />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Status', 'Conclusao', 'Passageiro', 'Motorista', 'Origem', 'Destino', 'Região', 'Valor final', 'Taxa KAVIAR', 'Ganho motorista'].map(h => (
                  <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {completedRides.map(ride => (
                <TableRow
                  key={ride.id}
                  hover
                  onClick={() => openRideDetail(ride.id)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#111a22' } }}
                >
                  <TableCell sx={bodyCellSx}><StatusChip status={ride.status} /></TableCell>
                  <TableCell sx={bodyCellSx}>{fmtHour(ride.completed_at)}</TableCell>
                  <TableCell sx={bodyCellSx}>{ride.passenger_name || '-'}</TableCell>
                  <TableCell sx={bodyCellSx}>{ride.driver_name || '-'}</TableCell>
                  <CompactCell value={ride.origin_text} />
                  <CompactCell value={ride.destination_text} />
                  <TableCell sx={bodyCellSx}>{ride.region || '-'}</TableCell>
                  <TableCell sx={bodyCellSx}>{fmtMoney(ride.final_price)}</TableCell>
                  <TableCell sx={bodyCellSx}>{fmtMoney(ride.platform_fee)}</TableCell>
                  <TableCell sx={bodyCellSx}>{fmtMoney(ride.driver_earnings)}</TableCell>
                </TableRow>
              ))}
              {completedRides.length === 0 && <EmptyRow columns={10} label={hasTerritoryFilter ? 'Nenhuma corrida finalizada hoje neste territorio.' : 'Nenhuma corrida finalizada hoje.'} />}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.5 }}>
        <Box sx={sectionSx}>
          <SectionTitle title="Demanda sem atendimento" subtitle="Pedidos encerrados como sem motorista hoje, agrupados por regiao de origem." />
          {demand.by_region.length > 0 ? (
            <Box sx={{ display: 'grid', gap: 1 }}>
              {demand.by_region.map(region => (
                <Box key={region.region} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a2332', py: 1 }}>
                  <Box>
                    <Typography sx={{ color: '#d8e0e8', fontSize: 13, fontWeight: 650 }}>{region.region}</Typography>
                    <Typography sx={{ color: '#647586', fontSize: 11 }}>Ultimo pedido: {fmtHour(region.last_requested_at)}</Typography>
                  </Box>
                  <Chip label={`${region.count} hoje`} size="small" sx={{ bgcolor: '#f4433622', color: '#ff8a80', fontSize: 10 }} />
                </Box>
              ))}
            </Box>
          ) : (
            <EmptyBox label={hasTerritoryFilter ? 'Nenhuma demanda sem atendimento neste territorio hoje.' : 'Nenhuma demanda sem atendimento registrada hoje'} />
          )}
        </Box>

        <Box sx={sectionSx}>
          <SectionTitle title="Emergências ativas" subtitle={isSuperAdmin ? 'Eventos ativos do botão de emergência.' : 'Detalhes disponiveis apenas para Super Admin.'} />
          {isSuperAdmin && emergencies.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Evento', 'Origem', 'Passageiro', 'Motorista', 'Criado', 'Rastro'].map(h => (
                      <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {emergencies.map(event => (
                    <TableRow key={event.id} sx={{ '&:hover': { bgcolor: '#111a22' } }}>
                      <TableCell sx={bodyCellSx}>{shortId(event.id)}</TableCell>
                      <TableCell sx={bodyCellSx}>{event.triggered_by_type}</TableCell>
                      <TableCell sx={bodyCellSx}>{event.passenger_name || '-'}</TableCell>
                      <TableCell sx={bodyCellSx}>{event.driver_name || '-'}</TableCell>
                      <TableCell sx={bodyCellSx}>{fmtHour(event.created_at)}</TableCell>
                      <TableCell sx={bodyCellSx}>{event.trail_points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <EmptyBox label={cards.active_emergencies > 0 ? `${cards.active_emergencies} emergencia(s) ativa(s)` : 'Nenhuma emergencia ativa agora'} />
          )}
        </Box>
      </Box>

      <RideDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        loading={detailLoading}
        error={detailError}
        detail={rideDetail}
        isSuperAdmin={isSuperAdmin}
        token={token}
        selectedTerritoryId={selectedTerritoryId}
        onNoteSaved={addOperationalNoteToDetail}
        onEmergencyFollowupSaved={addEmergencyFollowupToDetail}
      />
    </Box>
  );
}

function RideDetailDrawer({ open, onClose, loading, error, detail, isSuperAdmin, token, selectedTerritoryId, onNoteSaved, onEmergencyFollowupSaved }) {
  const ride = detail?.ride;
  const values = ride?.values || {};
  const [noteType, setNoteType] = useState('checked');
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [followupType, setFollowupType] = useState('emergency_seen');
  const [followupText, setFollowupText] = useState('');
  const [followupSaving, setFollowupSaving] = useState(false);
  const [followupError, setFollowupError] = useState('');

  const saveOperationalNote = async () => {
    const note = noteText.trim();
    if (!ride?.id || !note) {
      setNoteError('Escreva uma observação interna para registrar.');
      return;
    }

    try {
      setNoteSaving(true);
      setNoteError('');
      const query = selectedTerritoryId ? `?territory_id=${encodeURIComponent(selectedTerritoryId)}` : '';
      const res = await fetch(`${API_BASE_URL}/api/admin/operations/rides/${ride.id}/notes${query}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note_type: noteType, note }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Erro ao registrar observação interna.');
      }
      onNoteSaved?.(body.data);
      setNoteText('');
      setNoteType('checked');
    } catch (err) {
      console.error('[OPS_RIDE_NOTE]', err);
      setNoteError(err.message || 'Erro ao registrar observação interna.');
    } finally {
      setNoteSaving(false);
    }
  };

  const saveEmergencyFollowup = async () => {
    const note = followupText.trim();
    if (!ride?.id || !note) {
      setFollowupError('Escreva um acompanhamento de emergência para registrar.');
      return;
    }

    try {
      setFollowupSaving(true);
      setFollowupError('');
      const query = selectedTerritoryId ? '?territory_id=' + encodeURIComponent(selectedTerritoryId) : '';
      const res = await fetch(API_BASE_URL + '/api/admin/operations/rides/' + ride.id + '/emergency-followups' + query, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followup_type: followupType, note }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Erro ao registrar acompanhamento de emergência.');
      }
      onEmergencyFollowupSaved?.(body.data);
      setFollowupText('');
      setFollowupType('emergency_seen');
    } catch (err) {
      console.error('[OPS_EMERGENCY_FOLLOWUP]', err);
      setFollowupError(err.message || 'Erro ao registrar acompanhamento de emergência.');
    } finally {
      setFollowupSaving(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', md: 620 }, bgcolor: '#0b0f14', color: '#e8eef5' } }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 850 }}>Detalhe operacional</Typography>
            <Typography sx={{ color: '#6f8192', fontSize: 12 }}>{ride?.id ? `Corrida ${shortId(ride.id)}` : 'Cockpit somente leitura'}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><Close sx={{ color: '#8ea0b2' }} /></IconButton>
        </Box>

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: '#FFD700' }} /></Box>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && !error && detail && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Panel title="Dados basicos">
              <InfoGrid items={[
                ['Status', <StatusChip key="status" status={ride.status} />],
                ['Passageiro', ride.passenger?.name || '-'],
                ['Motorista', ride.driver?.name || '-'],
                ['Região', ride.region || '-'],
                ['Origem', ride.origin_text || '-'],
                ['Destino', ride.destination_text || '-'],
              ]} />
            </Panel>

            <Panel title="Horários principais">
              <InfoGrid items={[
                ['Solicitada', fmtDateTime(ride.requested_at)],
                ['Ofertada', fmtDateTime(ride.offered_at)],
                ['Aceita', fmtDateTime(ride.accepted_at)],
                ['Chegada', fmtDateTime(ride.arrived_at)],
                ['Inicio', fmtDateTime(ride.started_at)],
                ['Finalizacao', fmtDateTime(ride.completed_at)],
                ['Cancelamento', fmtDateTime(ride.canceled_at)],
              ]} />
            </Panel>

            <Panel title="Valores existentes">
              <InfoGrid items={[
                ['Estimado', fmtMoney(values.quoted_price)],
                ['Travado', fmtMoney(values.locked_price)],
                ['Ajustado', fmtMoney(values.adjusted_price)],
                ['Final', fmtMoney(values.final_price)],
                ['Taxa', fmtMoney(values.platform_fee)],
                ['Motorista', fmtMoney(values.driver_earnings)],
              ]} />
            </Panel>

            <Panel title="Alertas">
              {detail.attention_flags.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {detail.attention_flags.map(flag => (
                    <Chip key={flag.code} label={flag.label} size="small" sx={{ bgcolor: `${SEVERITY_COLORS[flag.severity] || '#777'}22`, color: SEVERITY_COLORS[flag.severity] || '#aaa' }} />
                  ))}
                </Box>
              ) : <EmptyBox label="Nenhum alerta operacional neste momento" />}
            </Panel>

            <Panel title="Timeline operacional">
              <Box sx={{ display: 'grid', gap: 1.2 }}>
                {detail.timeline.map((event, index) => (
                  <Box key={`${event.type}-${event.at}-${index}`} sx={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 1.5 }}>
                    <Typography sx={{ color: '#6f8192', fontSize: 11, pt: 0.2 }}>{fmtHour(event.at)}</Typography>
                    <Box sx={{ borderLeft: `2px solid ${SEVERITY_COLORS[event.severity] || '#263442'}`, pl: 1.5, pb: 1.2 }}>
                      <Typography sx={{ color: '#e5edf5', fontSize: 13, fontWeight: 750 }}>{event.title}</Typography>
                      {event.description && <Typography sx={{ color: '#7f91a3', fontSize: 12, mt: 0.2 }}>{event.description}</Typography>}
                    </Box>
                  </Box>
                ))}
                {detail.timeline.length === 0 && <EmptyBox label="Sem eventos de timeline" />}
              </Box>
            </Panel>

            <Panel title="Mensagens rapidas">
              <SimpleRows
                rows={detail.messages}
                empty="Nenhuma mensagem rapida registrada"
                render={message => (
                  <Box key={message.id} sx={rowSx}>
                    <Typography sx={{ color: '#d8e0e8', fontSize: 12, fontWeight: 700 }}>{message.sender_type}{' -> '}{message.recipient_type}</Typography>
                    <Typography sx={{ color: '#9aabbc', fontSize: 12 }}>{message.message_text}</Typography>
                    <Typography sx={{ color: '#586b7d', fontSize: 11 }}>{fmtDateTime(message.created_at)} {message.read_at ? `- lida ${fmtHour(message.read_at)}` : ''}</Typography>
                  </Box>
                )}
              />
            </Panel>

            <Panel title="Ofertas">
              <SimpleRows
                rows={detail.offers}
                empty="Nenhuma oferta registrada"
                render={offer => (
                  <Box key={offer.id} sx={rowSx}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ color: '#d8e0e8', fontSize: 12, fontWeight: 700 }}>{offer.driver?.name || 'Motorista não informado'}</Typography>
                      <Chip label={offer.status} size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#2196F322', color: '#64B5F6' }} />
                    </Box>
                    <Typography sx={{ color: '#7f91a3', fontSize: 11 }}>Enviada {fmtDateTime(offer.sent_at)} {offer.responded_at ? `- resposta ${fmtDateTime(offer.responded_at)}` : ''}</Typography>
                    {offer.territory_tier && <Typography sx={{ color: '#586b7d', fontSize: 11 }}>Territorio: {offer.territory_tier}</Typography>}
                  </Box>
                )}
              />
            </Panel>


            <Panel title="Observações internas">
              <Typography sx={{ color: '#9aabbc', fontSize: 12, mb: 1.5 }}>
                Visível apenas para a equipe KAVIAR.
              </Typography>
              <SimpleRows
                rows={detail.operational_notes || []}
                empty="Nenhuma observação interna registrada."
                render={note => (
                  <Box key={note.id} sx={rowSx}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                      <Chip label={NOTE_TYPE_LABELS[note.note_type] || 'Outra observação'} size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#FFD70022', color: '#FFD700', fontWeight: 750 }} />
                      <Typography sx={{ color: '#586b7d', fontSize: 11 }}>{fmtDateTime(note.created_at)}</Typography>
                    </Box>
                    <Typography sx={{ color: '#d8e0e8', fontSize: 12, mt: 1 }}>{note.note}</Typography>
                    <Typography sx={{ color: '#7f91a3', fontSize: 11, mt: 0.6 }}>{note.admin_name || 'Admin'}{note.admin_role ? ` - ${note.admin_role}` : ''}</Typography>
                  </Box>
                )}
              />
              <Box sx={{ display: 'grid', gap: 1.2, mt: 2 }}>
                <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#e8eef5', bgcolor: '#0b1118', '& fieldset': { borderColor: '#243444' }, '&:hover fieldset': { borderColor: '#3a4c5f' } }, '& .MuiInputLabel-root': { color: '#8193a5' } }}>
                  <InputLabel id="operation-note-type-label">Tipo</InputLabel>
                  <Select labelId="operation-note-type-label" value={noteType} label="Tipo" onChange={(event) => setNoteType(event.target.value)} disabled={noteSaving}>
                    {NOTE_TYPE_OPTIONS.map(item => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  value={noteText}
                  onChange={(event) => { setNoteText(event.target.value.slice(0, 500)); setNoteError(''); }}
                  placeholder="Registre o acompanhamento operacional desta corrida"
                  multiline
                  minRows={3}
                  inputProps={{ maxLength: 500 }}
                  disabled={noteSaving}
                  sx={{ '& .MuiOutlinedInput-root': { color: '#e8eef5', bgcolor: '#0b1118', '& fieldset': { borderColor: '#243444' }, '&:hover fieldset': { borderColor: '#3a4c5f' } } }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ color: noteText.length >= 480 ? '#FFD700' : '#586b7d', fontSize: 11 }}>{noteText.length}/500</Typography>
                  <Button onClick={saveOperationalNote} disabled={noteSaving || !noteText.trim()} variant="contained" size="small" sx={{ bgcolor: '#FFD700', color: '#0b0f14', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#e6c200' } }}>
                    {noteSaving ? 'Registrando...' : 'Registrar observação'}
                  </Button>
                </Box>
                {noteError && <Alert severity="error">{noteError}</Alert>}
              </Box>
            </Panel>

            <Panel title='Emergências'>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
                <Chip label={'Total: ' + detail.emergencies.total} size='small' sx={{ height: 22, fontSize: 10, bgcolor: '#263442', color: '#d8e0e8', fontWeight: 750 }} />
                {detail.emergencies.active > 0 && <Chip label='Emergência ativa' size='small' sx={{ height: 22, fontSize: 10, bgcolor: '#f4433622', color: '#ff8a80', fontWeight: 850 }} />}
                {detail.emergencies.active > 0 && <Chip label='Acompanhamento necessário' size='small' sx={{ height: 22, fontSize: 10, bgcolor: '#FFD70022', color: '#FFD700', fontWeight: 850 }} />}
              </Box>
              {isSuperAdmin ? (
                <SimpleRows
                  rows={detail.emergencies.items}
                  empty='Nenhuma emergência vinculada'
                  render={(event, index) => (
                    <Box key={event.id || index} sx={rowSx}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                        <Chip label={event.status === 'active' ? 'Ativa' : event.status} size='small' sx={{ height: 20, fontSize: 10, bgcolor: event.status === 'active' ? '#f4433622' : '#25D36622', color: event.status === 'active' ? '#ff8a80' : '#25D366', fontWeight: 750 }} />
                        <Typography sx={{ color: '#586b7d', fontSize: 11 }}>{fmtDateTime(event.created_at)}</Typography>
                      </Box>
                      <Typography sx={{ color: '#9aabbc', fontSize: 12, mt: 1 }}>{event.triggered_by_type || 'origem não informada'} - {event.trigger_source || '-'}</Typography>
                      <Typography sx={{ color: '#586b7d', fontSize: 11 }}>Pontos de trilha: {event.trail_points ?? '-'}</Typography>
                      {event.resolved_at && <Typography sx={{ color: '#586b7d', fontSize: 11 }}>Encerrada: {fmtDateTime(event.resolved_at)}</Typography>}
                      {event.resolution_notes && <Typography sx={{ color: '#7f91a3', fontSize: 11, mt: 0.6 }}>Notas: {event.resolution_notes}</Typography>}
                    </Box>
                  )}
                />
              ) : (
                <SimpleRows
                  rows={detail.emergencies.items}
                  empty='Nenhuma emergência vinculada'
                  render={(event, index) => (
                    <Box key={index} sx={rowSx}>
                      <Typography sx={{ color: '#d8e0e8', fontSize: 12, fontWeight: 700 }}>{event.status === 'active' ? 'Emergência ativa' : 'Emergência encerrada'}</Typography>
                      <Typography sx={{ color: '#586b7d', fontSize: 11 }}>{fmtDateTime(event.created_at)}{event.resolved_at ? ' - encerrada ' + fmtDateTime(event.resolved_at) : ''}</Typography>
                    </Box>
                  )}
                />
              )}

              {detail.emergencies.total > 0 && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #1d2a38' }}>
                  <Typography sx={{ color: '#d8e0e8', fontSize: 13, fontWeight: 800, mb: 0.5 }}>Acompanhamento de emergência</Typography>
                  <Typography sx={{ color: '#9aabbc', fontSize: 12, mb: 1.5 }}>Registro interno de acompanhamento. Não altera a corrida e não notifica passageiro ou motorista.</Typography>
                  <SimpleRows
                    rows={detail.emergencies.followups || []}
                    empty='Nenhum acompanhamento de emergência registrado.'
                    render={followup => (
                      <Box key={followup.id} sx={rowSx}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                          <Chip label={EMERGENCY_FOLLOWUP_LABELS[followup.followup_type] || 'Outro acompanhamento'} size='small' sx={{ height: 20, fontSize: 10, bgcolor: '#FFD70022', color: '#FFD700', fontWeight: 750 }} />
                          <Typography sx={{ color: '#586b7d', fontSize: 11 }}>{fmtDateTime(followup.created_at)}</Typography>
                        </Box>
                        <Typography sx={{ color: '#d8e0e8', fontSize: 12, mt: 1 }}>{followup.note}</Typography>
                        <Typography sx={{ color: '#7f91a3', fontSize: 11, mt: 0.6 }}>{followup.admin_name || 'Admin'}{followup.admin_role ? ' - ' + followup.admin_role : ''}</Typography>
                      </Box>
                    )}
                  />
                  <Box sx={{ display: 'grid', gap: 1.2, mt: 2 }}>
                    <FormControl size='small' fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#e8eef5', bgcolor: '#0b1118', '& fieldset': { borderColor: '#243444' }, '&:hover fieldset': { borderColor: '#3a4c5f' } }, '& .MuiInputLabel-root': { color: '#8193a5' } }}>
                      <InputLabel id='emergency-followup-type-label'>Tipo</InputLabel>
                      <Select labelId='emergency-followup-type-label' value={followupType} label='Tipo' onChange={(event) => setFollowupType(event.target.value)} disabled={followupSaving}>
                        {EMERGENCY_FOLLOWUP_OPTIONS.map(item => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField
                      value={followupText}
                      onChange={(event) => { setFollowupText(event.target.value.slice(0, 500)); setFollowupError(''); }}
                      placeholder='Registre o acompanhamento interno desta emergência'
                      multiline
                      minRows={3}
                      inputProps={{ maxLength: 500 }}
                      disabled={followupSaving}
                      sx={{ '& .MuiOutlinedInput-root': { color: '#e8eef5', bgcolor: '#0b1118', '& fieldset': { borderColor: '#243444' }, '&:hover fieldset': { borderColor: '#3a4c5f' } } }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ color: followupText.length >= 480 ? '#FFD700' : '#586b7d', fontSize: 11 }}>{followupText.length}/500</Typography>
                      <Button onClick={saveEmergencyFollowup} disabled={followupSaving || !followupText.trim()} variant='contained' size='small' sx={{ bgcolor: '#FFD700', color: '#0b0f14', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#e6c200' } }}>
                        {followupSaving ? 'Registrando...' : 'Registrar acompanhamento'}
                      </Button>
                    </Box>
                    {followupError && <Alert severity='error'>{followupError}</Alert>}
                  </Box>
                </Box>
              )}
            </Panel>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

function Panel({ title, children }) {
  return (
    <Box sx={{ bgcolor: '#0f151d', border: '1px solid #1d2a38', borderRadius: 2, p: 2 }}>
      <Typography sx={{ color: '#7f91a3', fontSize: 11, fontWeight: 850, textTransform: 'uppercase', mb: 1.5 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function InfoGrid({ items }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.2 }}>
      {items.map(([label, value]) => (
        <Box key={label}>
          <Typography sx={{ color: '#5f7285', fontSize: 10, textTransform: 'uppercase', fontWeight: 800 }}>{label}</Typography>
          <Typography component="div" sx={{ color: '#d8e0e8', fontSize: 13, mt: 0.3, overflowWrap: 'anywhere' }}>{value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function SimpleRows({ rows, empty, render }) {
  if (!rows || rows.length === 0) return <EmptyBox label={empty} />;
  return <Box sx={{ display: 'grid', gap: 1 }}>{rows.map(render)}</Box>;
}

function SectionTitle({ title, subtitle }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 12, color: '#7f91a3', fontWeight: 800, textTransform: 'uppercase' }}>{title}</Typography>
      <Typography sx={{ color: '#526577', fontSize: 11, mt: 0.3 }}>{subtitle}</Typography>
    </Box>
  );
}

function StatusChip({ status }) {
  return (
    <Chip
      label={STATUS_LABELS[status] || status}
      size="small"
      sx={{ height: 21, fontSize: 10, bgcolor: `${STATUS_COLORS[status] || '#666'}22`, color: STATUS_COLORS[status] || '#999' }}
    />
  );
}

function CompactCell({ value }) {
  return (
    <TableCell sx={{ ...bodyCellSx, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {value || '-'}
    </TableCell>
  );
}

function EmptyRow({ columns, label }) {
  return (
    <TableRow>
      <TableCell colSpan={columns} sx={{ textAlign: 'center', color: '#506070', borderColor: '#1a2332', py: 4, fontSize: 12 }}>
        {label}
      </TableCell>
    </TableRow>
  );
}

function EmptyBox({ label }) {
  return (
    <Box sx={{ border: '1px dashed #223142', borderRadius: 2, py: 4, px: 2, textAlign: 'center' }}>
      <Typography sx={{ color: '#506070', fontSize: 12 }}>{label}</Typography>
    </Box>
  );
}

const rowSx = {
  border: '1px solid #1d2a38',
  borderRadius: 1.5,
  p: 1.2,
  bgcolor: '#0b1118',
};

const headCellSx = {
  color: '#607487',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  borderColor: '#1a2332',
  py: 1,
};

const bodyCellSx = {
  color: '#c9d3dc',
  fontSize: 12,
  borderColor: '#1a2332',
  py: 1,
};
