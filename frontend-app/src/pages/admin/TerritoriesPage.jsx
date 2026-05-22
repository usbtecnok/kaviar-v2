import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Grid, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, CircularProgress } from '@mui/material';
import { Add, Public, LocationCity, Map, Visibility } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const STATUS_COLORS = { planning: '#6B7280', preparation: '#D97706', active: '#059669', inactive: '#DC2626' };
const STATUS_LABELS = { planning: 'Planejamento', preparation: 'Preparação', active: 'Ativo', inactive: 'Inativo' };
const REG_COLORS = { not_evaluated: '#6B7280', in_review: '#D97706', credentialing_required: '#EA580C', controlled_operation: '#2563EB', approved: '#059669', blocked: '#DC2626', suspended: '#DC2626' };
const REG_LABELS = { not_evaluated: 'Não avaliado', in_review: 'Em análise', credentialing_required: 'Exige credenciamento', controlled_operation: 'Operação controlada', approved: 'Aprovado', blocked: 'Bloqueado', suspended: 'Suspenso' };
const LEVEL_ICONS = { country: <Public />, state: <Map />, city: <LocationCity />, region: <Map />, operation: <LocationCity /> };
const LEVEL_LABELS = { country: 'País', state: 'Estado', city: 'Cidade', region: 'Região', operation: 'Operação' };

export default function TerritoriesPage() {
  const navigate = useNavigate();
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', level: 'city', status: 'planning', parent_id: '', uf: '', city_name: '', notes: '' });

  const token = localStorage.getItem('kaviar_admin_token');

  const fetchTerritories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTerritories(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchTerritories(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const body = { ...form, parent_id: form.parent_id || null, uf: form.uf || null, city_name: form.city_name || null, notes: form.notes || null };
      const res = await fetch(`${API_BASE_URL}/api/admin/territories`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) { setOpen(false); setForm({ name: '', level: 'city', status: 'planning', parent_id: '', uf: '', city_name: '', notes: '' }); fetchTerritories(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleToggleStatus = async (t) => {
    const newStatus = t.status === 'active' ? 'inactive' : 'active';
    if (!confirm(`${newStatus === 'inactive' ? 'Inativar' : 'Ativar'} território "${t.name}"?`)) return;
    await fetch(`${API_BASE_URL}/api/admin/territories/${t.id}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }),
    });
    fetchTerritories();
  };

  const handleDelete = async (t) => {
    if (!confirm(`ATENÇÃO: Deletar permanentemente o território "${t.name}"?\n\nEsta ação não pode ser desfeita. Se o território tiver vínculos, a exclusão será bloqueada.`)) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/territories/${t.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) { fetchTerritories(); }
    else { alert(data.error || 'Erro ao deletar'); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress sx={{ color: '#B8942E' }} /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800 }}>🌍 Territórios Operacionais</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>Novo Território</Button>
      </Box>

      <Grid container spacing={2}>
        {territories.map((t) => (
          <Grid item xs={12} sm={6} md={4} key={t.id}>
            <Card sx={{ border: '1px solid #E8E5DE', borderTop: `3px solid ${STATUS_COLORS[t.status] || '#6B7280'}`, '&:hover': { boxShadow: '0 4px 12px rgba(184,148,46,0.15)' } }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: '#B8942E' }}>{LEVEL_ICONS[t.level] || <Map />}</Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1A1A1A' }}>{t.name}</Typography>
                  </Box>
                  <Chip label={STATUS_LABELS[t.status] || t.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[t.status]}15`, color: STATUS_COLORS[t.status], fontWeight: 600 }} />
                  <Chip label={REG_LABELS[t.regulatory_status] || 'Não avaliado'} size="small" sx={{ bgcolor: `${REG_COLORS[t.regulatory_status] || '#6B7280'}12`, color: REG_COLORS[t.regulatory_status] || '#6B7280', fontWeight: 500, fontSize: 10 }} />
                </Box>
                <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>{LEVEL_LABELS[t.level] || t.level}{t.uf ? ` • ${t.uf}` : ''}{t.parent?.name ? ` • ${t.parent.name}` : ''}</Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>📍 {t._count?.neighborhoods || 0} bairros</Typography>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>🤝 {t._count?.territorial_partners || 0} parceiros</Typography>
                  <Typography variant="caption" sx={{ color: '#6B7280' }}>👤 {t._count?.admin_access || 0} admins</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button size="small" startIcon={<Visibility />} onClick={() => navigate(`/admin/territories/${t.id}`)} sx={{ color: '#B8942E' }}>Detalhes</Button>
                  <Button size="small" onClick={() => handleToggleStatus(t)} sx={{ color: t.status === 'active' ? '#DC2626' : '#059669' }}>{t.status === 'active' ? 'Inativar' : 'Ativar'}</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(t)}>Deletar</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#C8A84E', fontWeight: 700 }}>Novo Território</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
          <TextField label="Tipo" select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} fullWidth>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField label="Status Inicial" select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} fullWidth>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField label="Território Pai" select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} fullWidth>
            <MenuItem value="">Nenhum (raiz)</MenuItem>
            {territories.map((t) => <MenuItem key={t.id} value={t.id}>{t.name} ({LEVEL_LABELS[t.level]})</MenuItem>)}
          </TextField>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="UF" value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase().slice(0, 2) })} sx={{ width: 100 }} />
            <TextField label="Cidade" value={form.city_name} onChange={(e) => setForm({ ...form, city_name: e.target.value })} fullWidth />
          </Box>
          <TextField label="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline rows={2} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!form.name || saving} variant="contained" sx={{ bgcolor: '#B8942E' }}>{saving ? 'Criando...' : 'Criar Território'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
