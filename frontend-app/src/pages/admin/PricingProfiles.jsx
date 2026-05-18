import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Grid, Chip
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import api from '../../api/index';

const FIELD_LABELS = {
  base_fare: 'Preço base (R$)',
  per_km: 'Valor por km (R$)',
  per_minute: 'Valor por minuto (R$)',
  minimum_fare: 'Preço mínimo (R$)',
  fee_local: 'Taxa LOCAL / Área 1 (%)',
  fee_adjacent: 'Taxa ADJACENT / Região próxima (%)',
  fee_external: 'Taxa EXTERNAL / Área 2 (%)',
  surcharge_external: 'Adicional Área 2 (R$)',
};

const EDITABLE_FIELDS = Object.keys(FIELD_LABELS);

const DEFAULTS = {
  base_fare: 4.50, per_km: 2.00, per_minute: 0.25, minimum_fare: 8.00,
  fee_local: 12, fee_adjacent: 15, fee_external: 22, surcharge_external: 5.00,
  credit_cost_local: 1, credit_cost_external: 2, max_dispatch_km: 12,
  center_lat: '', center_lng: '', radius_km: '',
};

const CREATE_FIELDS = [
  { key: 'slug', label: 'Slug (identificador único)', type: 'text' },
  { key: 'name', label: 'Nome do perfil', type: 'text' },
  { key: 'base_fare', label: 'Preço base (R$)' },
  { key: 'per_km', label: 'Valor por km (R$)' },
  { key: 'per_minute', label: 'Valor por minuto (R$)' },
  { key: 'minimum_fare', label: 'Preço mínimo (R$)' },
  { key: 'fee_local', label: 'Taxa LOCAL (%)' },
  { key: 'fee_adjacent', label: 'Taxa ADJACENT (%)' },
  { key: 'fee_external', label: 'Taxa EXTERNAL (%)' },
  { key: 'surcharge_external', label: 'Adicional Área 2 (R$)' },
  { key: 'credit_cost_local', label: 'Crédito LOCAL' },
  { key: 'credit_cost_external', label: 'Crédito EXTERNAL' },
  { key: 'max_dispatch_km', label: 'Máximo despacho (km)' },
  { key: 'center_lat', label: 'Latitude central' },
  { key: 'center_lng', label: 'Longitude central' },
  { key: 'radius_km', label: 'Raio (km)' },
];

export default function PricingProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editProfile, setEditProfile] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({});
  const [createPassword, setCreatePassword] = useState('');
  const [createReason, setCreateReason] = useState('');

  const loadProfiles = async () => {
    try {
      const { data } = await api.get('/api/admin/pricing-profiles');
      if (data.success) setProfiles(data.data);
    } catch (err) {
      setError('Erro ao carregar perfis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfiles(); }, []);

  const openEdit = (profile) => {
    setEditProfile(profile);
    const values = {};
    EDITABLE_FIELDS.forEach(f => { values[f] = parseFloat(profile[f]) || 0; });
    setFormValues(values);
    setPassword('');
    setReason('');
    setError('');
  };

  const handleSave = async () => {
    setError('');
    if (!password) { setError('Senha é obrigatória'); return; }
    if (reason.trim().length < 10) { setError('Motivo deve ter pelo menos 10 caracteres'); return; }

    const changes = {};
    EDITABLE_FIELDS.forEach(f => {
      const newVal = parseFloat(formValues[f]);
      const oldVal = parseFloat(editProfile[f]);
      if (!isNaN(newVal) && newVal !== oldVal) changes[f] = newVal;
    });

    if (Object.keys(changes).length === 0) { setError('Nenhum valor foi alterado'); return; }

    try {
      const { data } = await api.put(`/api/admin/pricing-profiles/${editProfile.slug}`, {
        ...changes, password, reason: reason.trim()
      });
      if (data.success) {
        setSuccess(`Perfil "${editProfile.name}" atualizado com sucesso`);
        setEditProfile(null);
        loadProfiles();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const hasChanges = () => {
    if (!editProfile) return false;
    return EDITABLE_FIELDS.some(f => parseFloat(formValues[f]) !== parseFloat(editProfile[f]));
  };

  const openCreate = () => {
    setCreateForm({ slug: '', name: '', ...DEFAULTS });
    setCreatePassword('');
    setCreateReason('');
    setCreateOpen(true);
    setError('');
  };

  const fillDefaults = () => setCreateForm(f => ({ ...f, ...DEFAULTS }));

  const handleCreate = async () => {
    setError('');
    if (!createForm.slug || !createForm.name) { setError('Slug e nome são obrigatórios'); return; }
    if (!createPassword) { setError('Senha é obrigatória'); return; }
    if (createReason.trim().length < 10) { setError('Motivo deve ter pelo menos 10 caracteres'); return; }

    const payload = { password: createPassword, reason: createReason.trim() };
    CREATE_FIELDS.forEach(({ key, type }) => {
      const v = createForm[key];
      if (type === 'text') payload[key] = v || '';
      else if (v !== '' && v !== null && v !== undefined) payload[key] = parseFloat(v);
      else payload[key] = null;
    });

    try {
      const { data } = await api.post('/api/admin/pricing-profiles', payload);
      if (data.success) {
        setSuccess('Perfil criado com sucesso');
        setCreateOpen(false);
        loadProfiles();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar perfil');
    }
  };

  const geoMissing = !createForm.center_lat && !createForm.center_lng && !createForm.radius_km;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>Configuração de Preços e Taxas</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ajuste os valores usados nas estimativas de corrida. As alterações valem apenas para novas corridas e exigem senha, motivo e auditoria.
      </Typography>
      {error && !editProfile && !createOpen && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Button variant="contained" sx={{ mb: 2 }} onClick={openCreate}>Criar Perfil</Button>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Perfil</strong></TableCell>
              <TableCell align="right">Base</TableCell>
              <TableCell align="right">Por km</TableCell>
              <TableCell align="right">Mínimo</TableCell>
              <TableCell align="right">LOCAL</TableCell>
              <TableCell align="right">ADJ</TableCell>
              <TableCell align="right">EXT</TableCell>
              <TableCell align="right">+Área 2</TableCell>
              <TableCell align="right">Créd. Local</TableCell>
              <TableCell align="right">Créd. Ext.</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {profiles.map(p => (
              <TableRow key={p.slug}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{p.slug}</Typography>
                </TableCell>
                <TableCell align="right">R$ {parseFloat(p.base_fare).toFixed(2)}</TableCell>
                <TableCell align="right">R$ {parseFloat(p.per_km).toFixed(2)}</TableCell>
                <TableCell align="right">R$ {parseFloat(p.minimum_fare).toFixed(2)}</TableCell>
                <TableCell align="right">{parseFloat(p.fee_local)}%</TableCell>
                <TableCell align="right">{parseFloat(p.fee_adjacent)}%</TableCell>
                <TableCell align="right">{parseFloat(p.fee_external)}%</TableCell>
                <TableCell align="right">R$ {parseFloat(p.surcharge_external).toFixed(2)}</TableCell>
                <TableCell align="right">{p.credit_cost_local}</TableCell>
                <TableCell align="right">{p.credit_cost_external}</TableCell>
                <TableCell align="center">
                  <Button size="small" startIcon={<Edit />} onClick={() => openEdit(p)}>Editar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={!!editProfile} onClose={() => setEditProfile(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Perfil: {editProfile?.name}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {EDITABLE_FIELDS.map(field => (
              <Grid item xs={6} key={field}>
                <TextField
                  label={FIELD_LABELS[field]}
                  type="number"
                  size="small"
                  fullWidth
                  value={formValues[field] ?? ''}
                  onChange={e => setFormValues({ ...formValues, [field]: e.target.value })}
                  InputProps={{ inputProps: { step: field.startsWith('fee') ? 1 : 0.5 } }}
                  helperText={editProfile ? `Atual: ${parseFloat(editProfile[field])}` : ''}
                />
              </Grid>
            ))}
          </Grid>

          {hasChanges() && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Alterações:</Typography>
              {EDITABLE_FIELDS.filter(f => parseFloat(formValues[f]) !== parseFloat(editProfile?.[f])).map(f => (
                <Chip key={f} size="small" sx={{ mr: 0.5, mb: 0.5 }}
                  label={`${FIELD_LABELS[f]}: ${parseFloat(editProfile?.[f])} → ${parseFloat(formValues[f])}`}
                />
              ))}
            </Box>
          )}

          <TextField label="Motivo da alteração" fullWidth multiline rows={2} sx={{ mt: 2 }}
            value={reason} onChange={e => setReason(e.target.value)}
            helperText="Mínimo 10 caracteres" error={reason.length > 0 && reason.length < 10}
          />
          <TextField label="Senha administrativa" type="password" fullWidth sx={{ mt: 2 }}
            value={password} onChange={e => setPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProfile(null)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={!hasChanges() || reason.trim().length < 10 || !password}>
            Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Perfil de Preço</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Button size="small" variant="outlined" sx={{ mt: 1, mb: 1 }} onClick={fillDefaults}>
            Usar Padrão Nacional
          </Button>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {CREATE_FIELDS.map(({ key, label, type }) => (
              <Grid item xs={6} key={key}>
                <TextField label={label} type={type || 'number'} size="small" fullWidth
                  value={createForm[key] ?? ''} onChange={e => setCreateForm({ ...createForm, [key]: e.target.value })}
                />
              </Grid>
            ))}
          </Grid>
          {geoMissing && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Sem latitude, longitude e raio, este perfil será criado, mas não será usado automaticamente nas corridas.
            </Alert>
          )}
          <TextField label="Motivo da criação" fullWidth multiline rows={2} sx={{ mt: 2 }}
            value={createReason} onChange={e => setCreateReason(e.target.value)}
            helperText="Mínimo 10 caracteres" error={createReason.length > 0 && createReason.length < 10}
          />
          <TextField label="Senha administrativa" type="password" fullWidth sx={{ mt: 2 }}
            value={createPassword} onChange={e => setCreatePassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}
            disabled={!createForm.slug || !createForm.name || createReason.trim().length < 10 || !createPassword}>
            Criar Perfil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
