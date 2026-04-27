import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, IconButton, Tooltip
} from '@mui/material';
import { Shield, Visibility, CheckCircle, Warning } from '@mui/icons-material';
import api from '../../api';

const STATUS_MAP = {
  active: { label: 'Ativo', color: 'error' },
  resolved: { label: 'Resolvido', color: 'success' },
  false_alarm: { label: 'Falso alarme', color: 'warning' },
};

export default function EmergencyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveStatus, setResolveStatus] = useState('resolved');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const { data } = await api.get(`/api/admin/emergency-events${params}`);
      setEvents(data.data || []);
    } catch (e) {
      setError('Erro ao carregar incidentes');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, [filter]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const { data } = await api.get(`/api/admin/emergency-events/${id}`);
      setDetail(data.data);
    } catch { setError('Erro ao carregar detalhes'); }
    finally { setDetailLoading(false); }
  };

  const handleResolve = async () => {
    if (!detail || resolveNotes.trim().length < 3) return;
    setResolving(true);
    try {
      await api.patch(`/api/admin/emergency-events/${detail.id}/resolve`, {
        status: resolveStatus,
        resolution_notes: resolveNotes.trim(),
      });
      setResolveOpen(false);
      setResolveNotes('');
      setDetailOpen(false);
      setDetail(null);
      fetchEvents();
    } catch { setError('Erro ao resolver incidente'); }
    finally { setResolving(false); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

  const snap = detail?.snapshot || {};

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Shield color="error" />
        <Typography variant="h5" fontWeight={700}>Incidentes de Emergência</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {['', 'active', 'resolved', 'false_alarm'].map(s => (
          <Chip key={s} label={s ? STATUS_MAP[s]?.label : 'Todos'} variant={filter === s ? 'filled' : 'outlined'}
            color={s ? STATUS_MAP[s]?.color : 'default'} onClick={() => setFilter(s)} sx={{ cursor: 'pointer', ...(!s && { borderColor: '#888', color: '#fff' }) }} />
        ))}
      </Box>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Corrida</TableCell>
                <TableCell>Acionado por</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Pontos GPS</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Nenhum incidente registrado</TableCell></TableRow>
              )}
              {events.map(ev => {
                const s = ev.snapshot || {};
                const byLabel = ev.triggered_by_type === 'passenger'
                  ? `Passageiro: ${s.passenger?.name || ev.triggered_by_id}`
                  : `Motorista: ${s.driver?.name || ev.triggered_by_id}`;
                return (
                  <TableRow key={ev.id} hover>
                    <TableCell>{fmtDate(ev.created_at)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{ev.ride_id.slice(0, 8)}…</TableCell>
                    <TableCell>{byLabel}</TableCell>
                    <TableCell><Chip size="small" label={STATUS_MAP[ev.status]?.label || ev.status} color={STATUS_MAP[ev.status]?.color || 'default'} /></TableCell>
                    <TableCell>{ev._count?.location_trail ?? 0}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver detalhes"><IconButton size="small" onClick={() => openDetail(ev.id)}><Visibility fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onClose={() => { setDetailOpen(false); setDetail(null); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield color="error" /> Detalhes do Incidente
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? <CircularProgress /> : detail && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Corrida</Typography>
                  <Typography fontFamily="monospace" fontSize={13}>{detail.ride_id}</Typography>
                  <Typography variant="body2" mt={1}>Status no momento: <strong>{snap.ride_status}</strong></Typography>
                  <Typography variant="body2">Tipo: {snap.ride_type}</Typography>
                  {snap.quoted_price && <Typography variant="body2">Preço: R$ {Number(snap.quoted_price).toFixed(2)}</Typography>}
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Acionamento</Typography>
                  <Typography variant="body2">Por: <strong>{detail.triggered_by_type === 'passenger' ? 'Passageiro' : 'Motorista'}</strong></Typography>
                  <Typography variant="body2">Data: {fmtDate(detail.created_at)}</Typography>
                  <Typography variant="body2">Status: <Chip size="small" label={STATUS_MAP[detail.status]?.label} color={STATUS_MAP[detail.status]?.color} /></Typography>
                </Paper>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Passageiro</Typography>
                  <Typography variant="body2">{snap.passenger?.name || '—'}</Typography>
                  <Typography variant="body2" color="text.secondary">{snap.passenger?.phone || '—'}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Motorista</Typography>
                  <Typography variant="body2">{snap.driver?.name || '—'}</Typography>
                  <Typography variant="body2" color="text.secondary">{snap.driver?.phone || '—'} • {snap.driver?.vehicle_plate || '—'}</Typography>
                </Paper>
              </Box>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>Rota</Typography>
                <Typography variant="body2">Origem: {snap.origin_text || `${snap.origin_lat}, ${snap.origin_lng}`}</Typography>
                <Typography variant="body2">Destino: {snap.dest_text || `${snap.dest_lat}, ${snap.dest_lng}`}</Typography>
              </Paper>

              {detail.location_trail?.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>Trilha de localização ({detail.location_trail.length} pontos)</Typography>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    <Table size="small">
                      <TableHead><TableRow><TableCell>Hora</TableCell><TableCell>Lat</TableCell><TableCell>Lng</TableCell><TableCell>Fonte</TableCell></TableRow></TableHead>
                      <TableBody>
                        {detail.location_trail.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell sx={{ fontSize: 12 }}>{fmtDate(p.captured_at)}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{Number(p.lat).toFixed(6)}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{Number(p.lng).toFixed(6)}</TableCell>
                            <TableCell sx={{ fontSize: 12 }}>{p.source}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              )}

              {detail.resolved_by && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Resolução</Typography>
                  <Typography variant="body2">Por: {detail.resolved_by}</Typography>
                  <Typography variant="body2">Data: {fmtDate(detail.resolved_at)}</Typography>
                  <Typography variant="body2">Notas: {detail.resolution_notes}</Typography>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {detail?.status === 'active' && (
            <Button variant="contained" color="warning" startIcon={<CheckCircle />} onClick={() => setResolveOpen(true)}>
              Resolver
            </Button>
          )}
          <Button onClick={() => { setDetailOpen(false); setDetail(null); }}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Resolve dialog */}
      <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolver Incidente</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select value={resolveStatus} label="Status" onChange={e => setResolveStatus(e.target.value)}>
              <MenuItem value="resolved">Resolvido</MenuItem>
              <MenuItem value="false_alarm">Falso alarme</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Notas de resolução" multiline rows={3} value={resolveNotes} onChange={e => setResolveNotes(e.target.value)}
            required helperText="Mínimo 3 caracteres" fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleResolve} disabled={resolving || resolveNotes.trim().length < 3}>
            {resolving ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
