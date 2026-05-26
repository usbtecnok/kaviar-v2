import { useState, useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, Grid, Chip, IconButton, TextField, Button, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import { Add, Pets, ArrowBack } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const ROLE_LABELS = { PET_OPERATOR: 'Operador', PET_SUPERVISOR: 'Supervisor', PET_ADMIN: 'Admin Pet' };

export default function PetOperators() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'PET_OPERATOR' });
  const [saving, setSaving] = useState(false);

  const token = () => localStorage.getItem('kaviar_admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  useEffect(() => { fetchOperators(); }, []);

  const fetchOperators = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pet/operators`, { headers: headers() });
      const json = await res.json();
      if (json.success) setOperators(json.data);
      else setError(json.error);
    } catch { setError('Erro ao carregar operadores'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pet/operators`, { method: 'POST', headers: headers(), body: JSON.stringify(form) });
      const json = await res.json();
      if (json.success) { setDialog(false); setForm({ name: '', email: '', phone: '', password: '', role: 'PET_OPERATOR' }); fetchOperators(); }
      else setError(json.error);
    } catch { setError('Erro ao criar operador'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (op) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pet/operators/${op.id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ is_active: !op.is_active }) });
      const json = await res.json();
      if (json.success) fetchOperators();
    } catch {}
  };

  if (loading) return <Container maxWidth="lg" sx={{ mt: 4 }}><Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: '#b8960c' }} /></Box></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Button component={Link} to="/admin/pet" startIcon={<ArrowBack />} size="small" sx={{ color: '#888', textTransform: 'none' }}>Central Pet</Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Pets sx={{ color: '#b8960c', fontSize: 28 }} />
          <Typography variant="h5" fontWeight="700" sx={{ color: '#E8E3D5' }}>Operadores KAVIAR Pet</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)} sx={{ bgcolor: '#b8960c', '&:hover': { bgcolor: '#d4af37' }, textTransform: 'none' }}>
          Novo operador
        </Button>
      </Box>

      <Box sx={{ mb: 3, p: 2, bgcolor: '#1a1a2e', borderRadius: 1, border: '1px solid #333' }}>
        <Typography variant="body2" sx={{ color: '#aaa' }}>
          Operadores Pet têm acesso restrito à Central KAVIAR Pet. Somente SUPER_ADMIN pode cadastrar ou inativar operadores.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {operators.length === 0 ? (
        <Card sx={{ bgcolor: '#111217', border: '1px solid #222' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" sx={{ color: '#888' }}>Nenhum operador Pet cadastrado ainda.</Typography>
            <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>Clique em "Novo operador" para começar.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {operators.map((op) => (
            <Grid item xs={12} sm={6} md={4} key={op.id}>
              <Card sx={{ bgcolor: '#111217', border: '1px solid #222' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="700" sx={{ color: '#E8E3D5' }}>{op.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#888' }}>{op.email}</Typography>
                      {op.phone && <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>{op.phone}</Typography>}
                    </Box>
                    <Chip label={op.is_active ? 'Ativo' : 'Inativo'} size="small" sx={{ bgcolor: op.is_active ? '#1b5e20' : '#424242', color: '#fff', fontWeight: 600 }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Chip label={ROLE_LABELS[op.role] || op.role} size="small" variant="outlined" sx={{ borderColor: '#b8960c', color: '#b8960c' }} />
                    <FormControlLabel
                      control={<Switch checked={op.is_active} onChange={() => toggleActive(op)} size="small" sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#b8960c' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#b8960c' } }} />}
                      label=""
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1a1a2e', color: '#E8E3D5' } }}>
        <DialogTitle>Novo Operador KAVIAR Pet</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Nome completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth required InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#E8E3D5' } }} />
            <TextField label="E-mail" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} fullWidth required InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#E8E3D5' } }} />
            <TextField label="WhatsApp" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} fullWidth placeholder="(21) 99999-9999" InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#E8E3D5' } }} />
            <TextField label="Senha inicial" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} fullWidth required helperText="Operador deverá trocar no primeiro login" InputLabelProps={{ sx: { color: '#888' } }} InputProps={{ sx: { color: '#E8E3D5' } }} FormHelperTextProps={{ sx: { color: '#666' } }} />
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#888' }}>Role</InputLabel>
              <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} label="Role" sx={{ color: '#E8E3D5' }}>
                <MenuItem value="PET_OPERATOR">Operador</MenuItem>
                <MenuItem value="PET_SUPERVISOR">Supervisor</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)} sx={{ color: '#888' }}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !form.name || !form.email || !form.password} variant="contained" sx={{ bgcolor: '#b8960c', '&:hover': { bgcolor: '#d4af37' } }}>
            {saving ? 'Criando...' : 'Criar operador'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
