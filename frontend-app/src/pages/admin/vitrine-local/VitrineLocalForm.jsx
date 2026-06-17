import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Button, TextField, MenuItem, Alert,
  FormControlLabel, Switch, Grid, Paper,
} from '@mui/material';
import { API_BASE_URL } from '../../../config/api';

const CATEGORIES = [
  { value: 'bar', label: 'Bar' },
  { value: 'mercearia', label: 'Mercearia' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'outro', label: 'Outro' },
];

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#111827', color: '#F5F5F5',
    '& fieldset': { borderColor: '#2A2A45' },
    '&:hover fieldset': { borderColor: '#C8A84E88' },
    '&.Mui-focused fieldset': { borderColor: '#C8A84E' },
  },
  '& .MuiInputLabel-root': { color: '#8888A0', '&.Mui-focused': { color: '#C8A84E' } },
  '& .MuiSelect-icon': { color: '#8888A0' },
  '& .MuiFormHelperText-root': { color: '#9CA3AF' },
};

const sectionSx = { bgcolor: '#0D0D1A', border: '1px solid #1A1A2E', borderRadius: 2, p: 3, mb: 3 };

export default function VitrineLocalForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '', trade_name: '', category: 'outro',
    phone: '', email: '', address: '',
    territory_id: '', neighborhood_id: '',
    is_active: true,
  });
  const [territories, setTerritories] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('kaviar_admin_token');
  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isManager = admin?.role === 'TERRITORIAL_MANAGER';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const terrUrl = isManager
      ? `${API_BASE_URL}/api/admin/commerce/my-territories`
      : `${API_BASE_URL}/api/admin/territories`;
    fetch(terrUrl, { headers }).then(r => r.json()).then(d => {
      const active = (d.data || []).filter(t => t.is_active !== false);
      setTerritories(active);
      if (active.length === 1 && !form.territory_id) {
        setForm(f => ({ ...f, territory_id: active[0].id }));
      }
    }).catch(() => {});
    fetch(`${API_BASE_URL}/api/governance/neighborhoods`, { headers })
      .then(r => r.json()).then(d => setNeighborhoods((d.data || []).filter(n => n.is_active)))
      .catch(() => {});
    if (isEdit) loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/commerce/accounts/${id}`, { headers });
      const d = await res.json();
      if (!d.success) { setError('Comércio não encontrado'); return; }
      const item = d.data;
      setForm({
        name: item.name || '', trade_name: item.trade_name || '',
        category: item.category || 'outro',
        phone: item.phone || '', email: item.email || '',
        address: item.address || '',
        territory_id: item.territory_id || '',
        neighborhood_id: item.neighborhood_id || '',
        is_active: Boolean(item.is_active),
      });
    } catch {
      setError('Erro ao carregar comércio');
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.territory_id) {
      setError('Preencha nome e selecione um território.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        trade_name: form.trade_name.trim() || null,
        category: form.category || 'outro',
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        territory_id: form.territory_id || null,
        neighborhood_id: form.neighborhood_id || null,
        is_active: form.is_active,
      };
      const url = isEdit
        ? `${API_BASE_URL}/api/admin/commerce/accounts/${id}`
        : `${API_BASE_URL}/api/admin/commerce/accounts`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST', headers,
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Erro ao salvar'); setLoading(false); return; }
      navigate('/admin/vitrine-local');
    } catch (err) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const filteredNeighborhoods = form.territory_id
    ? neighborhoods.filter(n => n.territory_id === form.territory_id)
    : [];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontSize: 11, color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.3 }}>
          KAVIAR Local
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#C8A84E' }}>
          {isEdit ? 'Editar comércio' : 'Novo comércio'}
        </Typography>
        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
          Comércios cadastrados aqui aparecem no app passageiro
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={sectionSx} elevation={0}>
        <Typography sx={{ fontSize: 12, color: '#C8A84E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>
          Identificação
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Nome *" value={form.name} onChange={handleChange('name')} placeholder="Ex: Mel Artesanal" sx={fieldSx} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Nome fantasia" value={form.trade_name} onChange={handleChange('trade_name')} placeholder="Nome exibido no app" sx={fieldSx} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth label="Categoria" value={form.category} onChange={handleChange('category')} sx={fieldSx}>
              {CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Telefone / WhatsApp" value={form.phone} onChange={handleChange('phone')} placeholder="+55 12 99999-9999" sx={fieldSx} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Email" value={form.email} onChange={handleChange('email')} sx={fieldSx} />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={sectionSx} elevation={0}>
        <Typography sx={{ fontSize: 12, color: '#C8A84E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>
          Localização
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              select fullWidth label="Território *"
              value={form.territory_id} onChange={handleChange('territory_id')}
              helperText="Passageiros deste território verão o comércio no app"
              sx={fieldSx}
            >
              <MenuItem value="">Selecione...</MenuItem>
              {territories.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}{t.uf ? ` (${t.uf})` : ''}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select fullWidth label="Bairro (opcional)"
              value={form.neighborhood_id} onChange={handleChange('neighborhood_id')}
              sx={fieldSx}
              disabled={!form.territory_id}
            >
              <MenuItem value="">Nenhum</MenuItem>
              {filteredNeighborhoods.map((n) => <MenuItem key={n.id} value={n.id}>{n.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Endereço" value={form.address} onChange={handleChange('address')} placeholder="Rua, número, bairro" sx={fieldSx} />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={sectionSx} elevation={0}>
        <Typography sx={{ fontSize: 12, color: '#C8A84E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
          Visibilidade no app
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#C8A84E' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#C8A84E' },
              }}
            />
          }
          label={
            <Typography sx={{ color: form.is_active ? '#C8A84E' : '#8888A0', fontWeight: 600, fontSize: 14 }}>
              {form.is_active ? 'Ativo — aparece no app passageiro' : 'Inativo — oculto no app'}
            </Typography>
          }
        />
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/admin/vitrine-local')}
          sx={{ borderColor: '#2A2A45', color: '#8888A0', px: 4, '&:hover': { borderColor: '#C8A84E44', color: '#C8A84E' } }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ bgcolor: '#C8A84E', color: '#0D0D1A', fontWeight: 700, px: 4, '&:hover': { bgcolor: '#B8982E' } }}
        >
          {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar comércio'}
        </Button>
      </Box>
    </Container>
  );
}
