import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, TextField, MenuItem, Alert, FormControlLabel, Switch, Grid, Paper } from '@mui/material';
import { adminApi } from '../../../services/adminApi';

const TYPES = [
  { value: 'commerce', label: 'Comércio' },
  { value: 'association', label: 'Associação' },
  { value: 'condo', label: 'Condomínio' },
  { value: 'tourism', label: 'Turismo' },
  { value: 'service', label: 'Serviço' },
  { value: 'notice', label: 'Aviso' },
];

const ICONS = ['🏪', '🏘️', '🏢', '🗺️', '🔧', '📢', '🎵', '💼', '🤝', '📍'];

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
    title: '', description: '', icon: '🏪', type: 'commerce',
    community_id: '', neighborhood_id: '', cta_label: '', cta_url: '',
    is_active: false, priority: 0, starts_at: '', ends_at: '', exposure_quota: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [communities, setCommunities] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);

  useEffect(() => {
    loadOptions();
    if (isEdit) loadItem();
  }, [id]);

  const loadOptions = async () => {
    try {
      const [c, n] = await Promise.all([
        adminApi.get('/api/admin/communities').catch(() => ({ data: [] })),
        adminApi.get('/api/neighborhoods').catch(() => ({ data: [] })),
      ]);
      setCommunities(c.data || c.communities || []);
      setNeighborhoods(n.data || n.neighborhoods || []);
    } catch {}
  };

  const loadItem = async () => {
    try {
      const data = await adminApi.getShowcaseItem(id);
      const item = data.data;
      setForm({
        title: item.title, description: item.description, icon: item.icon, type: item.type,
        community_id: item.community_id || '', neighborhood_id: item.neighborhood_id || '',
        cta_label: item.cta_label, cta_url: item.cta_url,
        is_active: item.is_active, priority: item.priority || 0,
        starts_at: item.starts_at ? item.starts_at.slice(0, 10) : '',
        ends_at: item.ends_at ? item.ends_at.slice(0, 10) : '',
        exposure_quota: item.exposure_quota != null ? item.exposure_quota : '',
      });
    } catch { setError('Erro ao carregar item'); }
  };

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.cta_label || !form.cta_url) {
      setError('Preencha título, descrição, texto do botão e URL'); return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, priority: Number(form.priority) || 0, exposure_quota: form.exposure_quota !== '' ? Number(form.exposure_quota) : null, community_id: form.community_id || null, neighborhood_id: form.neighborhood_id || null, starts_at: form.starts_at || null, ends_at: form.ends_at || null };
      if (isEdit) await adminApi.updateShowcaseItem(id, payload);
      else await adminApi.createShowcaseItem(payload);
      navigate('/admin/vitrine-local');
    } catch (err) { setError(err.message || 'Erro ao salvar'); }
    finally { setLoading(false); }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontSize: 11, color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.3 }}>Vitrine Local</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#C8A84E' }}>{isEdit ? 'Editar anúncio' : 'Novo anúncio'}</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Conteúdo */}
      <Paper sx={sectionSx} elevation={0}>
        <Typography sx={{ fontSize: 12, color: '#C8A84E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Conteúdo do anúncio</Typography>
        <Grid container spacing={2}>
          <Grid item xs={3} sm={2}>
            <TextField select fullWidth label="Ícone" value={form.icon} onChange={handleChange('icon')} sx={fieldSx}>
              {ICONS.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={9} sm={5}>
            <TextField fullWidth label="Título *" value={form.title} onChange={handleChange('title')} placeholder="Ex: Comércio local em Furnas" sx={fieldSx} />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField select fullWidth label="Tipo" value={form.type} onChange={handleChange('type')} sx={fieldSx}>
              {TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={3} label="Descrição *" value={form.description} onChange={handleChange('description')} placeholder="Texto que aparece no card do passageiro" sx={fieldSx} />
          </Grid>
        </Grid>
      </Paper>

      {/* CTA */}
      <Paper sx={sectionSx} elevation={0}>
        <Typography sx={{ fontSize: 12, color: '#C8A84E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Botão de ação (CTA)</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Texto do botão *" value={form.cta_label} onChange={handleChange('cta_label')} placeholder="Ex: Chamar no WhatsApp" sx={fieldSx} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="URL do botão *" value={form.cta_url} onChange={handleChange('cta_url')} placeholder="https://wa.me/55..." sx={fieldSx} />
          </Grid>
        </Grid>
      </Paper>

      {/* Segmentação */}
      <Paper sx={sectionSx} elevation={0}>
        <Typography sx={{ fontSize: 12, color: '#C8A84E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>Segmentação</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Comunidade" value={form.community_id} onChange={handleChange('community_id')} sx={fieldSx}>
              <MenuItem value="">Global (todas)</MenuItem>
              {communities.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Bairro" value={form.neighborhood_id} onChange={handleChange('neighborhood_id')} sx={fieldSx}>
              <MenuItem value="">Todos</MenuItem>
              {neighborhoods.map(n => <MenuItem key={n.id} value={n.id}>{n.name}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Validade e status */}
      <Paper sx={sectionSx} elevation={0}>
        <Typography sx={{ fontSize: 12, color: '#C8A84E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>Validade e status</Typography>
        <Typography sx={{ fontSize: 12, color: '#9CA3AF', mb: 2.5, lineHeight: 1.5 }}>O anúncio pode ser encerrado por data, por cota de exposições ou manualmente.</Typography>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={6} sm={4}>
            <TextField fullWidth type="date" label="Início (opcional)" value={form.starts_at} onChange={handleChange('starts_at')} InputLabelProps={{ shrink: true }} sx={fieldSx} helperText="Vazio = imediato" />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth type="date" label="Fim (opcional)" value={form.ends_at} onChange={handleChange('ends_at')} InputLabelProps={{ shrink: true }} sx={fieldSx} helperText="Vazio = sem prazo" />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField fullWidth type="number" label="Prioridade" value={form.priority} onChange={handleChange('priority')} sx={fieldSx} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Cota de exposições (opcional)" value={form.exposure_quota} onChange={handleChange('exposure_quota')} sx={fieldSx} helperText="Vazio = ilimitado (∞)" placeholder="Ex: 500" inputProps={{ min: 0 }} />
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', minHeight: 56 }}>
            <FormControlLabel
              control={<Switch checked={form.is_active} onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#C8A84E' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#C8A84E' } }} />}
              label={<Typography sx={{ color: form.is_active ? '#C8A84E' : '#8888A0', fontWeight: 600, fontSize: 14 }}>{form.is_active ? 'Ativo' : 'Inativo'}</Typography>}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Ações */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={() => navigate('/admin/vitrine-local')} sx={{ borderColor: '#2A2A45', color: '#8888A0', px: 4, '&:hover': { borderColor: '#C8A84E44', color: '#C8A84E' } }}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading} sx={{ bgcolor: '#C8A84E', color: '#0D0D1A', fontWeight: 700, px: 4, '&:hover': { bgcolor: '#B8982E' } }}>
          {loading ? 'Salvando...' : 'Salvar anúncio'}
        </Button>
      </Box>
    </Container>
  );
}
