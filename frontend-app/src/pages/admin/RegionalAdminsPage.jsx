import { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Switch, CircularProgress, Alert } from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

export default function RegionalAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', territory_id: '', access_level: 'full' });
  const token = localStorage.getItem('kaviar_admin_token');

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories/regional-admins/list`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setAdmins(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchTerritories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTerritories(data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAdmins(); fetchTerritories(); }, []);

  const handleCreate = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories/regional-admins`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { setCreateOpen(false); setForm({ name: '', email: '', password: '', territory_id: '', access_level: 'full' }); fetchAdmins(); }
      else setError(data.error || 'Erro ao criar');
    } catch (e) { setError('Erro de conexão'); }
    setSaving(false);
  };

  const handleToggle = async (adminId, currentActive) => {
    await fetch(`${API_BASE_URL}/api/admin/territories/regional-admins/${adminId}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !currentActive }),
    });
    fetchAdmins();
  };

  const handleUnlink = async (adminId, territoryId, territoryName) => {
    if (!confirm(`Remover acesso de "${territoryName}" deste admin?`)) return;
    await fetch(`${API_BASE_URL}/api/admin/territories/regional-admins/${adminId}/territories/${territoryId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchAdmins();
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress sx={{ color: '#B8942E' }} /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800 }}>👤 Operadores Territoriais</Typography>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setCreateOpen(true)} sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>Novo Operador Territorial</Button>
      </Box>

      <TableContainer component={Paper} sx={{ border: '1px solid #E8E5DE' }}>
        <Table>
          <TableHead><TableRow sx={{ bgcolor: '#FAFAF8' }}>
            <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell><TableCell>Territórios</TableCell><TableCell>Status</TableCell><TableCell>Ativo</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {admins.map((a) => (
              <TableRow key={a.id}>
                <TableCell sx={{ fontWeight: 600 }}>{a.name}</TableCell>
                <TableCell>{a.email}</TableCell>
                <TableCell><Chip label={a.role} size="small" /></TableCell>
                <TableCell>
                  {a.territory_access?.map((ta) => (
                    <Chip key={ta.territory.id} label={`${ta.territory.name} (${ta.territory.level})`} size="small" onDelete={() => handleUnlink(a.id, ta.territory.id, ta.territory.name)} sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell><Chip label={a.is_active ? 'Ativo' : 'Inativo'} size="small" color={a.is_active ? 'success' : 'default'} /></TableCell>
                <TableCell><Switch checked={a.is_active} onChange={() => handleToggle(a.id, a.is_active)} size="small" /></TableCell>
              </TableRow>
            ))}
            {!admins.length && <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', color: '#6B7280', py: 4 }}>Nenhum operador territorial cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setError(''); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#C8A84E', fontWeight: 700 }}>Novo Operador Territorial</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Alert severity="info" sx={{ mb: 1 }}>Este operador verá apenas dados do território vinculado. Role fixa: TERRITORIAL_OPERATOR (operador territorial com acesso limitado ao território vinculado).</Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth required />
          <TextField label="Senha temporária" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth required helperText="O operador deverá trocar no primeiro login" />
          <TextField label="Território" select value={form.territory_id} onChange={(e) => setForm({ ...form, territory_id: e.target.value })} fullWidth required>
            {territories.map((t) => <MenuItem key={t.id} value={t.id}>{t.name} ({t.level}{t.uf ? ` • ${t.uf}` : ''})</MenuItem>)}
          </TextField>
          <TextField label="Nível de Acesso" select value={form.access_level} onChange={(e) => setForm({ ...form, access_level: e.target.value })} fullWidth>
            <MenuItem value="full">Operador Territorial (leitura do território)</MenuItem>
            <MenuItem value="read_only">Operador Restrito (somente leitura)</MenuItem>
            <MenuItem disabled value="manager">Gestor Territorial — Em preparação</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); setError(''); }}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!form.name || !form.email || !form.password || !form.territory_id || saving} variant="contained" sx={{ bgcolor: '#B8942E' }}>{saving ? 'Criando...' : 'Criar Operador Territorial'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
