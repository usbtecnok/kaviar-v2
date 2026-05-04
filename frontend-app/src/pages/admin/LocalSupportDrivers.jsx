import { useState, useEffect } from 'react';
import { Container, Typography, Box, Alert, CircularProgress, TextField, MenuItem, Button, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Chip } from '@mui/material';
import { API_BASE_URL } from '../../config/api';
import SupportDriverCard from '../../components/admin/SupportDriverCard';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'interested', label: 'Interessado' },
  { value: 'eligible', label: 'Elegível' },
  { value: 'participating', label: 'Participando' },
  { value: 'paused', label: 'Pausado' },
  { value: 'future_contact', label: 'Contato futuro' },
];

export default function LocalSupportDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const [driversRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/local-support/drivers${qs}`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/local-support/summary`, { headers }),
      ]);
      const driversJson = await driversRes.json();
      const summaryJson = await summaryRes.json();

      if (!driversRes.ok) throw new Error(driversJson.error || 'Erro ao carregar');
      setDrivers(driversJson.data || []);
      if (summaryJson.success) setSummary(summaryJson.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const openEdit = (entry) => {
    setEditEntry(entry);
    setEditForm({
      status: entry.status || 'interested',
      primary_area: entry.primary_area || '',
      operational_notes: entry.operational_notes || '',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/local-support/drivers/${editEntry.driver_id}`, {
        method: 'PUT', headers, body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar');
      setEditEntry(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800, mb: 0.5 }}>
        🤝 Motoristas Parceiros de Apoio Local
      </Typography>
      <Typography sx={{ color: '#6B6045', fontSize: 12, mb: 2 }}>
        Participação voluntária · Sem vínculo · Sem exclusividade
      </Typography>

      {/* Summary chips */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label={`Total: ${summary.total_drivers}`} size="small" sx={{ bgcolor: '#C8A84E18', color: '#C8A84E', fontWeight: 600 }} />
          {summary.by_status?.map(s => (
            <Chip key={s.status} label={`${s.status}: ${s._count.id}`} size="small" sx={{ bgcolor: '#ffffff08', color: '#9CA3AF', fontSize: 11 }} />
          ))}
        </Box>
      )}

      {/* Filter */}
      <TextField
        select size="small" label="Status" value={statusFilter}
        onChange={e => setStatusFilter(e.target.value)}
        sx={{ mb: 2, minWidth: 180, '& .MuiInputBase-root': { color: '#E0DDD5', bgcolor: '#111217' }, '& .MuiInputLabel-root': { color: '#6B6045' } }}
      >
        {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </TextField>

      {error && <Alert severity="error" sx={{ mb: 2, bgcolor: '#1a1a1a', color: '#ef5350' }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#C8A84E' }} />
        </Box>
      ) : drivers.length === 0 ? (
        <Alert severity="info" sx={{ bgcolor: '#111217', color: '#9CA3AF' }}>
          Nenhum motorista parceiro registrado{statusFilter ? ' com esse filtro' : ''}.
        </Alert>
      ) : (
        drivers.map(d => <SupportDriverCard key={d.id} entry={d} onEdit={openEdit} />)
      )}

      {/* Edit dialog */}
      <Dialog open={!!editEntry} onClose={() => setEditEntry(null)} PaperProps={{ sx: { bgcolor: '#111217', color: '#E0DDD5', minWidth: 360 } }}>
        <DialogTitle sx={{ color: '#C8A84E' }}>Editar Participação</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Status" value={editForm.status || ''} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
            sx={{ mt: 1, mb: 2, '& .MuiInputBase-root': { color: '#E0DDD5' }, '& .MuiInputLabel-root': { color: '#6B6045' } }}>
            {STATUS_OPTIONS.filter(o => o.value).map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Área principal" value={editForm.primary_area || ''} onChange={e => setEditForm(p => ({ ...p, primary_area: e.target.value }))}
            sx={{ mb: 2, '& .MuiInputBase-root': { color: '#E0DDD5' }, '& .MuiInputLabel-root': { color: '#6B6045' } }} />
          <TextField fullWidth multiline rows={2} label="Notas operacionais" value={editForm.operational_notes || ''} onChange={e => setEditForm(p => ({ ...p, operational_notes: e.target.value }))}
            sx={{ '& .MuiInputBase-root': { color: '#E0DDD5' }, '& .MuiInputLabel-root': { color: '#6B6045' } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditEntry(null)} sx={{ color: '#9CA3AF' }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} sx={{ color: '#C8A84E' }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
