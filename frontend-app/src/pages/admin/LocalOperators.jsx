import { useState, useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, Grid, Chip, TextField, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { Phone, Add, Edit, Close } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const STATUS_MAP = {
  interested: { label: 'Interessado', color: 'warning' },
  in_conversation: { label: 'Em conversa', color: 'info' },
  pilot: { label: 'Piloto', color: 'secondary' },
  active: { label: 'Ativo', color: 'success' },
  paused: { label: 'Pausado', color: 'default' },
  discarded: { label: 'Descartado', color: 'error' },
};

const ROLES = ['Presidente', 'Liderança', 'Vereador', 'Representante local', 'Outro'];

const emptyForm = { organization_name: '', responsible_name: '', responsible_role: '', phone: '', email: '', community: '', neighborhood: '', city: '', source: 'site', notes: '', next_followup_at: '', drivers_referred: 0, drivers_approved: 0 };

export default function LocalOperators() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchOperators = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterCity) params.set('city', filterCity);
      const res = await fetch(`${API_BASE_URL}/api/admin/local-operators?${params}`, { headers });
      const data = await res.json();
      if (data.success) setOperators(data.data);
      else setError('Erro ao carregar');
    } catch { setError('Erro de conexão'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOperators(); }, [filterStatus, filterCity]);

  const handleSave = async () => {
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_BASE_URL}/api/admin/local-operators/${editingId}` : `${API_BASE_URL}/api/admin/local-operators`;
    const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { setDialogOpen(false); setForm(emptyForm); setEditingId(null); fetchOperators(); }
  };

  const handleStatusChange = async (id, status) => {
    await fetch(`${API_BASE_URL}/api/admin/local-operators/${id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) });
    fetchOperators();
  };

  const openEdit = (op) => {
    setForm({ ...op, next_followup_at: op.next_followup_at ? op.next_followup_at.slice(0, 16) : '' });
    setEditingId(op.id);
    setDialogOpen(true);
  };

  const openNew = () => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); };

  const counts = operators.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#C8A84E' }} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 700 }}>Associações / Operadores Locais</Typography>
        <Button startIcon={<Add />} variant="contained" onClick={openNew} sx={{ bgcolor: '#C8A84E', color: '#0a0a0a', fontWeight: 700, '&:hover': { bgcolor: '#A08030' } }}>Novo</Button>
      </Box>

      {/* Counters */}
      <Grid container spacing={1} sx={{ mb: 3 }}>
        {Object.entries(STATUS_MAP).map(([key, { label, color }]) => (
          <Grid item key={key}>
            <Chip label={`${label}: ${counts[key] || 0}`} color={color} size="small" variant={filterStatus === key ? 'filled' : 'outlined'}
              onClick={() => setFilterStatus(filterStatus === key ? '' : key)} sx={{ cursor: 'pointer' }} />
          </Grid>
        ))}
      </Grid>

      {/* City filter */}
      <TextField size="small" placeholder="Filtrar por cidade..." value={filterCity} onChange={e => setFilterCity(e.target.value)}
        sx={{ mb: 2, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#333' } }, '& .MuiInputBase-input::placeholder': { color: '#666' } }} />

      {/* List */}
      {operators.length === 0 ? (
        <Typography sx={{ color: '#666', textAlign: 'center', py: 4 }}>Nenhum operador encontrado</Typography>
      ) : (
        <Grid container spacing={2}>
          {operators.map(op => (
            <Grid item xs={12} md={6} key={op.id}>
              <Card sx={{ bgcolor: '#111', border: '1px solid #222', borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography sx={{ color: '#C8A84E', fontWeight: 700, fontSize: 14 }}>{op.organization_name}</Typography>
                      <Typography sx={{ color: '#aaa', fontSize: 12 }}>{op.responsible_name} — {op.responsible_role}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => window.open(`https://wa.me/55${op.phone.replace(/\D/g, '')}`, '_blank')} sx={{ color: '#25D366' }}><Phone fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => openEdit(op)} sx={{ color: '#C8A84E' }}><Edit fontSize="small" /></IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip label={STATUS_MAP[op.status]?.label || op.status} color={STATUS_MAP[op.status]?.color || 'default'} size="small" />
                    {op.city && <Chip label={op.city} size="small" variant="outlined" sx={{ borderColor: '#333', color: '#aaa' }} />}
                    {op.community && <Chip label={op.community} size="small" variant="outlined" sx={{ borderColor: '#333', color: '#aaa' }} />}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, fontSize: 11, color: '#888' }}>
                    <span>📞 {op.phone}</span>
                    <span>🚗 {op.drivers_referred} indicados</span>
                    <span>✅ {op.drivers_approved} aprovados</span>
                  </Box>
                  {op.notes && <Typography sx={{ color: '#666', fontSize: 11, mt: 1, fontStyle: 'italic' }}>{op.notes}</Typography>}
                  {op.next_followup_at && <Typography sx={{ color: '#A08030', fontSize: 11, mt: 0.5 }}>⏰ Retorno: {new Date(op.next_followup_at).toLocaleDateString('pt-BR')}</Typography>}
                  {/* Status quick actions */}
                  <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {Object.entries(STATUS_MAP).filter(([k]) => k !== op.status).map(([key, { label }]) => (
                      <Chip key={key} label={label} size="small" variant="outlined" onClick={() => handleStatusChange(op.id, key)}
                        sx={{ cursor: 'pointer', fontSize: 10, borderColor: '#333', color: '#888', '&:hover': { borderColor: '#C8A84E', color: '#C8A84E' } }} />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#111', color: '#fff' } }}>
        <DialogTitle sx={{ color: '#C8A84E', display: 'flex', justifyContent: 'space-between' }}>
          {editingId ? 'Editar Operador' : 'Novo Operador'}
          <IconButton onClick={() => setDialogOpen(false)} sx={{ color: '#666' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Nome da Associação" required value={form.organization_name} onChange={e => setForm({ ...form, organization_name: e.target.value })} size="small" fullWidth InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Responsável" required value={form.responsible_name} onChange={e => setForm({ ...form, responsible_name: e.target.value })} size="small" InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: '#888' }}>Cargo</InputLabel>
              <Select value={form.responsible_role} onChange={e => setForm({ ...form, responsible_role: e.target.value })} label="Cargo" sx={{ color: '#fff' }}>
                {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="WhatsApp" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} size="small" placeholder="21999999999" InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
            <TextField label="E-mail" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} size="small" InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
            <TextField label="Comunidade" value={form.community || ''} onChange={e => setForm({ ...form, community: e.target.value })} size="small" InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
            <TextField label="Bairro" value={form.neighborhood || ''} onChange={e => setForm({ ...form, neighborhood: e.target.value })} size="small" InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
            <TextField label="Cidade" value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} size="small" InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
          </Box>
          <TextField label="Origem do lead" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} size="small" placeholder="site, whatsapp, indicação, evento" InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
          <TextField label="Observações" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} size="small" multiline rows={2} InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
          <TextField label="Próximo retorno" type="datetime-local" value={form.next_followup_at || ''} onChange={e => setForm({ ...form, next_followup_at: e.target.value })} size="small" InputLabelProps={{ shrink: true, sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Motoristas indicados" type="number" value={form.drivers_referred} onChange={e => setForm({ ...form, drivers_referred: parseInt(e.target.value) || 0 })} size="small" InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
            <TextField label="Motoristas aprovados" type="number" value={form.drivers_approved} onChange={e => setForm({ ...form, drivers_approved: parseInt(e.target.value) || 0 })} size="small" InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#fff' } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#888' }}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#C8A84E', color: '#0a0a0a', fontWeight: 700 }}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
