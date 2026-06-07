import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip, TextField,
  Select, MenuItem, FormControl, InputLabel, Button, CircularProgress, Alert,
  Pagination
} from '@mui/material';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('kaviar_admin_token');
}

async function api(path, params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  const url = `${API}/api/admin/women-preference${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function SummaryCards({ summary }) {
  const items = [
    { label: 'Passageiras opt-in', value: summary.passengers_opted_in, color: '#e8f5e9' },
    { label: 'Motoristas opt-in', value: summary.drivers_opted_in, color: '#e3f2fd' },
    { label: 'Opt-outs totais', value: summary.total_opt_outs, color: '#fff3e0' },
    { label: 'Eventos registrados', value: summary.total_events, color: '#f3e5f5' },
    { label: 'Preferência padrão ativa', value: summary.passengers_prefer_default, color: '#e0f7fa' },
    { label: 'Feature flag', value: summary.feature_enabled ? 'ON' : 'OFF', color: summary.feature_enabled ? '#c8e6c9' : '#ffcdd2' },
  ];
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {items.map((item) => (
        <Grid item xs={6} sm={4} md={2} key={item.label}>
          <Card sx={{ bgcolor: item.color, height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{item.value}</Typography>
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function ParticipantsTab() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actorType, setActorType] = useState('passenger');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/participants', { actor_type: actorType, status, search, limit, offset: (page - 1) * limit });
      setData(res.data);
      setTotal(res.total);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [actorType, status, search, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Tipo</InputLabel>
          <Select value={actorType} label="Tipo" onChange={(e) => { setActorType(e.target.value); setPage(1); }}>
            <MenuItem value="passenger">Passageira</MenuItem>
            <MenuItem value="driver">Motorista</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="active">Ativo</MenuItem>
            <MenuItem value="inactive">Inativo</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" placeholder="Buscar nome ou email" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 200 }} />
        <Button variant="outlined" size="small" onClick={() => { setPage(1); load(); }}>Filtrar</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : data.length === 0 ? (
        <Alert severity="info">Nenhum participante encontrado.</Alert>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Telefone</TableCell>
                  <TableCell>Opt-in</TableCell>
                  <TableCell>Adesão em</TableCell>
                  <TableCell>Versão</TableCell>
                  {actorType === 'passenger' && <TableCell>Pref. padrão</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.phone}</TableCell>
                    <TableCell><Chip label={row.women_matching_opt_in ? 'Sim' : 'Não'} color={row.women_matching_opt_in ? 'success' : 'default'} size="small" /></TableCell>
                    <TableCell>{row.women_matching_opted_in_at ? new Date(row.women_matching_opted_in_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                    <TableCell>{row.women_matching_consent_version || '—'}</TableCell>
                    {actorType === 'passenger' && <TableCell><Chip label={row.prefer_woman_driver_default ? 'Sim' : 'Não'} size="small" color={row.prefer_woman_driver_default ? 'primary' : 'default'} /></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination count={Math.ceil(total / limit)} page={page} onChange={(_, p) => setPage(p)} />
          </Box>
        </>
      )}
    </Box>
  );
}

function EventsTab() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actorType, setActorType] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/events', { actor_type: actorType, action, limit, offset: (page - 1) * limit });
      setData(res.data);
      setTotal(res.total);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [actorType, action, page]);

  useEffect(() => { load(); }, [load]);

  const actionLabels = { opt_in: 'Opt-in', opt_out: 'Opt-out', default_preference_enabled: 'Pref. ativada', default_preference_disabled: 'Pref. desativada' };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Tipo</InputLabel>
          <Select value={actorType} label="Tipo" onChange={(e) => { setActorType(e.target.value); setPage(1); }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="passenger">Passageira</MenuItem>
            <MenuItem value="driver">Motorista</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Ação</InputLabel>
          <Select value={action} label="Ação" onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="opt_in">Opt-in</MenuItem>
            <MenuItem value="opt_out">Opt-out</MenuItem>
            <MenuItem value="default_preference_enabled">Pref. ativada</MenuItem>
            <MenuItem value="default_preference_disabled">Pref. desativada</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : data.length === 0 ? (
        <Alert severity="info">Nenhum evento registrado.</Alert>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Ação</TableCell>
                  <TableCell>Actor ID</TableCell>
                  <TableCell>Versão</TableCell>
                  <TableCell>Fonte</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.created_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell><Chip label={row.actor_type} size="small" /></TableCell>
                    <TableCell><Chip label={actionLabels[row.action] || row.action} size="small" color={row.action === 'opt_in' ? 'success' : row.action === 'opt_out' ? 'warning' : 'default'} /></TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{row.actor_id.slice(0, 8)}…</TableCell>
                    <TableCell>{row.consent_version || '—'}</TableCell>
                    <TableCell>{row.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination count={Math.ceil(total / limit)} page={page} onChange={(_, p) => setPage(p)} />
          </Box>
        </>
      )}
    </Box>
  );
}

export default function WomenPreferenceAudit() {
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/summary').then(setSummary).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        🚺 Preferência por Motorista Mulher — Auditoria
      </Typography>
      {summary && <SummaryCards summary={summary} />}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Participantes" />
        <Tab label="Eventos" />
      </Tabs>
      {tab === 0 && <ParticipantsTab />}
      {tab === 1 && <EventsTab />}
    </Box>
  );
}
