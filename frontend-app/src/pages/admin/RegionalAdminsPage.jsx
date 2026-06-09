import { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Switch, CircularProgress, Alert, IconButton, Tooltip, Checkbox, FormControlLabel, InputAdornment } from '@mui/material';
import { PersonAdd, LockReset, Visibility, VisibilityOff, ContentCopy } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

export default function RegionalAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', territory_id: '', access_level: 'full', role_type: 'operator' });
  const [snack, setSnack] = useState('');
  // Reset password state
  const [resetTarget, setResetTarget] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);
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
      if (data.success) { setCreateOpen(false); setForm({ name: '', email: '', password: '', territory_id: '', access_level: 'full', role_type: 'operator' }); fetchAdmins(); }
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
            <TableCell sx={{ fontWeight: 700 }}>Nome</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell><TableCell>Territórios</TableCell><TableCell>Status</TableCell><TableCell>Ativo</TableCell><TableCell>Ações</TableCell>
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
                <TableCell>{['TERRITORIAL_MANAGER', 'TERRITORIAL_OPERATOR'].includes(a.role) && <Tooltip title="Redefinir senha"><IconButton size="small" onClick={() => { setResetTarget(a); setError(''); }} sx={{ color: '#6B7280' }}><LockReset sx={{ fontSize: 18 }} /></IconButton></Tooltip>}</TableCell>
              </TableRow>
            ))}
            {!admins.length && <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: '#6B7280', py: 4 }}>Nenhum operador territorial cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setError(''); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#C8A84E', fontWeight: 700 }}>Novo Operador Territorial</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Alert severity="info" sx={{ mb: 1 }}>O operador/gestor verá apenas dados do território vinculado. Acesso limitado conforme tipo selecionado.</Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth required />
          <TextField label="Senha temporária" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} fullWidth required helperText="O operador deverá trocar no primeiro login" />
          <TextField label="Território" select value={form.territory_id} onChange={(e) => setForm({ ...form, territory_id: e.target.value })} fullWidth required>
            {territories.map((t) => <MenuItem key={t.id} value={t.id}>{t.name} ({t.level}{t.uf ? ` • ${t.uf}` : ''})</MenuItem>)}
          </TextField>
          <TextField label="Tipo" select value={form.role_type} onChange={(e) => setForm({ ...form, role_type: e.target.value })} fullWidth>
            <MenuItem value="operator">Operador Territorial Captador</MenuItem>
            <MenuItem value="manager">Gestor Territorial</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); setError(''); }}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!form.name || !form.email || !form.password || !form.territory_id || saving} variant="contained" sx={{ bgcolor: '#B8942E' }}>{saving ? 'Criando...' : 'Criar Operador Territorial'}</Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Confirmation */}
      <Dialog open={!!resetTarget && !resetResult} onClose={() => setResetTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Redefinir senha</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>Uma nova senha temporária será gerada. A pessoa deverá trocá-la no primeiro login.</Alert>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography sx={{ fontSize: 13 }}><strong>Nome:</strong> {resetTarget?.name}</Typography>
          <Typography sx={{ fontSize: 13 }}><strong>Email:</strong> {resetTarget?.email}</Typography>
          <Typography sx={{ fontSize: 13 }}><strong>Role:</strong> {resetTarget?.role}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetTarget(null)}>Cancelar</Button>
          <Button variant="contained" disabled={resetLoading} sx={{ bgcolor: '#B8942E' }} onClick={async () => {
            setResetLoading(true);
            try {
              const res = await fetch(`${API_BASE_URL}/api/admin/territories/regional-admins/${resetTarget.id}/reset-password`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
              const data = await res.json();
              if (data.success) { setResetResult(data.data); setResetConfirmed(false); setShowResetPw(false); setError(''); }
              else { setError(data.error || 'Erro ao redefinir senha.'); }
            } catch { setError('Erro de conexão.'); }
            finally { setResetLoading(false); }
          }}>{resetLoading ? 'Processando...' : 'Confirmar Redefinição'}</Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Result */}
      <Dialog open={!!resetResult} disableEscapeKeyDown onClose={(_, reason) => { if (reason === 'backdropClick' && !resetConfirmed) return; if (resetConfirmed) { setResetResult(null); setResetTarget(null); } }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#10B981' }}>✅ Senha redefinida</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>⚠️ Esta senha será exibida APENAS UMA VEZ. Envie com segurança pelo WhatsApp da pessoa.</Alert>
          <Box sx={{ bgcolor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontSize: 12, color: '#6B7280', mb: 0.5 }}>Conta: {resetResult?.name}</Typography>
            <Typography sx={{ fontSize: 12, color: '#6B7280', mb: 1 }}>Email: {resetResult?.email}</Typography>
            <Typography sx={{ fontSize: 12, color: '#6B7280', mb: 0.5 }}>Senha temporária:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 18, fontFamily: 'monospace' }}>{showResetPw ? resetResult?.temp_password : '••••••••••••••••'}</Typography>
              <IconButton size="small" onClick={() => setShowResetPw(!showResetPw)}>{showResetPw ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}</IconButton>
              <IconButton size="small" onClick={() => { try { navigator.clipboard.writeText(resetResult?.temp_password || ''); setSnack('Senha copiada!'); } catch { setSnack('Não foi possível copiar automaticamente. Exiba e copie manualmente.'); } }}><ContentCopy sx={{ fontSize: 16 }} /></IconButton>
            </Box>
          </Box>
          <Alert severity="info" sx={{ mt: 2, fontSize: 11 }}>No primeiro login, a troca de senha será obrigatória.</Alert>
          <FormControlLabel sx={{ mt: 2 }} control={<Checkbox checked={resetConfirmed} onChange={e => setResetConfirmed(e.target.checked)} />} label={<Typography sx={{ fontSize: 13 }}>Confirmo que copiei a senha em local seguro</Typography>} />
        </DialogContent>
        <DialogActions><Button variant="contained" disabled={!resetConfirmed} onClick={() => { setResetResult(null); setResetTarget(null); }} sx={{ bgcolor: '#B8942E' }}>Fechar</Button></DialogActions>
      </Dialog>

      {snack && <Alert severity="success" sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }} onClose={() => setSnack('')}>{snack}</Alert>}
    </Box>
  );
}
