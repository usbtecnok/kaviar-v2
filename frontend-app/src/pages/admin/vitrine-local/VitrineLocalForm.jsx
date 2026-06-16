import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Button, TextField, MenuItem, Alert,
  FormControlLabel, Switch, Grid, Paper,
} from '@mui/material';
import { adminApi } from '../../../services/adminApi';

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
  '& input::placeholder, & textarea::placeholder': { color: '#555570', opacity: 1 },
};

const sectionSx = { bgcolor: '#0D0D1A', border: '1px solid #1A1A2E', borderRadius: 2, p: 3, mb: 3 };

export default function VitrineLocalForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '',
    category: 'outro',
    description: '',
    region_slug: '',
    territory_id: '',
    whatsapp: '',
    address: '',
    logo_url: '',
    is_active: true,
  });
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.get('/api/admin/local-businesses/territories').then(d => setTerritories(d.data || [])).catch(() => {});
    if (isEdit) loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadItem = async () => {
    try {
      const res = await adminApi.getLocalBusiness(id);
      const item = res.data;
      setForm({
        name: item.name || '',
        category: item.category || 'outro',
        description: item.description || '',
        region_slug: item.region_slug || '',
        territory_id: item.territory_id || '',
        whatsapp: item.whatsapp || '',
        address: item.address || '',
        logo_url: item.logo_url || '',
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
    if (!form.name.trim() || (!form.territory_id && !form.region_slug.trim())) {
      setError('Preencha nome e selecione um território.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category || 'outro',
        description: form.description.trim() || null,
        region_slug: form.region_slug.trim() || form.territory_id || '',
        territory_id: form.territory_id || null,
        whatsapp: form.whatsapp.trim() || null,
        address: form.address.trim() || null,
        logo_url: form.logo_url.trim() || null,
        is_active: form.is_active,
      };
      if (isEdit) {
        await adminApi.updateLocalBusiness(id, payload);
      } else {
        await adminApi.createLocalBusiness(payload);
      }
      navigate('/admin/vitrine-local');
    } catch (err) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontSize: 11, color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.3 }}>
          Vitrine Local
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#C8A84E' }}>
          {isEdit ? 'Editar comércio' : 'Novo comércio'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Identificação */}
      <Paper sx={sectionSx} elevation={0}>
        <Typography sx={{ fontSize: 12, color: '#C8A84E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>
          Identificação
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={7}>
            <TextField
              fullWidth label="Nome *" value={form.name}
              onChange={handleChange('name')}
              placeholder="Ex: Bar do Halfe"
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField
              select fullWidth label="Categoria"
              value={form.category} onChange={handleChange('category')}
              sx={fieldSx}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth multiline rows={3} label="Descrição"
              value={form.description} onChange={handleChange('description')}
              placeholder="Breve descrição do comércio"
              sx={fieldSx}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Localização */}
      <Paper sx={sectionSx} elevation={0}>
        <Typography sx={{ fontSize: 12, color: '#C8A84E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>
          Localização
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              select fullWidth label="Território *"
              value={form.territory_id} onChange={handleChange('territory_id')}
              helperText="Selecione o território onde o comércio opera"
              sx={fieldSx}
            >
              <MenuItem value="">Selecione...</MenuItem>
              {territories.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}{t.uf ? ` (${t.uf})` : ''}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Endereço"
              value={form.address} onChange={handleChange('address')}
              placeholder="Rua, número, bairro"
              sx={fieldSx}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Contato e visual */}
      <Paper sx={sectionSx} elevation={0}>
        <Typography sx={{ fontSize: 12, color: '#C8A84E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>
          Contato e visual
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="WhatsApp"
              value={form.whatsapp} onChange={handleChange('whatsapp')}
              placeholder="Ex: +55 21 99999-9999"
              sx={fieldSx}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Logo (URL)"
              value={form.logo_url} onChange={handleChange('logo_url')}
              placeholder="https://..."
              sx={fieldSx}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Status */}
      <Paper sx={sectionSx} elevation={0}>
        <Typography sx={{ fontSize: 12, color: '#C8A84E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
          Status
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
              {form.is_active ? 'Ativo (aparece na vitrine)' : 'Inativo (oculto)'}
            </Typography>
          }
        />
      </Paper>

      {/* Ações */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/admin/vitrine-local')}
          sx={{
            borderColor: '#2A2A45', color: '#8888A0', px: 4,
            '&:hover': { borderColor: '#C8A84E44', color: '#C8A84E' },
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{
            bgcolor: '#C8A84E', color: '#0D0D1A', fontWeight: 700, px: 4,
            '&:hover': { bgcolor: '#B8982E' },
          }}
        >
          {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Cadastrar comércio'}
        </Button>
      </Box>
    </Container>
  );
}
