import { useState, useEffect } from 'react';
import { Container, Typography, Box, TextField, Button, Table, TableBody, TableCell, TableHead, TableRow, Chip, IconButton, MenuItem, Alert, Tooltip, Paper } from '@mui/material';
import { ContentCopy, OpenInNew, Block } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const gold = '#C8A84E';
const headSx = { color: '#9CA3AF', borderColor: '#1A1A2E', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' };
const cellSx = { color: '#E8E3D5', borderColor: '#1A1A2E' };
const STATUS = { pending: { label: 'Pendente', color: '#FCD34D', bg: 'rgba(251,191,36,0.15)' }, paid: { label: 'Pago', color: '#86EFAC', bg: 'rgba(34,197,94,0.15)' }, expired: { label: 'Expirado', color: '#CBD5E1', bg: 'rgba(148,163,184,0.14)' }, waived: { label: 'Dispensado', color: '#94A3B8', bg: 'rgba(148,163,184,0.14)' } };

function getToken() { return localStorage.getItem('kaviar_admin_token'); }
async function api(method, path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, ...(body && { body: JSON.stringify(body) }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

export default function CompensationsPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [rideId, setRideId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      const data = await api('GET', '/api/admin/compensations');
      setItems(data.data || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const filtered = filter ? items.filter(i => i.status === filter) : items;

  const handleCreate = async () => {
    if (!rideId.trim()) { setError('Informe o ID da corrida'); return; }
    setError(''); setSuccess(''); setLoading(true);
    try {
      const data = await api('POST', '/api/admin/compensations', { ride_id: rideId.trim() });
      setSuccess(`Compensação gerada: ${data.data?.id}`);
      setRideId('');
      load();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleWaive = async (id) => {
    if (!confirm('Dispensar esta compensação?')) return;
    try {
      await api('PATCH', `/api/admin/compensations/${id}/waive`, { reason: 'Dispensado pelo admin' });
      load();
    } catch (e) { setError(e.message); }
  };

  const copy = (text) => { navigator.clipboard.writeText(text); };
  const fmtDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';
  const fmtMoney = (cents) => `R$ ${(cents / 100).toFixed(2)}`;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontSize: 11, color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.3 }}>Operações</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: gold }}>💰 Compensações por Deslocamento</Typography>
      </Box>

      {/* Gerar */}
      <Paper sx={{ bgcolor: '#0D0D1A', border: '1px solid #1A1A2E', borderRadius: 2, p: 3, mb: 3 }} elevation={0}>
        <Typography sx={{ color: gold, fontWeight: 600, fontSize: 14, mb: 2 }}>Gerar compensação</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField size="small" label="ID da corrida" value={rideId} onChange={e => setRideId(e.target.value)} placeholder="UUID da corrida cancelada"
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { color: '#E8E3D5', bgcolor: '#111827', '& fieldset': { borderColor: '#2A2A45' } }, '& .MuiInputLabel-root': { color: '#9CA3AF' } }} />
          <Button variant="contained" onClick={handleCreate} disabled={loading} sx={{ bgcolor: gold, color: '#0a0a0a', fontWeight: 700, '&:hover': { bgcolor: '#B8982E' } }}>
            {loading ? 'Gerando...' : 'Gerar Pix'}
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </Paper>

      {/* Filtro */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField select size="small" label="Status" value={filter} onChange={e => setFilter(e.target.value)} sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { color: '#E8E3D5', bgcolor: '#111827', '& fieldset': { borderColor: '#2A2A45' } }, '& .MuiInputLabel-root': { color: '#9CA3AF' } }}>
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
        </TextField>
        <Typography sx={{ color: '#9CA3AF', fontSize: 13 }}>{filtered.length} compensação{filtered.length !== 1 ? 'ões' : ''}</Typography>
      </Box>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Typography sx={{ color: '#555570', textAlign: 'center', py: 6 }}>Nenhuma compensação registrada</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>Corrida</TableCell>
              <TableCell sx={headSx}>Valor</TableCell>
              <TableCell sx={headSx}>Créditos</TableCell>
              <TableCell sx={headSx}>Status</TableCell>
              <TableCell sx={headSx}>Criado</TableCell>
              <TableCell sx={headSx}>Pago</TableCell>
              <TableCell sx={headSx}>Pix</TableCell>
              <TableCell align="right" sx={headSx}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(c => {
              const st = STATUS[c.status] || STATUS.pending;
              return (
                <TableRow key={c.id}>
                  <TableCell sx={cellSx}><Typography sx={{ fontSize: 12, fontFamily: 'monospace', color: '#E8E3D5' }}>{c.ride_id?.substring(0, 8)}…</Typography></TableCell>
                  <TableCell sx={cellSx}>{fmtMoney(c.amount_cents)}</TableCell>
                  <TableCell sx={cellSx}>{c.credits_amount}</TableCell>
                  <TableCell sx={cellSx}><Chip label={st.label} size="small" sx={{ bgcolor: st.bg, color: st.color, border: `1px solid ${st.color}33` }} /></TableCell>
                  <TableCell sx={cellSx}><Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(c.created_at)}</Typography></TableCell>
                  <TableCell sx={cellSx}><Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>{fmtDate(c.paid_at)}</Typography></TableCell>
                  <TableCell sx={{ borderColor: '#1A1A2E' }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {c.pix_copy_paste && <Tooltip title="Copiar Pix"><IconButton size="small" onClick={() => copy(c.pix_copy_paste)} sx={{ color: gold }}><ContentCopy fontSize="small" /></IconButton></Tooltip>}
                      {c.invoice_url && <Tooltip title="Abrir fatura"><IconButton size="small" onClick={() => window.open(c.invoice_url, '_blank')} sx={{ color: '#42A5F5' }}><OpenInNew fontSize="small" /></IconButton></Tooltip>}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ borderColor: '#1A1A2E' }}>
                    {c.status === 'pending' && <Tooltip title="Dispensar"><IconButton size="small" onClick={() => handleWaive(c.id)} sx={{ color: '#FFA726' }}><Block fontSize="small" /></IconButton></Tooltip>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Container>
  );
}
