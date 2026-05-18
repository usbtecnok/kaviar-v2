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

export default function PricingProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editProfile, setEditProfile] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Configuração de Preços</Typography>
      {error && !editProfile && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

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
    </Box>
  );
}
